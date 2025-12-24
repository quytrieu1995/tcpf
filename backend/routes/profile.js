const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(
      `SELECT id, username, email, role, full_name, phone, date_of_birth, 
              address, avatar_url, is_active, permissions, created_at, last_login
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/me', authenticate, [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('full_name').optional().isLength({ max: 255 }).withMessage('Full name too long'),
  body('phone').optional().isLength({ max: 20 }).withMessage('Phone number too long'),
  body('date_of_birth').optional().isISO8601().withMessage('Invalid date format'),
  body('address').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, full_name, phone, date_of_birth, address, avatar_url } = req.body;
    const userId = req.user.id;

    // Check if email already exists (excluding current user)
    if (email) {
      const existingUser = await db.pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const updateFields = [];
    const params = [];
    let paramCount = 0;

    if (email !== undefined) {
      paramCount++;
      updateFields.push(`email = $${paramCount}`);
      params.push(email);
    }

    if (full_name !== undefined) {
      paramCount++;
      updateFields.push(`full_name = $${paramCount}`);
      params.push(full_name || null);
    }

    if (phone !== undefined) {
      paramCount++;
      updateFields.push(`phone = $${paramCount}`);
      params.push(phone || null);
    }

    if (date_of_birth !== undefined) {
      paramCount++;
      updateFields.push(`date_of_birth = $${paramCount}`);
      params.push(date_of_birth || null);
    }

    if (address !== undefined) {
      paramCount++;
      updateFields.push(`address = $${paramCount}`);
      params.push(address || null);
    }

    if (avatar_url !== undefined) {
      paramCount++;
      updateFields.push(`avatar_url = $${paramCount}`);
      params.push(avatar_url || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    paramCount++;
    params.push(userId);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} 
                   RETURNING id, username, email, role, full_name, phone, date_of_birth, address, avatar_url, is_active, permissions, created_at, last_login`;
    
    const result = await db.pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/me/password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user from database
    const result = await db.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword.trim(), user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    // Update password
    await db.pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

