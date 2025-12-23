const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get print settings
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(
      'SELECT * FROM print_settings WHERE user_id = $1 OR user_id IS NULL ORDER BY user_id DESC LIMIT 1',
      [req.user.id]
    );

    if (result.rows.length > 0) {
      const settings = result.rows[0];
      res.json({
        invoice: settings.invoice_settings || {},
        shipping: settings.shipping_settings || {}
      });
    } else {
      // Return default settings
      res.json({
        invoice: {},
        shipping: {}
      });
    }
  } catch (error) {
    console.error('Get print settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save print settings
router.post('/', authenticate, async (req, res) => {
  try {
    const { invoice, shipping } = req.body;
    const userId = req.user.id;

    // Check if settings exist
    const existing = await db.pool.query(
      'SELECT id FROM print_settings WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await db.pool.query(
        `UPDATE print_settings 
         SET invoice_settings = $1, shipping_settings = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3`,
        [JSON.stringify(invoice || {}), JSON.stringify(shipping || {}), userId]
      );
    } else {
      // Create new
      await db.pool.query(
        `INSERT INTO print_settings (user_id, invoice_settings, shipping_settings)
         VALUES ($1, $2, $3)`,
        [userId, JSON.stringify(invoice || {}), JSON.stringify(shipping || {})]
      );
    }

    res.json({ message: 'Print settings saved successfully' });
  } catch (error) {
    console.error('Save print settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

