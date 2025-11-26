const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all purchase orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, supplier_id, page = 1, limit = 10 } = req.query;
    let query = `
      SELECT po.*, s.name as supplier_name, s.contact_name, u.username as created_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND po.status = $${paramCount}`;
      params.push(status);
    }

    if (supplier_id) {
      paramCount++;
      query += ` AND po.supplier_id = $${paramCount}`;
      params.push(supplier_id);
    }

    query += ` ORDER BY po.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.pool.query(query, params);
    
    // Get items for each order
    for (let order of result.rows) {
      const items = await db.pool.query(
        `SELECT poi.*, p.name as product_name, p.sku 
         FROM purchase_order_items poi 
         JOIN products p ON poi.product_id = p.id 
         WHERE poi.purchase_order_id = $1`,
        [order.id]
      );
      order.items = items.rows;
    }

    const countResult = await db.pool.query('SELECT COUNT(*) FROM purchase_orders');
    
    res.json({
      orders: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single purchase order
router.get('/:id', authenticate, async (req, res) => {
  try {
    const orderResult = await db.pool.query(
      `SELECT po.*, s.name as supplier_name, s.contact_name, s.email as supplier_email, 
              s.phone as supplier_phone, u.username as created_by_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN users u ON po.created_by = u.id
       WHERE po.id = $1`,
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    const order = orderResult.rows[0];
    const items = await db.pool.query(
      `SELECT poi.*, p.name as product_name, p.sku, p.image_url
       FROM purchase_order_items poi
       JOIN products p ON poi.product_id = p.id
       WHERE poi.purchase_order_id = $1`,
      [req.params.id]
    );
    order.items = items.rows;

    res.json(order);
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create purchase order
router.post('/', authenticate, [
  body('supplier_id').isInt().withMessage('Supplier ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').isInt().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { supplier_id, items, expected_date, notes } = req.body;
    const user = req.user;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate order number
      const orderNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Calculate total
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += parseFloat(item.unit_price) * item.quantity;
      }

      // Create purchase order
      const orderResult = await client.query(
        'INSERT INTO purchase_orders (order_number, supplier_id, total_amount, expected_date, notes, created_by, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [orderNumber, supplier_id, totalAmount, expected_date, notes, user.id, 'pending']
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of items) {
        const subtotal = parseFloat(item.unit_price) * item.quantity;
        await client.query(
          'INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5)',
          [order.id, item.product_id, item.quantity, item.unit_price, subtotal]
        );
      }

      // Create debt transaction
      await client.query(
        `INSERT INTO debt_transactions (type, entity_type, entity_id, purchase_order_id, amount, transaction_type, created_by)
         VALUES ('supplier', 'supplier', $1, $2, $3, 'increase', $4)`,
        [supplier_id, order.id, totalAmount, user.id]
      );

      // Update supplier debt
      await client.query(
        'UPDATE suppliers SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [supplier_id]
      );

      await client.query('COMMIT');

      // Fetch complete order
      const completeOrder = await db.pool.query(
        `SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = $1`,
        [order.id]
      );
      const orderItems = await db.pool.query(
        `SELECT poi.*, p.name as product_name FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE poi.purchase_order_id = $1`,
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
    console.error('Create purchase order error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Receive purchase order (Nhận hàng)
router.post('/:id/receive', authenticate, async (req, res) => {
  try {
    const { received_items } = req.body; // [{ product_id, quantity, unit_price, batch_number, expiry_date }]
    const user = req.user;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Get purchase order
      const po = await client.query('SELECT * FROM purchase_orders WHERE id = $1', [req.params.id]);
      if (po.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Purchase order not found' });
      }

      const purchaseOrder = po.rows[0];
      if (purchaseOrder.status === 'received') {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Order already received' });
      }

      // Generate stock in reference
      const refNumber = `SI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      let totalAmount = 0;

      // Create stock in
      const stockInResult = await client.query(
        'INSERT INTO stock_ins (reference_number, type, supplier_id, purchase_order_id, total_amount, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [refNumber, 'purchase', purchaseOrder.supplier_id, purchaseOrder.id, 0, user.id]
      );

      const stockIn = stockInResult.rows[0];

      // Process received items
      for (const item of received_items) {
        const subtotal = parseFloat(item.unit_price) * item.quantity;
        totalAmount += subtotal;

        // Create stock in item
        await client.query(
          'INSERT INTO stock_in_items (stock_in_id, product_id, quantity, unit_price, batch_number, expiry_date, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [stockIn.id, item.product_id, item.quantity, item.unit_price, item.batch_number, item.expiry_date, subtotal]
        );

        // Update product stock
        await client.query('UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', 
          [item.quantity, item.product_id]);

        // Update purchase order item received quantity
        await client.query(
          'UPDATE purchase_order_items SET received_quantity = received_quantity + $1 WHERE purchase_order_id = $2 AND product_id = $3',
          [item.quantity, purchaseOrder.id, item.product_id]
        );

        // Create inventory transaction
        await client.query(
          'INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [item.product_id, 'in', item.quantity, 'stock_in', stockIn.id, `Nhập từ đơn đặt hàng ${purchaseOrder.order_number}`, user.id]
        );
      }

      // Update stock in total
      await client.query('UPDATE stock_ins SET total_amount = $1 WHERE id = $2', [totalAmount, stockIn.id]);

      // Check if all items received
      const pendingItems = await client.query(
        'SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = $1 AND received_quantity < quantity',
        [purchaseOrder.id]
      );

      // Update purchase order status
      const newStatus = parseInt(pendingItems.rows[0].count) === 0 ? 'received' : 'partial';
      await client.query(
        'UPDATE purchase_orders SET status = $1, received_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStatus, purchaseOrder.id]
      );

      await client.query('COMMIT');

      res.json({ 
        message: 'Hàng đã được nhập kho',
        stock_in: stockIn,
        purchase_order_status: newStatus
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Receive purchase order error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update purchase order status
router.patch('/:id/status', authenticate, [
  body('status').isIn(['pending', 'confirmed', 'partial', 'received', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const result = await db.pool.query(
      'UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update purchase order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

