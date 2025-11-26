const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get price policies
router.get('/', authenticate, async (req, res) => {
  try {
    const { customer_group_id, product_id } = req.query;
    let query = `
      SELECT pp.*, 
             cg.name as customer_group_name,
             p.name as product_name, p.sku
      FROM price_policies pp
      LEFT JOIN customer_groups cg ON pp.customer_group_id = cg.id
      LEFT JOIN products p ON pp.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (customer_group_id) {
      paramCount++;
      query += ` AND pp.customer_group_id = $${paramCount}`;
      params.push(customer_group_id);
    }

    if (product_id) {
      paramCount++;
      query += ` AND pp.product_id = $${paramCount}`;
      params.push(product_id);
    }

    query += ' AND pp.is_active = true ORDER BY pp.created_at DESC';
    const result = await db.pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get price policies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get price for customer and product
router.get('/price', authenticate, async (req, res) => {
  try {
    const { customer_id, product_id, quantity = 1 } = req.query;

    if (!customer_id || !product_id) {
      return res.status(400).json({ message: 'Customer ID and Product ID are required' });
    }

    // Get customer group
    const customer = await db.pool.query(
      'SELECT group_id FROM customers WHERE id = $1',
      [customer_id]
    );

    if (customer.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const groupId = customer.rows[0].group_id;
    let price = null;

    // Get product base price
    const product = await db.pool.query('SELECT price FROM products WHERE id = $1', [product_id]);
    if (product.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    price = parseFloat(product.rows[0].price);

    // Check for price policy
    if (groupId) {
      const policy = await db.pool.query(
        `SELECT * FROM price_policies 
         WHERE customer_group_id = $1 
         AND product_id = $2 
         AND min_quantity <= $3
         AND is_active = true
         AND (start_date IS NULL OR start_date <= CURRENT_DATE)
         AND (end_date IS NULL OR end_date >= CURRENT_DATE)
         ORDER BY min_quantity DESC
         LIMIT 1`,
        [groupId, product_id, parseInt(quantity)]
      );

      if (policy.rows.length > 0) {
        price = parseFloat(policy.rows[0].price);
      } else {
        // Check for group discount
        const group = await db.pool.query(
          'SELECT discount_percentage FROM customer_groups WHERE id = $1',
          [groupId]
        );
        if (group.rows.length > 0 && group.rows[0].discount_percentage > 0) {
          price = price * (1 - group.rows[0].discount_percentage / 100);
        }
      }
    }

    res.json({ price: parseFloat(price.toFixed(2)) });
  } catch (error) {
    console.error('Get price error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create price policy
router.post('/', authenticate, [
  body('name').notEmpty().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, customer_group_id, product_id, price, min_quantity, start_date, end_date, is_active } = req.body;
    const result = await db.pool.query(
      'INSERT INTO price_policies (name, customer_group_id, product_id, price, min_quantity, start_date, end_date, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, customer_group_id, product_id, price, min_quantity || 1, start_date, end_date, is_active !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create price policy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update price policy
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, customer_group_id, product_id, price, min_quantity, start_date, end_date, is_active } = req.body;
    const result = await db.pool.query(
      'UPDATE price_policies SET name = $1, customer_group_id = $2, product_id = $3, price = $4, min_quantity = $5, start_date = $6, end_date = $7, is_active = $8 WHERE id = $9 RETURNING *',
      [name, customer_group_id, product_id, price, min_quantity, start_date, end_date, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Price policy not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update price policy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete price policy
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('DELETE FROM price_policies WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Price policy not found' });
    }
    res.json({ message: 'Price policy deleted successfully' });
  } catch (error) {
    console.error('Delete price policy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

