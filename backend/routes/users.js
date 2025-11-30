const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all users
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(
      'SELECT id, username, email, role, full_name, phone, is_active, permissions, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single user
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(
      'SELECT id, username, email, role, full_name, phone, is_active, permissions, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user
router.post('/', authenticate, [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'manager', 'staff']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role, full_name, phone, is_active, permissions } = req.body;

    console.log('[CREATE USER] Request received:', {
      username,
      email,
      passwordLength: password?.length || 0,
      role,
      is_active: is_active !== false
    });

    // Check if username or email already exists
    const existingUser = await db.pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      console.log('[CREATE USER] User already exists:', { username, email });
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Trim and validate password
    const trimmedPassword = password.trim();
    console.log('[CREATE USER] Password validation:', {
      originalLength: password?.length || 0,
      trimmedLength: trimmedPassword.length,
      hasWhitespace: password !== trimmedPassword
    });

    if (trimmedPassword.length < 6) {
      console.log('[CREATE USER] Password too short:', { length: trimmedPassword.length });
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    console.log('[CREATE USER] Password hashed:', {
      hashPrefix: hashedPassword.substring(0, 20) + '...',
      hashLength: hashedPassword.length
    });

    const finalIsActive = is_active !== false;
    const result = await db.pool.query(
      `INSERT INTO users (username, email, password, role, full_name, phone, is_active, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, email, role, full_name, phone, is_active, permissions, created_at`,
      [username, email, hashedPassword, role, full_name, phone, finalIsActive, JSON.stringify(permissions || [])]
    );

    const createdUser = result.rows[0];
    console.log('[CREATE USER] User created successfully:', {
      id: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      role: createdUser.role,
      is_active: createdUser.is_active
    });

    res.status(201).json(createdUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticate, [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['admin', 'manager', 'staff']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, role, full_name, phone, is_active, permissions, password } = req.body;

    // Check if email already exists (excluding current user)
    if (email) {
      const existingUser = await db.pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.params.id]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    let query = 'UPDATE users SET';
    const params = [];
    let paramCount = 0;

    if (email) {
      paramCount++;
      query += ` email = $${paramCount}`;
      params.push(email);
    }

    if (role) {
      paramCount++;
      query += `${paramCount > 1 ? ',' : ''} role = $${paramCount}`;
      params.push(role);
    }

    if (full_name !== undefined) {
      paramCount++;
      query += `${paramCount > 1 ? ',' : ''} full_name = $${paramCount}`;
      params.push(full_name);
    }

    if (phone !== undefined) {
      paramCount++;
      query += `${paramCount > 1 ? ',' : ''} phone = $${paramCount}`;
      params.push(phone);
    }

    if (is_active !== undefined) {
      paramCount++;
      query += `${paramCount > 1 ? ',' : ''} is_active = $${paramCount}`;
      params.push(is_active);
    }

    if (permissions !== undefined) {
      paramCount++;
      query += `${paramCount > 1 ? ',' : ''} permissions = $${paramCount}`;
      params.push(JSON.stringify(permissions));
    }

    if (password && password.trim() !== '') {
      // Validate password length
      const trimmedPassword = password.trim();
      console.log('[UPDATE USER] Password update requested:', {
        userId: req.params.id,
        originalLength: password.length,
        trimmedLength: trimmedPassword.length,
        hasWhitespace: password !== trimmedPassword
      });

      if (trimmedPassword.length < 6) {
        console.log('[UPDATE USER] Password too short:', { length: trimmedPassword.length, userId: req.params.id });
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
      console.log('[UPDATE USER] Password hashed:', {
        userId: req.params.id,
        hashPrefix: hashedPassword.substring(0, 20) + '...',
        hashLength: hashedPassword.length
      });
      paramCount++;
      query += `${paramCount > 1 ? ',' : ''} password = $${paramCount}`;
      params.push(hashedPassword);
    }

    // Ensure at least one field is being updated
    if (paramCount === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    query += ` WHERE id = $${paramCount} RETURNING id, username, email, role, full_name, phone, is_active, permissions, created_at`;
    params.push(req.params.id);

    const result = await db.pool.query(query, params);

    if (result.rows.length === 0) {
      console.log('[UPDATE USER] User not found:', { userId: req.params.id });
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = result.rows[0];
    console.log('[UPDATE USER] User updated successfully:', {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      is_active: updatedUser.is_active,
      passwordUpdated: password && password.trim() !== ''
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Prevent deleting admin users
    const user = await db.pool.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.rows[0].role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin user' });
    }

    const result = await db.pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

