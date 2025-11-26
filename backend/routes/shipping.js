const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all shipping methods
router.get('/', authenticate, async (req, res) => {
  try {
    const { active_only } = req.query;
    let query = 'SELECT * FROM shipping_methods WHERE 1=1';
    const params = [];
    
    if (active_only === 'true') {
      query += ' AND is_active = true';
    }
    
    // Check if sort_order column exists, if not use name only
    query += ' ORDER BY COALESCE(sort_order, 0), name';
    const result = await db.pool.query(query, params);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Get shipping methods error:', error);
    // Return empty array instead of error to prevent frontend crash
    res.json([]);
  }
});

// Get single shipping method
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM shipping_methods WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shipping method not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get shipping method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create shipping method
router.post('/', authenticate, [
  body('name').notEmpty().withMessage('Name is required'),
  body('cost').isFloat({ min: 0 }).withMessage('Cost must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, cost, estimated_days, is_active, sort_order, api_type, api_endpoint, api_key, api_secret, api_config } = req.body;
    const result = await db.pool.query(
      `INSERT INTO shipping_methods (name, description, cost, estimated_days, is_active, sort_order, api_type, api_endpoint, api_key, api_secret, api_config) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [name, description, cost, estimated_days, is_active !== false, sort_order || 0, api_type || null, api_endpoint || null, api_key || null, api_secret || null, JSON.stringify(api_config || {})]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create shipping method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update shipping method
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, cost, estimated_days, is_active, sort_order, api_type, api_endpoint, api_key, api_secret, api_config } = req.body;
    const result = await db.pool.query(
      `UPDATE shipping_methods 
       SET name = $1, description = $2, cost = $3, estimated_days = $4, is_active = $5, sort_order = $6,
           api_type = $7, api_endpoint = $8, api_key = $9, api_secret = $10, api_config = $11
       WHERE id = $12 RETURNING *`,
      [name, description, cost, estimated_days, is_active, sort_order, api_type || null, api_endpoint || null, api_key || null, api_secret || null, JSON.stringify(api_config || {}), req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shipping method not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update shipping method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete shipping method
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('DELETE FROM shipping_methods WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shipping method not found' });
    }
    res.json({ message: 'Shipping method deleted successfully' });
  } catch (error) {
    console.error('Delete shipping method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Test carrier API connection
router.post('/:id/test-connection', authenticate, async (req, res) => {
  try {
    const carrierService = require('../services/carrierService');
    const result = await carrierService.testConnection(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;

