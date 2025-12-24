const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const reconciliationService = require('../services/reconciliationService');
const router = express.Router();

// Get all reconciliations
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      type, 
      status, 
      partner_id,
      partner_type,
      start_date,
      end_date,
      page = 1, 
      limit = 20 
    } = req.query;
    
    let query = `
      SELECT r.*, 
             u_creator.full_name as creator_name,
             u_confirmed.full_name as confirmed_by_name,
             u_approved.full_name as approved_by_name
      FROM reconciliations r
      LEFT JOIN users u_creator ON r.created_by = u_creator.id
      LEFT JOIN users u_confirmed ON r.confirmed_by = u_confirmed.id
      LEFT JOIN users u_approved ON r.approved_by = u_approved.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (type) {
      paramCount++;
      query += ` AND r.type = $${paramCount}`;
      params.push(type);
    }

    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
    }

    if (partner_id) {
      paramCount++;
      query += ` AND r.partner_id = $${paramCount}`;
      params.push(partner_id);
    }

    if (partner_type) {
      paramCount++;
      query += ` AND r.partner_type = $${paramCount}`;
      params.push(partner_type);
    }

    if (start_date) {
      paramCount++;
      query += ` AND r.period_start >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND r.period_end <= $${paramCount}`;
      params.push(end_date);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.pool.query(query, params);
    
    // Get count
    let countQuery = `SELECT COUNT(*) FROM reconciliations WHERE 1=1`;
    const countParams = [];
    let countParamCount = 0;

    if (type) {
      countParamCount++;
      countQuery += ` AND type = $${countParamCount}`;
      countParams.push(type);
    }
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }
    if (partner_id) {
      countParamCount++;
      countQuery += ` AND partner_id = $${countParamCount}`;
      countParams.push(partner_id);
    }
    if (partner_type) {
      countParamCount++;
      countQuery += ` AND partner_type = $${countParamCount}`;
      countParams.push(partner_type);
    }
    if (start_date) {
      countParamCount++;
      countQuery += ` AND period_start >= $${countParamCount}`;
      countParams.push(start_date);
    }
    if (end_date) {
      countParamCount++;
      countQuery += ` AND period_end <= $${countParamCount}`;
      countParams.push(end_date);
    }

    const countResult = await db.pool.query(countQuery, countParams);
    
    res.json({
      reconciliations: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get reconciliations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single reconciliation with items
router.get('/:id', authenticate, async (req, res) => {
  try {
    const reconciliationResult = await db.pool.query(
      `SELECT r.*, 
              u_creator.full_name as creator_name,
              u_confirmed.full_name as confirmed_by_name,
              u_approved.full_name as approved_by_name
       FROM reconciliations r
       LEFT JOIN users u_creator ON r.created_by = u_creator.id
       LEFT JOIN users u_confirmed ON r.confirmed_by = u_confirmed.id
       LEFT JOIN users u_approved ON r.approved_by = u_approved.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (reconciliationResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reconciliation not found' });
    }

    const reconciliation = reconciliationResult.rows[0];

    // Get reconciliation items
    const itemsResult = await db.pool.query(
      `SELECT * FROM reconciliation_items WHERE reconciliation_id = $1 ORDER BY order_date DESC`,
      [req.params.id]
    );

    reconciliation.items = itemsResult.rows;

    res.json(reconciliation);
  } catch (error) {
    console.error('Get reconciliation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create reconciliation (auto-generate from orders/shipments)
router.post('/', authenticate, [
  body('type').isIn(['carrier', 'platform']).withMessage('Type must be carrier or platform'),
  body('partner_id').optional().isInt(),
  body('period_start').isISO8601().withMessage('Period start date is required'),
  body('period_end').isISO8601().withMessage('Period end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, partner_id, partner_name, partner_type, period_start, period_end, notes } = req.body;
    const user = req.user;

    const reconciliation = await reconciliationService.createReconciliation({
      type,
      partner_id,
      partner_name,
      partner_type,
      period_start,
      period_end,
      notes,
      created_by: user.id
    });

    res.status(201).json(reconciliation);
  } catch (error) {
    console.error('Create reconciliation error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update reconciliation
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { status, notes, net_amount } = req.body;
    const user = req.user;

    const updateFields = [];
    const params = [];
    let paramCount = 0;

    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      params.push(status);

      // Update confirmation/approval info based on status
      if (status === 'confirmed') {
        paramCount++;
        updateFields.push(`confirmed_by = $${paramCount}`);
        params.push(user.id);
        paramCount++;
        updateFields.push(`confirmed_at = CURRENT_TIMESTAMP`);
      } else if (status === 'approved') {
        paramCount++;
        updateFields.push(`approved_by = $${paramCount}`);
        params.push(user.id);
        paramCount++;
        updateFields.push(`approved_at = CURRENT_TIMESTAMP`);
      } else if (status === 'paid') {
        paramCount++;
        updateFields.push(`paid_at = CURRENT_TIMESTAMP`);
      }
    }

    if (notes !== undefined) {
      paramCount++;
      updateFields.push(`notes = $${paramCount}`);
      params.push(notes);
    }

    if (net_amount !== undefined) {
      paramCount++;
      updateFields.push(`net_amount = $${paramCount}`);
      params.push(parseFloat(net_amount));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    paramCount++;
    params.push(parseInt(req.params.id));

    const query = `UPDATE reconciliations SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await db.pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reconciliation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update reconciliation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete reconciliation
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query('DELETE FROM reconciliations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reconciliation not found' });
    }
    res.json({ message: 'Reconciliation deleted successfully' });
  } catch (error) {
    console.error('Delete reconciliation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available partners for reconciliation
router.get('/partners/available', authenticate, async (req, res) => {
  try {
    const { type } = req.query;

    if (type === 'carrier') {
      // Get carriers that have shipments
      const result = await db.pool.query(`
        SELECT DISTINCT sm.id, sm.name, sm.description
        FROM shipping_methods sm
        INNER JOIN shipments s ON s.carrier_id = sm.id
        WHERE sm.is_active = true
        ORDER BY sm.name
      `);
      res.json(result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: 'carrier',
        description: row.description
      })));
    } else if (type === 'platform') {
      // Get sales channels that have orders
      const result = await db.pool.query(`
        SELECT DISTINCT sales_channel
        FROM orders
        WHERE sales_channel IS NOT NULL AND sales_channel != ''
        ORDER BY sales_channel
      `);
      res.json(result.rows.map(row => ({
        id: row.sales_channel,
        name: row.sales_channel,
        type: 'platform'
      })));
    } else {
      // Get both
      const carriers = await db.pool.query(`
        SELECT DISTINCT sm.id, sm.name, sm.description
        FROM shipping_methods sm
        INNER JOIN shipments s ON s.carrier_id = sm.id
        WHERE sm.is_active = true
        ORDER BY sm.name
      `);
      const platforms = await db.pool.query(`
        SELECT DISTINCT sales_channel
        FROM orders
        WHERE sales_channel IS NOT NULL AND sales_channel != ''
        ORDER BY sales_channel
      `);

      res.json({
        carriers: carriers.rows.map(row => ({
          id: row.id,
          name: row.name,
          type: 'carrier',
          description: row.description
        })),
        platforms: platforms.rows.map(row => ({
          id: row.sales_channel,
          name: row.sales_channel,
          type: 'platform'
        }))
      });
    }
  } catch (error) {
    console.error('Get available partners error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

