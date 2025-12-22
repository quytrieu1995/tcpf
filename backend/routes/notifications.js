const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.pool.query(
      `SELECT 
        id,
        type,
        title,
        message,
        is_read,
        link,
        metadata,
        created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    // Get unread count
    const unreadResult = await db.pool.query(
      `SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadResult.rows[0].count),
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    // Verify notification belongs to user
    const checkResult = await db.pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await db.pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1',
      [notificationId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    await db.pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    // Verify notification belongs to user
    const checkResult = await db.pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await db.pool.query(
      'DELETE FROM notifications WHERE id = $1',
      [notificationId]
    );

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
});

// Create notification (for system use, can be called by admin or system)
router.post('/', authenticate, async (req, res) => {
  try {
    const { user_id, type, title, message, link, metadata } = req.body;
    const userId = user_id || req.user.id; // Allow admin to create for other users

    // Only allow creating for other users if current user is admin
    if (user_id && user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    if (!type || !title || !message) {
      return res.status(400).json({ message: 'Type, title, and message are required' });
    }

    const result = await db.pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [userId, type, title, message, link || null, metadata ? JSON.stringify(metadata) : null]
    );

    res.status(201).json({ notification: result.rows[0] });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
});

module.exports = router;

