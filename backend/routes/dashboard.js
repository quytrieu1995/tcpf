const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - parseInt(period));

    // Total revenue
    const revenueResult = await db.pool.query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = $1 AND created_at >= $2',
      ['completed', periodDate]
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total);

    // Total orders
    const ordersResult = await db.pool.query(
      'SELECT COUNT(*) as total FROM orders WHERE created_at >= $1',
      [periodDate]
    );
    const totalOrders = parseInt(ordersResult.rows[0].total);

    // Total customers
    const customersResult = await db.pool.query(
      'SELECT COUNT(*) as total FROM customers WHERE created_at >= $1',
      [periodDate]
    );
    const totalCustomers = parseInt(customersResult.rows[0].total);

    // Total products
    const productsResult = await db.pool.query('SELECT COUNT(*) as total FROM products');
    const totalProducts = parseInt(productsResult.rows[0].total);

    // Low stock products
    const lowStockResult = await db.pool.query(
      'SELECT COUNT(*) as total FROM products WHERE stock < 10'
    );
    const lowStockProducts = parseInt(lowStockResult.rows[0].total);

    // Revenue by day
    const revenueByDay = await db.pool.query(`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE status = 'completed' AND created_at >= $1
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [periodDate]);

    // Orders by status
    const ordersByStatus = await db.pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE created_at >= $1
      GROUP BY status
    `, [periodDate]);

    // Top products
    const topProducts = await db.pool.query(`
      SELECT 
        p.id,
        p.name,
        p.price,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= $1 AND o.status = 'completed'
      GROUP BY p.id, p.name, p.price
      ORDER BY total_sold DESC
      LIMIT 10
    `, [periodDate]);

    // Recent orders
    const recentOrders = await db.pool.query(`
      SELECT o.*, c.name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Revenue comparison (current vs previous period)
    const previousPeriodDate = new Date(periodDate);
    previousPeriodDate.setDate(previousPeriodDate.getDate() - parseInt(period));
    const previousRevenueResult = await db.pool.query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = $1 AND created_at >= $2 AND created_at < $3',
      ['completed', previousPeriodDate, periodDate]
    );
    const previousRevenue = parseFloat(previousRevenueResult.rows[0].total);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) : 0;

    // Orders comparison
    const previousOrdersResult = await db.pool.query(
      'SELECT COUNT(*) as total FROM orders WHERE created_at >= $1 AND created_at < $2',
      [previousPeriodDate, periodDate]
    );
    const previousOrders = parseInt(previousOrdersResult.rows[0].total);
    const ordersGrowth = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders * 100).toFixed(1) : 0;

    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const revenueByMonth = await db.pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as order_count
      FROM orders
      WHERE status = 'completed' AND created_at >= $1
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `, [sixMonthsAgo]);

    // Payment methods distribution
    const paymentMethods = await db.pool.query(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM orders
      WHERE created_at >= $1 AND status = 'completed'
      GROUP BY payment_method
    `, [periodDate]);

    // Delivery status distribution
    const deliveryStatus = await db.pool.query(`
      SELECT 
        COALESCE(delivery_status, 'pending') as status,
        COUNT(*) as count
      FROM orders
      WHERE created_at >= $1
      GROUP BY delivery_status
    `, [periodDate]);

    // Top customers by revenue
    const topCustomers = await db.pool.query(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.total_amount) as total_revenue,
        SUM(o.customer_paid) as total_paid
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      WHERE o.created_at >= $1 AND o.status = 'completed'
      GROUP BY c.id, c.name, c.email, c.phone
      ORDER BY total_revenue DESC
      LIMIT 10
    `, [periodDate]);

    // Average order value
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    // COD statistics
    const codStats = await db.pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(cod_amount) as total_cod,
        SUM(customer_paid) as total_paid,
        AVG(cod_amount) as avg_cod
      FROM orders
      WHERE created_at >= $1 AND cod_amount > 0
    `, [periodDate]);

    // Sales channel distribution
    const salesChannels = await db.pool.query(`
      SELECT 
        COALESCE(sales_channel, 'N/A') as channel,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM orders
      WHERE created_at >= $1 AND status = 'completed'
      GROUP BY sales_channel
    `, [periodDate]);

    // Return statistics
    const returnStats = await db.pool.query(`
      SELECT 
        COUNT(*) as return_count,
        SUM(return_fee) as total_return_fee
      FROM orders
      WHERE created_at >= $1 AND return_code IS NOT NULL
    `, [periodDate]);

    res.json({
      overview: {
        totalRevenue,
        totalOrders,
        totalCustomers,
        totalProducts,
        lowStockProducts,
        avgOrderValue,
        revenueGrowth: parseFloat(revenueGrowth),
        ordersGrowth: parseFloat(ordersGrowth)
      },
      revenueByDay: revenueByDay.rows,
      revenueByMonth: revenueByMonth.rows,
      ordersByStatus: ordersByStatus.rows,
      deliveryStatus: deliveryStatus.rows,
      paymentMethods: paymentMethods.rows,
      salesChannels: salesChannels.rows,
      topProducts: topProducts.rows,
      topCustomers: topCustomers.rows,
      recentOrders: recentOrders.rows,
      codStats: codStats.rows[0] || { total_orders: 0, total_cod: 0, total_paid: 0, avg_cod: 0 },
      returnStats: returnStats.rows[0] || { return_count: 0, total_return_fee: 0 }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

