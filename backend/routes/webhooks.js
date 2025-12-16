const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const router = express.Router();

// Lazy load service to avoid initialization issues
let kiotvietService = null;
function getKiotVietService() {
  if (!kiotvietService) {
    try {
      kiotvietService = require('../services/kiotvietService');
    } catch (error) {
      console.error('[WEBHOOKS] Failed to load kiotvietService:', error.message);
      throw error;
    }
  }
  return kiotvietService;
}

/**
 * Webhook endpoint để nhận dữ liệu từ KiotViet
 * KiotViet sẽ gọi endpoint này khi có sự kiện mới (đơn hàng, khách hàng, sản phẩm)
 */
router.post('/kiotviet', async (req, res) => {
  try {
    const { event, data, timestamp } = req.body;

    console.log('[WEBHOOK] Received KiotViet webhook:', {
      event,
      timestamp,
      hasData: !!data
    });

    // Validate webhook data
    if (!event || !data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: event, data'
      });
    }

    const service = getKiotVietService();

    // Process different event types
    switch (event) {
      case 'order.created':
      case 'order.updated':
      case 'invoice.created':
      case 'invoice.updated':
        // Sync order
        try {
          await service.syncOrderToDatabase(data);
          console.log('[WEBHOOK] Order synced successfully:', data.id || data.code);
        } catch (error) {
          console.error('[WEBHOOK] Error syncing order:', error.message);
          // Don't fail the webhook, just log the error
        }
        break;

      case 'customer.created':
      case 'customer.updated':
        // Sync customer
        try {
          await service.syncCustomerToDatabase(data);
          console.log('[WEBHOOK] Customer synced successfully:', data.id || data.code);
        } catch (error) {
          console.error('[WEBHOOK] Error syncing customer:', error.message);
        }
        break;

      case 'product.created':
      case 'product.updated':
        // Sync product
        try {
          await service.syncProductToDatabase(data);
          console.log('[WEBHOOK] Product synced successfully:', data.id || data.code);
        } catch (error) {
          console.error('[WEBHOOK] Error syncing product:', error.message);
        }
        break;

      default:
        console.log('[WEBHOOK] Unknown event type:', event);
    }

    // Log webhook event
    await db.pool.query(
      `INSERT INTO kiotviet_webhook_logs (event_type, payload, status, created_at)
       VALUES ($1, $2, 'success', CURRENT_TIMESTAMP)`,
      [event, JSON.stringify(req.body)]
    ).catch(err => {
      console.error('[WEBHOOK] Error logging webhook:', err.message);
    });

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('[WEBHOOK] Webhook processing error:', error);
    
    // Log error
    try {
      await db.pool.query(
        `INSERT INTO kiotviet_webhook_logs (event_type, payload, status, error_message, created_at)
         VALUES ($1, $2, 'error', $3, CURRENT_TIMESTAMP)`,
        [req.body?.event || 'unknown', JSON.stringify(req.body), error.message]
      );
    } catch (logError) {
      console.error('[WEBHOOK] Error logging webhook error:', logError.message);
    }

    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
});

/**
 * API endpoint cho n8n để đồng bộ đơn hàng
 * POST /api/webhooks/n8n/sync/orders
 */
router.post('/n8n/sync/orders', [
  body('api_key').optional().isString(),
  body('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  body('from_date').optional().isISO8601().withMessage('Invalid date format'),
  body('to_date').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    // Optional: Verify API key if provided
    if (req.body.api_key) {
      const apiKeyResult = await db.pool.query(
        'SELECT * FROM api_keys WHERE token = $1 AND is_active = true',
        [req.body.api_key]
      );
      if (apiKeyResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key'
        });
      }
    }

    const service = getKiotVietService();
    const options = {
      limit: req.body.limit || 100,
      fromDate: req.body.from_date,
      toDate: req.body.to_date
    };

    const result = await service.syncOrders(options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[N8N] Sync orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed',
      error: error.message
    });
  }
});

/**
 * API endpoint cho n8n để đồng bộ khách hàng
 * POST /api/webhooks/n8n/sync/customers
 */
router.post('/n8n/sync/customers', [
  body('api_key').optional().isString(),
  body('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  body('from_date').optional().isISO8601().withMessage('Invalid date format'),
  body('to_date').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    // Optional: Verify API key if provided
    if (req.body.api_key) {
      const apiKeyResult = await db.pool.query(
        'SELECT * FROM api_keys WHERE token = $1 AND is_active = true',
        [req.body.api_key]
      );
      if (apiKeyResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key'
        });
      }
    }

    const service = getKiotVietService();
    const options = {
      limit: req.body.limit || 100,
      fromDate: req.body.from_date,
      toDate: req.body.to_date
    };

    const result = await service.syncCustomers(options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[N8N] Sync customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed',
      error: error.message
    });
  }
});

/**
 * API endpoint cho n8n để đồng bộ sản phẩm
 * POST /api/webhooks/n8n/sync/products
 */
router.post('/n8n/sync/products', [
  body('api_key').optional().isString(),
  body('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  body('from_date').optional().isISO8601().withMessage('Invalid date format'),
  body('to_date').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    // Optional: Verify API key if provided
    if (req.body.api_key) {
      const apiKeyResult = await db.pool.query(
        'SELECT * FROM api_keys WHERE token = $1 AND is_active = true',
        [req.body.api_key]
      );
      if (apiKeyResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key'
        });
      }
    }

    const service = getKiotVietService();
    const options = {
      limit: req.body.limit || 100,
      fromDate: req.body.from_date,
      toDate: req.body.to_date
    };

    const result = await service.syncProducts(options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[N8N] Sync products error:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed',
      error: error.message
    });
  }
});

/**
 * API endpoint để lấy webhook logs
 * GET /api/webhooks/logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, event_type, status } = req.query;

    let query = 'SELECT * FROM kiotviet_webhook_logs WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (event_type) {
      paramCount++;
      query += ` AND event_type = $${paramCount}`;
      params.push(event_type);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    paramCount++;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await db.pool.query(query, params);

    res.json({
      success: true,
      logs: result.rows
    });
  } catch (error) {
    console.error('[WEBHOOKS] Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get logs',
      error: error.message
    });
  }
});

module.exports = router;

