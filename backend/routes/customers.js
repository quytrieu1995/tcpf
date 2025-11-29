const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all customers
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    let query = `
      SELECT c.*, cg.name as group_name, cg.discount_percentage as group_discount
      FROM customers c
      LEFT JOIN customer_groups cg ON c.group_id = cg.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.pool.query(query, params);
    const countResult = await db.pool.query('SELECT COUNT(*) FROM customers');
    
    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single customer
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer orders
router.get('/:id/orders', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create customer
router.post('/', authenticate, [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check database connection
    if (!db.pool) {
      console.error('Database pool not initialized');
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    const { name, email, phone, address, group_id, credit_limit, tags } = req.body;
    
    // Check if customer with same email or phone already exists (if provided)
    if (email || phone) {
      let checkQuery = 'SELECT id FROM customers WHERE ';
      const checkParams = [];
      const conditions = [];
      
      if (email) {
        checkParams.push(email);
        conditions.push(`email = $${checkParams.length}`);
      }
      if (phone) {
        checkParams.push(phone);
        conditions.push(`phone = $${checkParams.length}`);
      }
      
      if (conditions.length > 0) {
        checkQuery += conditions.join(' OR ');
        const existing = await db.pool.query(checkQuery, checkParams);
        if (existing.rows.length > 0) {
          return res.status(400).json({ 
            message: 'Khách hàng với email hoặc số điện thoại này đã tồn tại' 
          });
        }
      }
    }

    const result = await db.pool.query(
      'INSERT INTO customers (name, email, phone, address, group_id, credit_limit, tags) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        name.trim(), 
        email?.trim() || null, 
        phone?.trim() || null, 
        address?.trim() || null, 
        group_id || null, 
        credit_limit || 0, 
        tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : []
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create customer error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'Email hoặc số điện thoại đã tồn tại' });
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

// Update customer
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, email, phone, address, group_id, credit_limit, tags } = req.body;
    const result = await db.pool.query(
      'UPDATE customers SET name = $1, email = $2, phone = $3, address = $4, group_id = $5, credit_limit = $6, tags = $7 WHERE id = $8 RETURNING *',
      [name, email, phone, address, group_id, credit_limit, tags, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete customer
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

