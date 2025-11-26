const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all categories (tree structure)
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT * FROM categories 
      WHERE is_active = true 
      ORDER BY sort_order, name
    `);
    
    // Build tree structure
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => (item.parent_id === null && parentId === null) || item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }));
    };
    
    res.json(buildTree(result.rows));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single category
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create category
router.post('/', authenticate, [
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, parent_id, image_url, sort_order, is_active } = req.body;
    const result = await db.pool.query(
      'INSERT INTO categories (name, description, parent_id, image_url, sort_order, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, parent_id || null, image_url, sort_order || 0, is_active !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update category
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, parent_id, image_url, sort_order, is_active } = req.body;
    const result = await db.pool.query(
      'UPDATE categories SET name = $1, description = $2, parent_id = $3, image_url = $4, sort_order = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [name, description, parent_id || null, image_url, sort_order, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete category
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Check if category has products
    const productsCheck = await db.pool.query('SELECT COUNT(*) FROM products WHERE category_id = $1', [req.params.id]);
    if (parseInt(productsCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cannot delete category with products' });
    }

    // Check if category has children
    const childrenCheck = await db.pool.query('SELECT COUNT(*) FROM categories WHERE parent_id = $1', [req.params.id]);
    if (parseInt(childrenCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cannot delete category with subcategories' });
    }

    const result = await db.pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

