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
  body('customer_id').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    return !isNaN(parseInt(value));
  }).withMessage('Customer ID must be a valid integer'),
  body('shipping_method_id').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    return !isNaN(parseInt(value));
  }).withMessage('Shipping method ID must be a valid integer'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').isInt().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  try {
    // Check database connection
    if (!db.pool) {
      console.error('Database pool not initialized');
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, items, payment_method, notes, shipping_method_id, shipping_address, shipping_phone, promotion_code } = req.body;
    const user = req.user;
    
    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Normalize integer fields: convert empty strings to null
      const normalizedCustomerId = (customer_id && customer_id !== '') ? parseInt(customer_id) : null;
      const normalizedShippingMethodId = (shipping_method_id && shipping_method_id !== '') ? parseInt(shipping_method_id) : null;

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
      if (normalizedShippingMethodId) {
        const shipping = await client.query('SELECT cost FROM shipping_methods WHERE id = $1', [normalizedShippingMethodId]);
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
        [normalizedCustomerId, orderNumber, finalAmount, normalizedShippingMethodId, shippingCost, discountAmount, promotionId, payment_method || 'cash', shipping_address || null, shipping_phone || null, notes || null, 'pending']
      );

      const order = orderResult.rows[0];

      // If payment is credit, create debt transaction
      if (payment_method === 'credit' && normalizedCustomerId) {
        await client.query(
          `INSERT INTO debt_transactions (type, entity_type, entity_id, order_id, amount, transaction_type, created_by)
           VALUES ('customer', 'customer', $1, $2, $3, 'increase', $4)`,
          [normalizedCustomerId, order.id, finalAmount, user.id]
        );

        // Update customer debt
        await client.query(
          'UPDATE customers SET debt_amount = debt_amount + $1, total_purchases = total_purchases + $2, total_orders = total_orders + 1 WHERE id = $3',
          [finalAmount, finalAmount, normalizedCustomerId]
        );
      } else if (normalizedCustomerId) {
        // Update customer stats
        await client.query(
          'UPDATE customers SET total_purchases = total_purchases + $1, total_orders = total_orders + 1 WHERE id = $2',
          [finalAmount, normalizedCustomerId]
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
    console.error('❌ Create order error:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'Duplicate entry' });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ message: 'Invalid reference' });
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ message: 'Database connection failed' });
    }
    
    res.status(500).json({ 
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update order (full update)
router.put('/:id', authenticate, [
  body('customer_id').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    return !isNaN(parseInt(value));
  }),
  body('shipping_method_id').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    return !isNaN(parseInt(value));
  }),
  body('status').optional().isIn(['pending', 'processing', 'completed', 'cancelled']),
  body('delivery_status').optional().isIn(['pending', 'shipping', 'delivered', 'returned', 'cancelled'])
], async (req, res) => {
  try {
    // Check database connection
    if (!db.pool) {
      console.error('Database pool not initialized');
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      customer_id,
      shipping_method_id,
      payment_method,
      status,
      notes,
      shipping_address,
      shipping_phone,
      tracking_number,
      return_code,
      reconciliation_code,
      delivery_status,
      area,
      ward,
      branch_id,
      seller_id,
      sales_channel,
      total_amount,
      total_after_tax,
      discount_amount,
      vat,
      tax_reduction,
      other_income,
      customer_paid,
      payment_discount,
      cod_amount,
      return_fee,
      delivery_status_notes,
      delivered_at
    } = req.body;

    // Normalize integer fields
    const normalizedCustomerId = (customer_id && customer_id !== '') ? parseInt(customer_id) : null;
    const normalizedShippingMethodId = (shipping_method_id && shipping_method_id !== '') ? parseInt(shipping_method_id) : null;
    const normalizedBranchId = (branch_id && branch_id !== '') ? parseInt(branch_id) : null;
    const normalizedSellerId = (seller_id && seller_id !== '') ? parseInt(seller_id) : null;

    // Build dynamic update query
    const updateFields = [];
    const params = [];
    let paramCount = 0;

    if (normalizedCustomerId !== undefined) {
      paramCount++;
      updateFields.push(`customer_id = $${paramCount}`);
      params.push(normalizedCustomerId);
    }
    if (normalizedShippingMethodId !== undefined) {
      paramCount++;
      updateFields.push(`shipping_method_id = $${paramCount}`);
      params.push(normalizedShippingMethodId);
    }
    if (payment_method !== undefined) {
      paramCount++;
      updateFields.push(`payment_method = $${paramCount}`);
      params.push(payment_method);
    }
    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      params.push(status);
    }
    if (notes !== undefined) {
      paramCount++;
      updateFields.push(`notes = $${paramCount}`);
      params.push(notes);
    }
    if (shipping_address !== undefined) {
      paramCount++;
      updateFields.push(`shipping_address = $${paramCount}`);
      params.push(shipping_address);
    }
    if (shipping_phone !== undefined) {
      paramCount++;
      updateFields.push(`shipping_phone = $${paramCount}`);
      params.push(shipping_phone);
    }
    if (tracking_number !== undefined) {
      paramCount++;
      updateFields.push(`tracking_number = $${paramCount}`);
      params.push(tracking_number);
    }
    if (return_code !== undefined) {
      paramCount++;
      updateFields.push(`return_code = $${paramCount}`);
      params.push(return_code);
    }
    if (reconciliation_code !== undefined) {
      paramCount++;
      updateFields.push(`reconciliation_code = $${paramCount}`);
      params.push(reconciliation_code);
    }
    if (delivery_status !== undefined) {
      paramCount++;
      updateFields.push(`delivery_status = $${paramCount}`);
      params.push(delivery_status);
    }
    if (area !== undefined) {
      paramCount++;
      updateFields.push(`area = $${paramCount}`);
      params.push(area);
    }
    if (ward !== undefined) {
      paramCount++;
      updateFields.push(`ward = $${paramCount}`);
      params.push(ward);
    }
    if (normalizedBranchId !== undefined) {
      paramCount++;
      updateFields.push(`branch_id = $${paramCount}`);
      params.push(normalizedBranchId);
    }
    if (normalizedSellerId !== undefined) {
      paramCount++;
      updateFields.push(`seller_id = $${paramCount}`);
      params.push(normalizedSellerId);
    }
    if (sales_channel !== undefined) {
      paramCount++;
      updateFields.push(`sales_channel = $${paramCount}`);
      params.push(sales_channel);
    }
    if (total_amount !== undefined) {
      paramCount++;
      updateFields.push(`total_amount = $${paramCount}`);
      params.push(parseFloat(total_amount));
    }
    if (total_after_tax !== undefined) {
      paramCount++;
      updateFields.push(`total_after_tax = $${paramCount}`);
      params.push(parseFloat(total_after_tax));
    }
    if (discount_amount !== undefined) {
      paramCount++;
      updateFields.push(`discount_amount = $${paramCount}`);
      params.push(parseFloat(discount_amount));
    }
    if (vat !== undefined) {
      paramCount++;
      updateFields.push(`vat = $${paramCount}`);
      params.push(parseFloat(vat));
    }
    if (tax_reduction !== undefined) {
      paramCount++;
      updateFields.push(`tax_reduction = $${paramCount}`);
      params.push(parseFloat(tax_reduction));
    }
    if (other_income !== undefined) {
      paramCount++;
      updateFields.push(`other_income = $${paramCount}`);
      params.push(parseFloat(other_income));
    }
    if (customer_paid !== undefined) {
      paramCount++;
      updateFields.push(`customer_paid = $${paramCount}`);
      params.push(parseFloat(customer_paid));
    }
    if (payment_discount !== undefined) {
      paramCount++;
      updateFields.push(`payment_discount = $${paramCount}`);
      params.push(parseFloat(payment_discount));
    }
    if (cod_amount !== undefined) {
      paramCount++;
      updateFields.push(`cod_amount = $${paramCount}`);
      params.push(parseFloat(cod_amount));
    }
    if (return_fee !== undefined) {
      paramCount++;
      updateFields.push(`return_fee = $${paramCount}`);
      params.push(parseFloat(return_fee));
    }
    if (delivery_status_notes !== undefined) {
      paramCount++;
      updateFields.push(`delivery_status_notes = $${paramCount}`);
      params.push(delivery_status_notes);
    }
    if (delivered_at !== undefined) {
      paramCount++;
      updateFields.push(`delivered_at = $${paramCount}`);
      params.push(delivered_at ? new Date(delivered_at) : null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Always update updated_at
    paramCount++;
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE clause
    paramCount++;
    params.push(parseInt(req.params.id));

    const query = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await db.pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Fetch complete order with customer info
    const completeOrder = await db.pool.query(
      `SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone 
       FROM orders o 
       LEFT JOIN customers c ON o.customer_id = c.id 
       WHERE o.id = $1`,
      [req.params.id]
    );

    res.json(completeOrder.rows[0]);
  } catch (error) {
    console.error('❌ Update order error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

