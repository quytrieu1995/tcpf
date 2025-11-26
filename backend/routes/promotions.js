const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all promotions
router.get('/', authenticate, async (req, res) => {
  try {
    const { active_only } = req.query;
    let query = 'SELECT * FROM promotions WHERE 1=1';
    const params = [];

    if (active_only === 'true') {
      query += ' AND is_active = true AND start_date <= CURRENT_TIMESTAMP AND end_date >= CURRENT_TIMESTAMP';
    }

    query += ' ORDER BY created_at DESC';
    const result = await db.pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get promotions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single promotion
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM promotions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    // Get associated products
    const products = await db.pool.query(
      'SELECT p.* FROM products p JOIN product_promotions pp ON p.id = pp.product_id WHERE pp.promotion_id = $1',
      [req.params.id]
    );
    result.rows[0].products = products.rows;

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get promotion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create promotion
router.post('/', authenticate, [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['percentage', 'fixed', 'free_shipping']).withMessage('Invalid promotion type'),
  body('value').isFloat({ min: 0 }).withMessage('Value must be positive'),
  body('start_date').notEmpty().withMessage('Start date is required'),
  body('end_date').notEmpty().withMessage('End date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, type, value, min_purchase_amount, max_discount_amount, start_date, end_date, is_active, usage_limit, product_ids } = req.body;
    
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'INSERT INTO promotions (name, description, type, value, min_purchase_amount, max_discount_amount, start_date, end_date, is_active, usage_limit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [name, description, type, value, min_purchase_amount || 0, max_discount_amount, start_date, end_date, is_active !== false, usage_limit]
      );

      const promotion = result.rows[0];

      // Add products if specified
      if (product_ids && Array.isArray(product_ids) && product_ids.length > 0) {
        for (const productId of product_ids) {
          await client.query(
            'INSERT INTO product_promotions (product_id, promotion_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [productId, promotion.id]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(promotion);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create promotion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update promotion
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, type, value, min_purchase_amount, max_discount_amount, start_date, end_date, is_active, usage_limit, product_ids } = req.body;
    
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE promotions SET name = $1, description = $2, type = $3, value = $4, min_purchase_amount = $5, max_discount_amount = $6, start_date = $7, end_date = $8, is_active = $9, usage_limit = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *',
        [name, description, type, value, min_purchase_amount, max_discount_amount, start_date, end_date, is_active, usage_limit, req.params.id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Promotion not found' });
      }

      // Update products
      if (product_ids !== undefined) {
        await client.query('DELETE FROM product_promotions WHERE promotion_id = $1', [req.params.id]);
        if (Array.isArray(product_ids) && product_ids.length > 0) {
          for (const productId of product_ids) {
            await client.query(
              'INSERT INTO product_promotions (product_id, promotion_id) VALUES ($1, $2)',
              [productId, req.params.id]
            );
          }
        }
      }

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update promotion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete promotion
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('DELETE FROM promotions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Delete promotion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Calculate discount for order
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const { code, total_amount, product_ids } = req.body;
    
    // Find active promotion
    const promotion = await db.pool.query(
      `SELECT * FROM promotions 
       WHERE name = $1 
       AND is_active = true 
       AND start_date <= CURRENT_TIMESTAMP 
       AND end_date >= CURRENT_TIMESTAMP
       AND (usage_limit IS NULL OR used_count < usage_limit)`,
      [code]
    );

    if (promotion.rows.length === 0) {
      return res.json({ discount: 0, message: 'Promotion not found or expired' });
    }

    const promo = promotion.rows[0];

    // Check minimum purchase
    if (total_amount < promo.min_purchase_amount) {
      return res.json({ 
        discount: 0, 
        message: `Minimum purchase amount is ${promo.min_purchase_amount}` 
      });
    }

    let discount = 0;

    if (promo.type === 'percentage') {
      discount = (total_amount * promo.value) / 100;
      if (promo.max_discount_amount && discount > promo.max_discount_amount) {
        discount = promo.max_discount_amount;
      }
    } else if (promo.type === 'fixed') {
      discount = promo.value;
      if (discount > total_amount) {
        discount = total_amount;
      }
    } else if (promo.type === 'free_shipping') {
      discount = 0; // Shipping cost will be handled separately
    }

    res.json({ 
      discount: parseFloat(discount.toFixed(2)), 
      promotion: promo,
      message: 'Promotion applied successfully'
    });
  } catch (error) {
    console.error('Calculate promotion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

