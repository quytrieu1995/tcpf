const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get customer debts
router.get('/customers', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.debt_amount,
        c.credit_limit,
        COUNT(DISTINCT o.id) as unpaid_orders_count
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status = 'completed' AND o.payment_method = 'credit'
      WHERE c.debt_amount > 0
      GROUP BY c.id, c.name, c.email, c.phone, c.debt_amount, c.credit_limit
      ORDER BY c.debt_amount DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get customer debts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get supplier debts
router.get('/suppliers', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT 
        s.id,
        s.name,
        s.contact_name,
        s.email,
        s.phone,
        COALESCE(SUM(CASE WHEN dt.transaction_type = 'increase' THEN dt.amount ELSE -dt.amount END), 0) as debt_amount,
        COUNT(DISTINCT po.id) as unpaid_orders_count
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status != 'cancelled'
      LEFT JOIN debt_transactions dt ON dt.entity_type = 'supplier' AND dt.entity_id = s.id
      GROUP BY s.id, s.name, s.contact_name, s.email, s.phone
      HAVING COALESCE(SUM(CASE WHEN dt.transaction_type = 'increase' THEN dt.amount ELSE -dt.amount END), 0) > 0
      ORDER BY debt_amount DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get supplier debts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Pay customer debt
router.post('/customers/:id/pay', authenticate, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('payment_method').notEmpty().withMessage('Payment method is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, payment_method, notes } = req.body;
    const user = req.user;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Get customer current debt
      const customer = await client.query('SELECT debt_amount FROM customers WHERE id = $1', [req.params.id]);
      if (customer.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Customer not found' });
      }

      const currentDebt = parseFloat(customer.rows[0].debt_amount);
      const paymentAmount = parseFloat(amount);

      if (paymentAmount > currentDebt) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Payment amount exceeds debt' });
      }

      // Create debt transaction
      await client.query(
        `INSERT INTO debt_transactions (type, entity_type, entity_id, amount, transaction_type, notes, created_by)
         VALUES ('customer', 'customer', $1, $2, 'decrease', $3, $4)`,
        [req.params.id, paymentAmount, notes || `Thanh toán công nợ - ${payment_method}`, user.id]
      );

      // Update customer debt
      await client.query(
        'UPDATE customers SET debt_amount = debt_amount - $1 WHERE id = $2',
        [paymentAmount, req.params.id]
      );

      await client.query('COMMIT');
      res.json({ message: 'Thanh toán công nợ thành công', remaining_debt: currentDebt - paymentAmount });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Pay customer debt error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Pay supplier debt
router.post('/suppliers/:id/pay', authenticate, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('payment_method').notEmpty().withMessage('Payment method is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, payment_method, notes } = req.body;
    const user = req.user;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Get supplier current debt
      const debtResult = await client.query(
        `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'increase' THEN amount ELSE -amount END), 0) as debt_amount
         FROM debt_transactions
         WHERE entity_type = 'supplier' AND entity_id = $1`,
        [req.params.id]
      );

      const currentDebt = parseFloat(debtResult.rows[0].debt_amount);
      const paymentAmount = parseFloat(amount);

      if (paymentAmount > currentDebt) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Payment amount exceeds debt' });
      }

      // Create debt transaction
      await client.query(
        `INSERT INTO debt_transactions (type, entity_type, entity_id, amount, transaction_type, notes, created_by)
         VALUES ('supplier', 'supplier', $1, $2, 'decrease', $3, $4)`,
        [req.params.id, paymentAmount, notes || `Thanh toán công nợ - ${payment_method}`, user.id]
      );

      await client.query('COMMIT');
      res.json({ message: 'Thanh toán công nợ thành công', remaining_debt: currentDebt - paymentAmount });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Pay supplier debt error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get debt history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { entity_type, entity_id, page = 1, limit = 50 } = req.query;
    let query = `
      SELECT dt.*, u.username as created_by_name
      FROM debt_transactions dt
      LEFT JOIN users u ON dt.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (entity_type) {
      paramCount++;
      query += ` AND dt.entity_type = $${paramCount}`;
      params.push(entity_type);
    }

    if (entity_id) {
      paramCount++;
      query += ` AND dt.entity_id = $${paramCount}`;
      params.push(entity_id);
    }

    query += ` ORDER BY dt.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get debt history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

