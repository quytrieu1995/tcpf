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

    res.json({
      overview: {
        totalRevenue,
        totalOrders,
        totalCustomers,
        totalProducts,
        lowStockProducts
      },
      revenueByDay: revenueByDay.rows,
      ordersByStatus: ordersByStatus.rows,
      topProducts: topProducts.rows,
      recentOrders: recentOrders.rows
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

