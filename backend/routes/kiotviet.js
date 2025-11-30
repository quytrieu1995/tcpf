const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Lazy load service to avoid initialization issues
let kiotvietService = null;
function getKiotVietService() {
  if (!kiotvietService) {
    try {
      kiotvietService = require('../services/kiotvietService');
    } catch (error) {
      console.error('[KIOTVIET ROUTES] Failed to load service:', error.message);
      console.error('[KIOTVIET ROUTES] Error stack:', error.stack?.substring(0, 300));
      throw error;
    }
  }
  return kiotvietService;
}

// Get KiotViet configuration
router.get('/config', authenticate, async (req, res) => {
  try {
    const service = getKiotVietService();
    const config = await service.getConfig();
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

    console.log('[KIOTVIET CONFIG] Saving configuration:', {
      retailer_code,
      client_id: client_id?.substring(0, 10) + '...',
      has_secret: !!client_secret
    });

    const service = getKiotVietService();

    // Test connection first
    let testResult;
    try {
      testResult = await service.testConnection(retailer_code, client_id, client_secret);
      if (!testResult.success) {
        return res.status(400).json({ 
          message: 'Connection test failed',
          error: testResult.message,
          details: testResult.details
        });
      }
    } catch (testError) {
      console.error('[KIOTVIET CONFIG] Test connection error:', testError);
      return res.status(400).json({ 
        message: 'Connection test failed',
        error: testError.message || 'Cannot connect to KiotViet API',
        details: process.env.NODE_ENV === 'development' ? testError.stack : undefined
      });
    }

    // Save configuration
    let config;
    try {
      config = await service.saveConfig(retailer_code, client_id, client_secret);
      console.log('[KIOTVIET CONFIG] Configuration saved:', { configId: config.id });
    } catch (saveError) {
      console.error('[KIOTVIET CONFIG] Save config error:', saveError);
      return res.status(500).json({ 
        message: 'Failed to save configuration',
        error: saveError.message,
        details: process.env.NODE_ENV === 'development' ? saveError.stack : undefined
      });
    }
    
    // Get access token and save it
    try {
      const tokenData = await service.getAccessToken(retailer_code, client_id, client_secret);
      console.log('[KIOTVIET CONFIG] Access token obtained:', {
        hasToken: !!tokenData.access_token,
        expiresAt: tokenData.expires_at
      });
    } catch (tokenError) {
      console.error('[KIOTVIET CONFIG] Get token error:', tokenError);
      // Config is saved but token failed - still return success but warn
      return res.status(200).json({
        message: 'Configuration saved but failed to get access token. Please try again.',
        configured: true,
        warning: tokenError.message,
        token_expires_at: testResult.token_expires_at
      });
    }

    res.json({
      message: 'KiotViet configuration saved successfully',
      configured: true,
      token_expires_at: testResult.token_expires_at
    });
  } catch (error) {
    console.error('[KIOTVIET CONFIG] Unexpected error:', error);
    console.error('[KIOTVIET CONFIG] Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    
    console.log('[KIOTVIET TEST] Testing connection:', {
      retailer_code,
      client_id: client_id?.substring(0, 10) + '...',
      has_secret: !!client_secret
    });

    // Get service with error handling
    let service;
    try {
      service = getKiotVietService();
    } catch (serviceError) {
      console.error('[KIOTVIET TEST] Failed to load service:', serviceError);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to initialize KiotViet service',
        error: serviceError.message,
        details: process.env.NODE_ENV === 'development' ? serviceError.stack : undefined
      });
    }

    // Call testConnection - it should always return a result object, not throw
    let result;
    try {
      result = await service.testConnection(retailer_code, client_id, client_secret);
      
      // Ensure result is an object with success property
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from testConnection');
      }
    } catch (testError) {
      // If testConnection throws (shouldn't happen, but handle it)
      console.error('[KIOTVIET TEST] testConnection threw error:', testError);
      return res.status(500).json({
        success: false,
        message: testError.message || 'Connection test failed',
        error: testError.message,
        details: process.env.NODE_ENV === 'development' ? testError.stack : undefined
      });
    }

    // Return result based on success status
    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Connection successful',
        token_expires_at: result.token_expires_at
      });
    } else {
      // Return 200 with success: false for connection failures (not server errors)
      res.status(200).json({
        success: false,
        message: result.message || 'Connection test failed',
        error: result.message,
        details: result.details
      });
    }
  } catch (error) {
    console.error('[KIOTVIET TEST] Unexpected error:', error);
    console.error('[KIOTVIET TEST] Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Sync orders from KiotViet
router.post('/sync/orders', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, pageSize, pageNumber } = req.body;

    const service = getKiotVietService();
    const result = await service.syncOrders({
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

    // Get service with error handling
    let service;
    try {
      service = getKiotVietService();
    } catch (serviceError) {
      console.error('[KIOTVIET SYNC CUSTOMERS] Failed to load service:', serviceError);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to initialize KiotViet service',
        error: serviceError.message,
        details: process.env.NODE_ENV === 'development' ? serviceError.stack : undefined
      });
    }

    let result;
    try {
      result = await service.syncCustomers({
        pageSize: pageSize || 100,
        pageNumber: pageNumber || 1
      });
    } catch (syncError) {
      console.error('[KIOTVIET SYNC CUSTOMERS] Sync error:', syncError);
      console.error('[KIOTVIET SYNC CUSTOMERS] Error stack:', syncError.stack);
      return res.status(500).json({ 
        success: false,
        message: syncError.message || 'Failed to sync customers',
        error: syncError.message,
        details: process.env.NODE_ENV === 'development' ? syncError.stack : undefined
      });
    }

    res.json({
      success: true,
      message: 'Customers synced successfully',
      ...result
    });
  } catch (error) {
    console.error('[KIOTVIET SYNC CUSTOMERS] Unexpected error:', error);
    console.error('[KIOTVIET SYNC CUSTOMERS] Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to sync customers',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get auto-sync status
router.get('/auto-sync/status', authenticate, async (req, res) => {
  try {
    let kiotvietSyncScheduler;
    try {
      kiotvietSyncScheduler = require('../services/kiotvietSyncScheduler');
    } catch (requireError) {
      console.error('[KIOTVIET] Failed to require scheduler:', requireError.message);
      return res.json({
        isRunning: false,
        isSyncing: false,
        lastSyncTime: null,
        error: 'Scheduler not available'
      });
    }
    
    const status = kiotvietSyncScheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('[KIOTVIET] Get auto-sync status error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Start auto-sync
router.post('/auto-sync/start', authenticate, async (req, res) => {
  try {
    let kiotvietSyncScheduler;
    try {
      kiotvietSyncScheduler = require('../services/kiotvietSyncScheduler');
    } catch (requireError) {
      console.error('[KIOTVIET] Failed to require scheduler:', requireError.message);
      return res.status(500).json({ 
        message: 'Scheduler not available',
        error: requireError.message
      });
    }
    
    kiotvietSyncScheduler.start();
    res.json({ message: 'Auto-sync started', status: kiotvietSyncScheduler.getStatus() });
  } catch (error) {
    console.error('[KIOTVIET] Start auto-sync error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Stop auto-sync
router.post('/auto-sync/stop', authenticate, async (req, res) => {
  try {
    let kiotvietSyncScheduler;
    try {
      kiotvietSyncScheduler = require('../services/kiotvietSyncScheduler');
    } catch (requireError) {
      console.error('[KIOTVIET] Failed to require scheduler:', requireError.message);
      return res.status(500).json({ 
        message: 'Scheduler not available',
        error: requireError.message
      });
    }
    
    kiotvietSyncScheduler.stop();
    res.json({ message: 'Auto-sync stopped', status: kiotvietSyncScheduler.getStatus() });
  } catch (error) {
    console.error('[KIOTVIET] Stop auto-sync error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
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

