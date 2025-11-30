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
    const userId = req.params.id;
    console.log('[DELETE USER] Request received:', { userId, requestedBy: req.user.id });

    // Get user info
    const userResult = await db.pool.query('SELECT id, username, role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.log('[DELETE USER] User not found:', { userId });
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    console.log('[DELETE USER] User found:', { id: user.id, username: user.username, role: user.role });

    // Prevent deleting admin users
    if (user.role === 'admin') {
      console.log('[DELETE USER] Attempt to delete admin user blocked:', { userId, username: user.username });
      return res.status(400).json({ message: 'Cannot delete admin user' });
    }

    // Check if user is being used in orders (seller_id)
    const ordersCheck = await db.pool.query('SELECT COUNT(*) as count FROM orders WHERE seller_id = $1', [userId]);
    const ordersCount = parseInt(ordersCheck.rows[0].count);
    console.log('[DELETE USER] Orders check:', { userId, ordersCount });

    if (ordersCount > 0) {
      console.log('[DELETE USER] User has associated orders, cannot delete:', { userId, ordersCount });
      return res.status(400).json({ 
        message: `Cannot delete user. User has ${ordersCount} associated order(s). Please reassign orders first.` 
      });
    }

    // Check if user is being used in purchase orders
    const purchaseOrdersCheck = await db.pool.query('SELECT COUNT(*) as count FROM purchase_orders WHERE created_by = $1 OR approved_by = $1', [userId]);
    const purchaseOrdersCount = parseInt(purchaseOrdersCheck.rows[0].count);
    console.log('[DELETE USER] Purchase orders check:', { userId, purchaseOrdersCount });

    if (purchaseOrdersCount > 0) {
      console.log('[DELETE USER] User has associated purchase orders, cannot delete:', { userId, purchaseOrdersCount });
      return res.status(400).json({ 
        message: `Cannot delete user. User has ${purchaseOrdersCount} associated purchase order(s).` 
      });
    }

    // Delete user
    const result = await db.pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username', [userId]);
    
    if (result.rows.length === 0) {
      console.log('[DELETE USER] User was not deleted (no rows returned):', { userId });
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('[DELETE USER] User deleted successfully:', { 
      id: result.rows[0].id, 
      username: result.rows[0].username 
    });

    res.json({ 
      message: 'User deleted successfully',
      deletedUser: result.rows[0]
    });
  } catch (error) {
    console.error('[DELETE USER] Error:', error);
    console.error('[DELETE USER] Error details:', {
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail
    });

    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({ 
        message: 'Cannot delete user. User is referenced in other records. Please remove all references first.' 
      });
    }

    res.status(500).json({ 
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

