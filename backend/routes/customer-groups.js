const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all customer groups
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT cg.*, COUNT(c.id) as customer_count
      FROM customer_groups cg
      LEFT JOIN customers c ON cg.id = c.group_id
      WHERE cg.is_active = true
      GROUP BY cg.id
      ORDER BY cg.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get customer groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single customer group
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM customer_groups WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer group not found' });
    }

    // Get customers in this group
    const customers = await db.pool.query(
      'SELECT id, name, email, phone, total_purchases FROM customers WHERE group_id = $1',
      [req.params.id]
    );
    result.rows[0].customers = customers.rows;

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get customer group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create customer group
router.post('/', authenticate, [
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, discount_percentage, is_active } = req.body;
    const result = await db.pool.query(
      'INSERT INTO customer_groups (name, description, discount_percentage, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, discount_percentage || 0, is_active !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create customer group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update customer group
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, discount_percentage, is_active } = req.body;
    const result = await db.pool.query(
      'UPDATE customer_groups SET name = $1, description = $2, discount_percentage = $3, is_active = $4 WHERE id = $5 RETURNING *',
      [name, description, discount_percentage, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer group not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update customer group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete customer group
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Check if group has customers
    const customersCheck = await db.pool.query('SELECT COUNT(*) FROM customers WHERE group_id = $1', [req.params.id]);
    if (parseInt(customersCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cannot delete group with customers. Please reassign customers first.' });
    }

    const result = await db.pool.query('DELETE FROM customer_groups WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer group not found' });
    }
    res.json({ message: 'Customer group deleted successfully' });
  } catch (error) {
    console.error('Delete customer group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

