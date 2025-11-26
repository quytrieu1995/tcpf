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

