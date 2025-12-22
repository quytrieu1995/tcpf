const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Sales report
router.get('/sales', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;
    const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = end_date || new Date().toISOString().split('T')[0];

    let dateFormat = "DATE(created_at)";
    if (group_by === 'month') {
      dateFormat = "DATE_TRUNC('month', created_at)";
    } else if (group_by === 'week') {
      dateFormat = "DATE_TRUNC('week', created_at)";
    }

    const sales = await db.pool.query(`
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders
      WHERE status = 'completed'
      AND created_at >= $1::date
      AND created_at <= $2::date
      GROUP BY ${dateFormat}
      ORDER BY period ASC
    `, [start, end]);

    // Top products
    const topProducts = await db.pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
      AND o.created_at >= $1::date
      AND o.created_at <= $2::date
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_sold DESC
      LIMIT 10
    `, [start, end]);

    // Top customers
    const topCustomers = await db.pool.query(`
      SELECT 
        c.id,
        c.name,
        c.email,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      WHERE o.status = 'completed'
      AND o.created_at >= $1::date
      AND o.created_at <= $2::date
      GROUP BY c.id, c.name, c.email
      ORDER BY total_spent DESC
      LIMIT 10
    `, [start, end]);

    res.json({
      period: { start, end, group_by },
      sales: sales.rows,
      top_products: topProducts.rows,
      top_customers: topCustomers.rows
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Revenue report
router.get('/revenue', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = end_date || new Date().toISOString().split('T')[0];

    const revenue = await db.pool.query(`
      SELECT 
        SUM(total_amount) as total_revenue,
        SUM(shipping_cost) as total_shipping,
        SUM(discount_amount) as total_discounts,
        COUNT(*) as total_orders,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE status = 'completed'
      AND created_at >= $1::date
      AND created_at <= $2::date
    `, [start, end]);

    // Revenue by payment method
    const byPayment = await db.pool.query(`
      SELECT 
        payment_method,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue
      FROM orders
      WHERE status = 'completed'
      AND created_at >= $1::date
      AND created_at <= $2::date
      GROUP BY payment_method
      ORDER BY revenue DESC
    `, [start, end]);

    res.json({
      period: { start, end },
      summary: revenue.rows[0],
      by_payment_method: byPayment.rows
    });
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Efficiency report
router.get('/efficiency', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = end_date || new Date().toISOString().split('T')[0];

    // Total orders and completion rate
    const ordersStats = await db.pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders
      FROM orders
      WHERE created_at >= $1::date
      AND created_at <= $2::date
    `, [start, end]);

    const stats = ordersStats.rows[0];
    const completionRate = stats.total_orders > 0 
      ? ((parseInt(stats.completed_orders) / parseInt(stats.total_orders)) * 100).toFixed(1)
      : 0;

    // Average processing time (time from created to completed)
    const processingTime = await db.pool.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours
      FROM orders
      WHERE status = 'completed'
      AND created_at >= $1::date
      AND created_at <= $2::date
      AND updated_at > created_at
    `, [start, end]);

    const avgProcessingHours = processingTime.rows[0].avg_hours 
      ? parseFloat(processingTime.rows[0].avg_hours).toFixed(1)
      : 0;

    // Efficiency by day
    const efficiencyByDay = await db.pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_processing_hours
      FROM orders
      WHERE created_at >= $1::date
      AND created_at <= $2::date
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [start, end]);

    // Orders by status
    const ordersByStatus = await db.pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders WHERE created_at >= $1::date AND created_at <= $2::date), 1) as percentage
      FROM orders
      WHERE created_at >= $1::date
      AND created_at <= $2::date
      GROUP BY status
      ORDER BY count DESC
    `, [start, end]);

    // Previous period comparison
    const periodDays = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - periodDays);
    const previousEnd = new Date(start);

    const previousOrdersStats = await db.pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
      FROM orders
      WHERE created_at >= $1::date
      AND created_at < $2::date
    `, [previousStart.toISOString().split('T')[0], previousEnd.toISOString().split('T')[0]]);

    const prevStats = previousOrdersStats.rows[0];
    const prevCompletionRate = prevStats.total_orders > 0 
      ? ((parseInt(prevStats.completed_orders) / parseInt(prevStats.total_orders)) * 100).toFixed(1)
      : 0;
    
    const completionRateGrowth = prevCompletionRate > 0 
      ? ((parseFloat(completionRate) - parseFloat(prevCompletionRate)) / parseFloat(prevCompletionRate) * 100).toFixed(1)
      : 0;

    // Employee performance (if seller_id exists)
    const employeePerformance = await db.pool.query(`
      SELECT 
        u.id,
        u.username,
        u.full_name,
        COUNT(o.id) as total_orders,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
        ROUND(COUNT(CASE WHEN o.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(o.id), 0), 1) as completion_rate,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) as total_revenue
      FROM orders o
      LEFT JOIN users u ON o.seller_id = u.id
      WHERE o.created_at >= $1::date
      AND o.created_at <= $2::date
      AND o.seller_id IS NOT NULL
      GROUP BY u.id, u.username, u.full_name
      ORDER BY total_orders DESC
      LIMIT 10
    `, [start, end]);

    // Conversion rate (orders per customer)
    const conversionStats = await db.pool.query(`
      SELECT 
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(*) as total_orders,
        ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT customer_id), 0), 2) as orders_per_customer
      FROM orders
      WHERE created_at >= $1::date
      AND created_at <= $2::date
      AND customer_id IS NOT NULL
    `, [start, end]);

    res.json({
      period: { start, end },
      metrics: {
        completion_rate: parseFloat(completionRate),
        completion_rate_growth: parseFloat(completionRateGrowth),
        avg_processing_hours: parseFloat(avgProcessingHours),
        total_orders: parseInt(stats.total_orders),
        completed_orders: parseInt(stats.completed_orders),
        cancelled_orders: parseInt(stats.cancelled_orders),
        pending_orders: parseInt(stats.pending_orders),
        processing_orders: parseInt(stats.processing_orders),
        orders_per_customer: parseFloat(conversionStats.rows[0].orders_per_customer || 0),
        unique_customers: parseInt(conversionStats.rows[0].unique_customers || 0)
      },
      efficiency_by_day: efficiencyByDay.rows.map(row => ({
        date: row.date,
        total_orders: parseInt(row.total_orders),
        completed_orders: parseInt(row.completed_orders),
        completion_rate: row.total_orders > 0 
          ? ((parseInt(row.completed_orders) / parseInt(row.total_orders)) * 100).toFixed(1)
          : 0,
        avg_processing_hours: row.avg_processing_hours ? parseFloat(row.avg_processing_hours).toFixed(1) : 0
      })),
      orders_by_status: ordersByStatus.rows,
      employee_performance: employeePerformance.rows.map(row => ({
        id: row.id,
        username: row.username,
        full_name: row.full_name,
        total_orders: parseInt(row.total_orders),
        completed_orders: parseInt(row.completed_orders),
        completion_rate: parseFloat(row.completion_rate || 0),
        total_revenue: parseFloat(row.total_revenue || 0)
      }))
    });
  } catch (error) {
    console.error('Get efficiency report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Product performance report
router.get('/products', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = end_date || new Date().toISOString().split('T')[0];

    const products = await db.pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.category,
        p.price,
        p.stock,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.subtotal), 0) as revenue,
        COALESCE(AVG(oi.quantity), 0) as avg_quantity_per_order
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed' 
        AND o.created_at >= $1::date AND o.created_at <= $2::date
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.sku, p.category, p.price, p.stock
      ORDER BY revenue DESC
    `, [start, end]);

    res.json(products.rows);
  } catch (error) {
    console.error('Get product performance report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export data (CSV format)
router.get('/export', authenticate, async (req, res) => {
  try {
    const { type, start_date, end_date } = req.query;
    const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = end_date || new Date().toISOString().split('T')[0];

    let query, filename;
    
    if (type === 'orders') {
      query = `
        SELECT 
          o.order_number,
          o.created_at,
          c.name as customer_name,
          o.total_amount,
          o.status,
          o.payment_method
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.created_at >= $1::date AND o.created_at <= $2::date
        ORDER BY o.created_at DESC
      `;
      filename = `orders_${start}_${end}.csv`;
    } else if (type === 'products') {
      query = `
        SELECT name, sku, category, price, stock, created_at
        FROM products
        WHERE is_active = true
        ORDER BY name
      `;
      filename = `products_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      return res.status(400).json({ message: 'Invalid export type' });
    }

    const result = await db.pool.query(query, type === 'orders' ? [start, end] : []);

    // Convert to CSV
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No data to export' });
    }

    const headers = Object.keys(result.rows[0]);
    const csv = [
      headers.join(','),
      ...result.rows.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\ufeff' + csv); // BOM for Excel UTF-8 support
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

