const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Stock In - Nhập kho
router.post('/stock-in', authenticate, [
  body('type').isIn(['purchase', 'return', 'adjustment', 'transfer']).withMessage('Invalid type'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, supplier_id, purchase_order_id, items, notes } = req.body;
    const user = req.user;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const refNumber = `SI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      let totalAmount = 0;

      const stockInResult = await client.query(
        'INSERT INTO stock_ins (reference_number, type, supplier_id, purchase_order_id, total_amount, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [refNumber, type, supplier_id, purchase_order_id, 0, notes, user.id]
      );

      const stockIn = stockInResult.rows[0];

      for (const item of items) {
        const subtotal = parseFloat(item.unit_price) * item.quantity;
        totalAmount += subtotal;

        await client.query(
          'INSERT INTO stock_in_items (stock_in_id, product_id, quantity, unit_price, batch_number, expiry_date, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [stockIn.id, item.product_id, item.quantity, item.unit_price, item.batch_number, item.expiry_date, subtotal]
        );

        // Update product stock
        await client.query('UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', 
          [item.quantity, item.product_id]);

        // Create inventory transaction
        await client.query(
          'INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [item.product_id, 'in', item.quantity, 'stock_in', stockIn.id, notes, user.id]
        );
      }

      await client.query('UPDATE stock_ins SET total_amount = $1 WHERE id = $2', [totalAmount, stockIn.id]);

      await client.query('COMMIT');

      const completeStockIn = await db.pool.query(
        'SELECT * FROM stock_ins WHERE id = $1',
        [stockIn.id]
      );
      const itemsResult = await db.pool.query(
        `SELECT sii.*, p.name as product_name FROM stock_in_items sii JOIN products p ON sii.product_id = p.id WHERE sii.stock_in_id = $1`,
        [stockIn.id]
      );
      completeStockIn.rows[0].items = itemsResult.rows;

      res.status(201).json(completeStockIn.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create stock in error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Stock Out - Xuất kho
router.post('/stock-out', authenticate, [
  body('type').isIn(['sale', 'return', 'damage', 'transfer']).withMessage('Invalid type'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, order_id, customer_id, items, notes } = req.body;
    const user = req.user;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const refNumber = `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      let totalAmount = 0;

      const stockOutResult = await client.query(
        'INSERT INTO stock_outs (reference_number, type, order_id, customer_id, total_amount, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [refNumber, type, order_id, customer_id, 0, notes, user.id]
      );

      const stockOut = stockOutResult.rows[0];

      for (const item of items) {
        // Check stock availability
        const product = await client.query('SELECT stock FROM products WHERE id = $1', [item.product_id]);
        if (product.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: `Product ${item.product_id} not found` });
        }
        if (product.rows[0].stock < item.quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `Insufficient stock for product ${item.product_id}` });
        }

        const subtotal = parseFloat(item.unit_price) * item.quantity;
        totalAmount += subtotal;

        await client.query(
          'INSERT INTO stock_out_items (stock_out_id, product_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5)',
          [stockOut.id, item.product_id, item.quantity, item.unit_price, subtotal]
        );

        // Update product stock
        await client.query('UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', 
          [item.quantity, item.product_id]);

        // Create inventory transaction
        await client.query(
          'INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [item.product_id, 'out', item.quantity, 'stock_out', stockOut.id, notes, user.id]
        );
      }

      await client.query('UPDATE stock_outs SET total_amount = $1 WHERE id = $2', [totalAmount, stockOut.id]);

      await client.query('COMMIT');

      const completeStockOut = await db.pool.query(
        'SELECT * FROM stock_outs WHERE id = $1',
        [stockOut.id]
      );
      const itemsResult = await db.pool.query(
        `SELECT soi.*, p.name as product_name FROM stock_out_items soi JOIN products p ON soi.product_id = p.id WHERE soi.stock_out_id = $1`,
        [stockOut.id]
      );
      completeStockOut.rows[0].items = itemsResult.rows;

      res.status(201).json(completeStockOut.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create stock out error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Stocktaking - Kiểm kê kho
router.post('/stocktaking', authenticate, [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { warehouse_location, items, notes } = req.body;
    const user = req.user;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const refNumber = `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const stocktakingResult = await db.pool.query(
        'INSERT INTO stocktakings (reference_number, warehouse_location, notes, created_by, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [refNumber, warehouse_location, notes, user.id, 'draft']
      );

      const stocktaking = stocktakingResult.rows[0];

      for (const item of items) {
        const product = await client.query('SELECT stock FROM products WHERE id = $1', [item.product_id]);
        if (product.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: `Product ${item.product_id} not found` });
        }

        const systemQuantity = product.rows[0].stock;
        const difference = item.counted_quantity - systemQuantity;

        await client.query(
          'INSERT INTO stocktaking_items (stocktaking_id, product_id, system_quantity, counted_quantity, difference, notes) VALUES ($1, $2, $3, $4, $5, $6)',
          [stocktaking.id, item.product_id, systemQuantity, item.counted_quantity, difference, item.notes]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(stocktaking);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create stocktaking error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Complete stocktaking - Hoàn thành kiểm kê và điều chỉnh
router.post('/stocktaking/:id/complete', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const stocktaking = await client.query('SELECT * FROM stocktakings WHERE id = $1', [req.params.id]);
      if (stocktaking.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Stocktaking not found' });
      }

      if (stocktaking.rows[0].status === 'completed') {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Stocktaking already completed' });
      }

      const items = await client.query(
        'SELECT * FROM stocktaking_items WHERE stocktaking_id = $1',
        [req.params.id]
      );

      // Adjust stock for each item
      for (const item of items.rows) {
        if (item.difference !== 0) {
          const adjustmentType = item.difference > 0 ? 'in' : 'out';
          const adjustmentQuantity = Math.abs(item.difference);

          // Update product stock
          await client.query(
            'UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [item.counted_quantity, item.product_id]
          );

          // Create inventory transaction
          await client.query(
            'INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [item.product_id, 'adjustment', item.difference, 'stocktaking', req.params.id, 'Điều chỉnh từ kiểm kê', user.id]
          );
        }
      }

      // Update stocktaking status
      await client.query(
        'UPDATE stocktakings SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', req.params.id]
      );

      await client.query('COMMIT');
      res.json({ message: 'Kiểm kê đã hoàn thành và kho đã được điều chỉnh' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Complete stocktaking error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get stock ins
router.get('/stock-ins', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await db.pool.query(
      `SELECT si.*, s.name as supplier_name, u.username as created_by_name
       FROM stock_ins si
       LEFT JOIN suppliers s ON si.supplier_id = s.id
       LEFT JOIN users u ON si.created_by = u.id
       ORDER BY si.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get stock ins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get stock outs
router.get('/stock-outs', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await db.pool.query(
      `SELECT so.*, c.name as customer_name, u.username as created_by_name
       FROM stock_outs so
       LEFT JOIN customers c ON so.customer_id = c.id
       LEFT JOIN users u ON so.created_by = u.id
       ORDER BY so.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get stock outs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get stocktakings
router.get('/stocktakings', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT st.*, u.username as created_by_name
      FROM stocktakings st
      LEFT JOIN users u ON st.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND st.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY st.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get stocktakings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

