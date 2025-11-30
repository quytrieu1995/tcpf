const express = require('express');
const { body, validationResult } = require('express-validator');
const kiotvietService = require('../services/kiotvietService');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get KiotViet configuration
router.get('/config', authenticate, async (req, res) => {
  try {
    const config = await kiotvietService.getConfig();
    if (!config) {
      return res.json({ configured: false });
    }

    // Don't return sensitive data
    res.json({
      configured: true,
      retailer_code: config.retailer_code,
      is_active: config.is_active,
      last_sync_at: config.last_sync_at,
      token_expires_at: config.token_expires_at,
      has_token: !!config.access_token
    });
  } catch (error) {
    console.error('Get KiotViet config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save/Update KiotViet configuration
router.post('/config', authenticate, [
  body('retailer_code').notEmpty().withMessage('Tên miền (Retailer Code) is required'),
  body('client_id').notEmpty().withMessage('Client ID is required'),
  body('client_secret').notEmpty().withMessage('Client Secret is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { retailer_code, client_id, client_secret } = req.body;

    // Test connection first
    const testResult = await kiotvietService.testConnection(retailer_code, client_id, client_secret);
    if (!testResult.success) {
      return res.status(400).json({ 
        message: 'Connection test failed',
        error: testResult.message 
      });
    }

    // Save configuration
    const config = await kiotvietService.saveConfig(retailer_code, client_id, client_secret);
    
    // Get access token
    await kiotvietService.getAccessToken(retailer_code, client_id, client_secret);

    res.json({
      message: 'KiotViet configuration saved successfully',
      configured: true,
      token_expires_at: testResult.token_expires_at
    });
  } catch (error) {
    console.error('Save KiotViet config error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error' 
    });
  }
});

// Test connection
router.post('/test-connection', authenticate, [
  body('retailer_code').notEmpty().withMessage('Tên miền (Retailer Code) is required'),
  body('client_id').notEmpty().withMessage('Client ID is required'),
  body('client_secret').notEmpty().withMessage('Client Secret is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { retailer_code, client_id, client_secret } = req.body;
    const result = await kiotvietService.testConnection(retailer_code, client_id, client_secret);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        token_expires_at: result.token_expires_at
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.message,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error' 
    });
  }
});

// Sync orders from KiotViet
router.post('/sync/orders', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, pageSize, pageNumber } = req.body;

    const result = await kiotvietService.syncOrders({
      startDate,
      endDate,
      pageSize: pageSize || 100,
      pageNumber: pageNumber || 1
    });

    res.json({
      message: 'Orders synced successfully',
      ...result
    });
  } catch (error) {
    console.error('Sync orders error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Failed to sync orders',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Sync customers from KiotViet
router.post('/sync/customers', authenticate, async (req, res) => {
  try {
    const { pageSize, pageNumber } = req.body;

    const result = await kiotvietService.syncCustomers({
      pageSize: pageSize || 100,
      pageNumber: pageNumber || 1
    });

    res.json({
      message: 'Customers synced successfully',
      ...result
    });
  } catch (error) {
    console.error('Sync customers error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Failed to sync customers',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get auto-sync status
router.get('/auto-sync/status', authenticate, async (req, res) => {
  try {
    const kiotvietSyncScheduler = require('../services/kiotvietSyncScheduler');
    const status = kiotvietSyncScheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Get auto-sync status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start auto-sync
router.post('/auto-sync/start', authenticate, async (req, res) => {
  try {
    const kiotvietSyncScheduler = require('../services/kiotvietSyncScheduler');
    kiotvietSyncScheduler.start();
    res.json({ message: 'Auto-sync started', status: kiotvietSyncScheduler.getStatus() });
  } catch (error) {
    console.error('Start auto-sync error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Stop auto-sync
router.post('/auto-sync/stop', authenticate, async (req, res) => {
  try {
    const kiotvietSyncScheduler = require('../services/kiotvietSyncScheduler');
    kiotvietSyncScheduler.stop();
    res.json({ message: 'Auto-sync stopped', status: kiotvietSyncScheduler.getStatus() });
  } catch (error) {
    console.error('Stop auto-sync error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sync logs
router.get('/sync-logs', authenticate, async (req, res) => {
  try {
    const db = require('../config/database');
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.pool.query(
      `SELECT * FROM kiotviet_sync_logs 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );

    const countResult = await db.pool.query('SELECT COUNT(*) FROM kiotviet_sync_logs');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get sync logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

