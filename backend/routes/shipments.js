const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const carrierService = require('../services/carrierService');
const router = express.Router();

// Get all shipments
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, carrier_id, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT s.*, 
             o.order_number, o.customer_id, o.sales_channel as order_sales_channel,
             c.name as customer_name, c.phone as customer_phone,
             sm.name as carrier_name
      FROM shipments s
      LEFT JOIN orders o ON s.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN shipping_methods sm ON s.carrier_id = sm.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND s.status = $${paramCount}`;
      params.push(status);
    }

    if (carrier_id) {
      paramCount++;
      query += ` AND s.carrier_id = $${paramCount}`;
      params.push(carrier_id);
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.pool.query(query, params);
    
    const countResult = await db.pool.query('SELECT COUNT(*) FROM shipments');
    
    res.json({
      shipments: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single shipment
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(
      `SELECT s.*, 
              o.order_number, o.customer_id, o.total_amount, o.sales_channel as order_sales_channel,
              o.shipping_address, o.shipping_phone,
              c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
              sm.name as carrier_name, sm.description as carrier_description
       FROM shipments s
       LEFT JOIN orders o ON s.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN shipping_methods sm ON s.carrier_id = sm.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create shipment
router.post('/', authenticate, [
  body('order_id').isInt().withMessage('Order ID is required'),
  body('carrier_id').isInt().withMessage('Carrier ID is required'),
  body('tracking_number').notEmpty().withMessage('Tracking number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { order_id, carrier_id, tracking_number, notes, estimated_delivery_date, sales_channel } = req.body;
    const user = req.user;
    const client = await db.pool.connect();

    try {
      // Get sales_channel from order if not provided
      let finalSalesChannel = sales_channel;
      if (!finalSalesChannel && order_id) {
        const orderResult = await db.pool.query('SELECT sales_channel FROM orders WHERE id = $1', [order_id]);
        if (orderResult.rows.length > 0) {
          finalSalesChannel = orderResult.rows[0].sales_channel;
        }
      }
      await client.query('BEGIN');

      // Check if order exists
      const order = await client.query('SELECT * FROM orders WHERE id = $1', [order_id]);
      if (order.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Order not found' });
      }

      // Create shipment
      const shipmentResult = await client.query(
        `INSERT INTO shipments (order_id, carrier_id, tracking_number, status, sales_channel, notes, estimated_delivery_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [order_id, carrier_id, tracking_number, 'pending', finalSalesChannel, notes, estimated_delivery_date, user.id]
      );

      // Update order with tracking number
      await client.query(
        'UPDATE orders SET tracking_number = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [tracking_number, order_id]
      );

      await client.query('COMMIT');

      const shipment = shipmentResult.rows[0];
      const completeShipment = await db.pool.query(
        `SELECT s.*, o.order_number, sm.name as carrier_name
         FROM shipments s
         LEFT JOIN orders o ON s.order_id = o.id
         LEFT JOIN shipping_methods sm ON s.carrier_id = sm.id
         WHERE s.id = $1`,
        [shipment.id]
      );

      res.status(201).json(completeShipment.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update shipment status
router.patch('/:id/status', authenticate, [
  body('status').isIn(['pending', 'in_transit', 'delivered', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, delivered_at } = req.body;
    const result = await db.pool.query(
      `UPDATE shipments 
       SET status = $1, delivered_at = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [status, delivered_at, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    // If delivered, update order status
    if (status === 'delivered') {
      const shipment = result.rows[0];
      await db.pool.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', shipment.order_id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update shipment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update shipment
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { carrier_id, tracking_number, notes, estimated_delivery_date } = req.body;
    const result = await db.pool.query(
      `UPDATE shipments 
       SET carrier_id = $1, tracking_number = $2, notes = $3, estimated_delivery_date = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 RETURNING *`,
      [carrier_id, tracking_number, notes, estimated_delivery_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    // Update order tracking number
    if (tracking_number) {
      const shipment = result.rows[0];
      await db.pool.query(
        'UPDATE orders SET tracking_number = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [tracking_number, shipment.order_id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update shipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sync shipment status from carrier API
router.post('/:id/sync', authenticate, async (req, res) => {
  try {
    const statusData = await carrierService.syncShipmentStatus(req.params.id);
    res.json({ 
      message: 'Đồng bộ thành công',
      status: statusData 
    });
  } catch (error) {
    console.error('Sync shipment error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Sync all shipments for a carrier
router.post('/carrier/:carrierId/sync', authenticate, async (req, res) => {
  try {
    const results = await carrierService.syncCarrierShipments(req.params.carrierId);
    res.json({ 
      message: 'Đồng bộ hoàn tất',
      results,
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('Sync carrier shipments error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;

