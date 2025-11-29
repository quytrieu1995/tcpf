const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all products
router.get('/', authenticate, async (req, res) => {
  try {
    // Check database connection
    if (!db.pool) {
      console.error('Database pool not initialized');
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    const { search, category, page = 1, limit = 10 } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      query += ` AND (category = $${paramCount} OR category_id = $${paramCount})`;
      params.push(category);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.pool.query(query, params);
    const countResult = await db.pool.query('SELECT COUNT(*) FROM products');
    
    res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get products error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    
    // Return appropriate status code
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ message: 'Database connection failed' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single product
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create product
router.post('/', authenticate, [
  body('name').notEmpty().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, stock, category, category_id, image_url, sku, barcode, cost_price, weight, supplier_id, low_stock_threshold } = req.body;
    
    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    // Check database connection
    if (!db.pool) {
      console.error('Database pool not initialized');
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    const result = await db.pool.query(
      'INSERT INTO products (name, description, price, stock, category, category_id, image_url, sku, barcode, cost_price, weight, supplier_id, low_stock_threshold) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [name, description || null, parseFloat(price), parseInt(stock) || 0, category || null, category_id || null, image_url || null, sku || null, barcode || null, cost_price ? parseFloat(cost_price) : null, weight ? parseFloat(weight) : null, supplier_id || null, low_stock_threshold || 10]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create product error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    
    // Return more specific error messages
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'SKU or barcode already exists' });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ message: 'Invalid category or supplier ID' });
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ message: 'Database connection failed' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update product
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, price, stock, category, category_id, image_url, sku, barcode, cost_price, weight, supplier_id, low_stock_threshold, is_active } = req.body;
    
    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    // Check database connection
    if (!db.pool) {
      console.error('Database pool not initialized');
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    const result = await db.pool.query(
      'UPDATE products SET name = $1, description = $2, price = $3, stock = $4, category = $5, category_id = $6, image_url = $7, sku = $8, barcode = $9, cost_price = $10, weight = $11, supplier_id = $12, low_stock_threshold = $13, is_active = $14, updated_at = CURRENT_TIMESTAMP WHERE id = $15 RETURNING *',
      [name, description || null, parseFloat(price), parseInt(stock) || 0, category || null, category_id || null, image_url || null, sku || null, barcode || null, cost_price ? parseFloat(cost_price) : null, weight ? parseFloat(weight) : null, supplier_id || null, low_stock_threshold || 10, is_active !== false, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update product error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    
    // Return more specific error messages
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'SKU or barcode already exists' });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ message: 'Invalid category or supplier ID' });
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ message: 'Database connection failed' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete product
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

