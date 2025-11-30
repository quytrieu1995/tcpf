const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    console.log('[LOGIN] Attempt:', {
      username,
      passwordLength: password?.length || 0,
      timestamp: new Date().toISOString()
    });

    const result = await db.pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log('[LOGIN] User not found:', { username });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('[LOGIN] User found:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      passwordHashPrefix: user.password ? user.password.substring(0, 20) + '...' : 'NULL',
      passwordHashLength: user.password?.length || 0
    });

    // Check if user is active
    if (user.is_active === false) {
      console.log('[LOGIN] User account is inactive:', { username, userId: user.id });
      return res.status(401).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
    }

    // Trim password before comparing
    const trimmedPassword = password.trim();
    console.log('[LOGIN] Password comparison:', {
      originalLength: password?.length || 0,
      trimmedLength: trimmedPassword.length,
      hasWhitespace: password !== trimmedPassword,
      storedHashPrefix: user.password ? user.password.substring(0, 20) + '...' : 'NULL'
    });

    const isValidPassword = await bcrypt.compare(trimmedPassword, user.password);
    console.log('[LOGIN] Password comparison result:', {
      isValid: isValidPassword,
      username
    });

    if (!isValidPassword) {
      console.log('[LOGIN] Invalid password for user:', { username, userId: user.id });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('[LOGIN] Login successful:', {
      userId: user.id,
      username: user.username,
      role: user.role
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[LOGIN] Login error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    
    // Check if it's a database connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.includes('connect')) {
      return res.status(503).json({ 
        message: 'Database connection failed. Please try again later.',
        error: 'DATABASE_ERROR'
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Change password (user changes their own password)
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // From authenticate middleware

    console.log('[CHANGE PASSWORD] Request received:', {
      userId,
      currentPasswordLength: currentPassword?.length || 0,
      newPasswordLength: newPassword?.length || 0
    });

    // Get user from database
    const result = await db.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      console.log('[CHANGE PASSWORD] User not found:', { userId });
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    console.log('[CHANGE PASSWORD] User found:', {
      id: user.id,
      username: user.username,
      storedHashPrefix: user.password ? user.password.substring(0, 20) + '...' : 'NULL'
    });

    // Verify current password
    const trimmedCurrentPassword = currentPassword.trim();
    const isValidPassword = await bcrypt.compare(trimmedCurrentPassword, user.password);
    console.log('[CHANGE PASSWORD] Current password verification:', {
      isValid: isValidPassword,
      currentPasswordLength: trimmedCurrentPassword.length
    });

    if (!isValidPassword) {
      console.log('[CHANGE PASSWORD] Current password incorrect:', { userId, username: user.username });
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const trimmedNewPassword = newPassword.trim();
    const hashedPassword = await bcrypt.hash(trimmedNewPassword, 10);
    console.log('[CHANGE PASSWORD] New password hashed:', {
      newPasswordLength: trimmedNewPassword.length,
      hashPrefix: hashedPassword.substring(0, 20) + '...',
      hashLength: hashedPassword.length
    });

    // Update password
    await db.pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user.id]
    );

    console.log('[CHANGE PASSWORD] Password updated successfully:', {
      userId: user.id,
      username: user.username
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

