const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get inventory transactions
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { product_id, type, page = 1, limit = 50 } = req.query;
    let query = `
      SELECT it.*, p.name as product_name, u.username as created_by_name
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      LEFT JOIN users u ON it.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (product_id) {
      paramCount++;
      query += ` AND it.product_id = $${paramCount}`;
      params.push(product_id);
    }

    if (type) {
      paramCount++;
      query += ` AND it.type = $${paramCount}`;
      params.push(type);
    }

    query += ` ORDER BY it.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get inventory transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create inventory transaction (adjust stock)
router.post('/adjust', authenticate, [
  body('product_id').isInt().withMessage('Product ID is required'),
  body('type').isIn(['in', 'out', 'adjustment', 'return']).withMessage('Invalid transaction type'),
  body('quantity').isInt().withMessage('Quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { product_id, type, quantity, reference_type, reference_id, notes } = req.body;
    const user = req.user;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current stock
      const product = await client.query('SELECT stock FROM products WHERE id = $1', [product_id]);
      if (product.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Product not found' });
      }

      const currentStock = product.rows[0].stock;
      let newStock = currentStock;

      // Calculate new stock
      if (type === 'in' || type === 'return') {
        newStock = currentStock + Math.abs(quantity);
      } else if (type === 'out') {
        newStock = currentStock - Math.abs(quantity);
        if (newStock < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Insufficient stock' });
        }
      } else if (type === 'adjustment') {
        newStock = quantity; // Direct adjustment
      }

      // Update product stock
      await client.query('UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newStock, product_id]);

      // Create transaction record
      const transaction = await client.query(
        'INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [product_id, type, quantity, reference_type, reference_id, notes, user.id]
      );

      await client.query('COMMIT');
      res.status(201).json({
        ...transaction.rows[0],
        previous_stock: currentStock,
        new_stock: newStock
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Adjust inventory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get low stock products
router.get('/low-stock', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT id, name, sku, stock, low_stock_threshold, 
             (low_stock_threshold - stock) as shortage
      FROM products 
      WHERE stock <= low_stock_threshold 
      AND is_active = true
      ORDER BY (low_stock_threshold - stock) DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get stock summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const summary = await db.pool.query(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock) as total_stock,
        SUM(CASE WHEN stock <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(stock * cost_price) as total_inventory_value
      FROM products
      WHERE is_active = true
    `);

    const topProducts = await db.pool.query(`
      SELECT id, name, sku, stock, cost_price, (stock * cost_price) as value
      FROM products
      WHERE is_active = true
      ORDER BY (stock * cost_price) DESC
      LIMIT 10
    `);

    res.json({
      summary: summary.rows[0],
      top_products: topProducts.rows
    });
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

