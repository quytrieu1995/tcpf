const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all suppliers
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, active_only } = req.query;
    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (active_only === 'true') {
      query += ' AND is_active = true';
    }

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR contact_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name';
    const result = await db.pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single supplier
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Get products from this supplier
    const products = await db.pool.query(
      'SELECT id, name, sku, stock FROM products WHERE supplier_id = $1',
      [req.params.id]
    );
    result.rows[0].products = products.rows;

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create supplier
router.post('/', authenticate, [
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, contact_name, email, phone, address, tax_code, bank_account, notes, is_active } = req.body;
    const result = await db.pool.query(
      'INSERT INTO suppliers (name, contact_name, email, phone, address, tax_code, bank_account, notes, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, contact_name, email, phone, address, tax_code, bank_account, notes, is_active !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update supplier
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, contact_name, email, phone, address, tax_code, bank_account, notes, is_active } = req.body;
    const result = await db.pool.query(
      'UPDATE suppliers SET name = $1, contact_name = $2, email = $3, phone = $4, address = $5, tax_code = $6, bank_account = $7, notes = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *',
      [name, contact_name, email, phone, address, tax_code, bank_account, notes, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete supplier
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('DELETE FROM suppliers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

