const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, start_date, end_date } = req.query;
    let query = `
      SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    if (start_date) {
      paramCount++;
      query += ` AND DATE(o.created_at) >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND DATE(o.created_at) <= $${paramCount}`;
      params.push(end_date);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.pool.query(query, params);
    
    // Get order items for each order
    for (let order of result.rows) {
      const items = await db.pool.query(
        `SELECT oi.*, p.name as product_name 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = items.rows;
    }

    // Count total with same filters
    let countQuery = 'SELECT COUNT(*) FROM orders o WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND o.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (start_date) {
      countParamCount++;
      countQuery += ` AND DATE(o.created_at) >= $${countParamCount}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countParamCount++;
      countQuery += ` AND DATE(o.created_at) <= $${countParamCount}`;
      countParams.push(end_date);
    }

    const countResult = await db.pool.query(countQuery, countParams);
    
    res.json({
      orders: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
  try {
    const orderResult = await db.pool.query(
      `SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1`,
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderResult.rows[0];
    const items = await db.pool.query(
      `SELECT oi.*, p.name as product_name, p.image_url as product_image
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [req.params.id]
    );
    order.items = items.rows;

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create order
router.post('/', authenticate, [
  body('customer_id').optional().isInt(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').isInt().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, items, payment_method, notes, shipping_method_id, shipping_address, shipping_phone, promotion_code } = req.body;
    const user = req.user;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Calculate total
      let totalAmount = 0;
      for (const item of items) {
        const product = await client.query('SELECT price, stock FROM products WHERE id = $1', [item.product_id]);
        if (product.rows.length === 0) {
          throw new Error(`Product ${item.product_id} not found`);
        }
        if (product.rows[0].stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.product_id}`);
        }
        totalAmount += parseFloat(product.rows[0].price) * item.quantity;
      }

      // Get shipping cost
      let shippingCost = 0;
      if (shipping_method_id) {
        const shipping = await client.query('SELECT cost FROM shipping_methods WHERE id = $1', [shipping_method_id]);
        if (shipping.rows.length > 0) {
          shippingCost = parseFloat(shipping.rows[0].cost);
        }
      }

      // Apply promotion if provided
      let discountAmount = 0;
      let promotionId = null;
      if (promotion_code) {
        const promotion = await client.query(
          `SELECT * FROM promotions 
           WHERE name = $1 
           AND is_active = true 
           AND start_date <= CURRENT_TIMESTAMP 
           AND end_date >= CURRENT_TIMESTAMP
           AND (usage_limit IS NULL OR used_count < usage_limit)`,
          [promotion_code]
        );
        
        if (promotion.rows.length > 0) {
          const promo = promotion.rows[0];
          if (totalAmount >= promo.min_purchase_amount) {
            promotionId = promo.id;
            if (promo.type === 'percentage') {
              discountAmount = (totalAmount * promo.value) / 100;
              if (promo.max_discount_amount && discountAmount > promo.max_discount_amount) {
                discountAmount = promo.max_discount_amount;
              }
            } else if (promo.type === 'fixed') {
              discountAmount = promo.value;
              if (discountAmount > totalAmount) {
                discountAmount = totalAmount;
              }
            }
            // Update promotion used count
            await client.query('UPDATE promotions SET used_count = used_count + 1 WHERE id = $1', [promo.id]);
          }
        }
      }

      const finalAmount = totalAmount + shippingCost - discountAmount;

      // Create order
      const orderResult = await client.query(
        'INSERT INTO orders (customer_id, order_number, total_amount, shipping_method_id, shipping_cost, discount_amount, promotion_id, payment_method, shipping_address, shipping_phone, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
        [customer_id || null, orderNumber, finalAmount, shipping_method_id, shippingCost, discountAmount, promotionId, payment_method, shipping_address, shipping_phone, notes, 'pending']
      );

      const order = orderResult.rows[0];

      // If payment is credit, create debt transaction
      if (payment_method === 'credit' && customer_id) {
        await client.query(
          `INSERT INTO debt_transactions (type, entity_type, entity_id, order_id, amount, transaction_type, created_by)
           VALUES ('customer', 'customer', $1, $2, $3, 'increase', $4)`,
          [customer_id, order.id, finalAmount, user.id]
        );

        // Update customer debt
        await client.query(
          'UPDATE customers SET debt_amount = debt_amount + $1, total_purchases = total_purchases + $2, total_orders = total_orders + 1 WHERE id = $3',
          [finalAmount, finalAmount, customer_id]
        );
      } else if (customer_id) {
        // Update customer stats
        await client.query(
          'UPDATE customers SET total_purchases = total_purchases + $1, total_orders = total_orders + 1 WHERE id = $2',
          [finalAmount, customer_id]
        );
      }

      // If payment is credit, create debt transaction
      if (payment_method === 'credit' && customer_id) {
        await client.query(
          `INSERT INTO debt_transactions (type, entity_type, entity_id, order_id, amount, transaction_type, created_by)
           VALUES ('customer', 'customer', $1, $2, $3, 'increase', $4)`,
          [customer_id, order.id, finalAmount, user.id]
        );

        // Update customer debt
        await client.query(
          'UPDATE customers SET debt_amount = debt_amount + $1, total_purchases = total_purchases + $2, total_orders = total_orders + 1 WHERE id = $3',
          [finalAmount, finalAmount, customer_id]
        );
      } else if (customer_id) {
        // Update customer stats
        await client.query(
          'UPDATE customers SET total_purchases = total_purchases + $1, total_orders = total_orders + 1 WHERE id = $2',
          [finalAmount, customer_id]
        );
      }

      // Create order items and update stock
      for (const item of items) {
        const product = await client.query('SELECT price FROM products WHERE id = $1', [item.product_id]);
        const price = parseFloat(product.rows[0].price);
        const subtotal = price * item.quantity;

        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES ($1, $2, $3, $4, $5)',
          [order.id, item.product_id, item.quantity, price, subtotal]
        );

        // Update product stock
        await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
      }

      await client.query('COMMIT');

      // Fetch complete order with items
      const completeOrder = await db.pool.query(
        `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = $1`,
        [order.id]
      );
      const orderItems = await db.pool.query(
        `SELECT oi.*, p.name as product_name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1`,
        [order.id]
      );
      completeOrder.rows[0].items = orderItems.rows;

      res.status(201).json(completeOrder.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update order status
router.patch('/:id/status', authenticate, [
  body('status').isIn(['pending', 'processing', 'completed', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const result = await db.pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete order
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

