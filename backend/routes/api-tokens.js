const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Generate a secure API token
const generateToken = () => {
  return 'tcpf_' + crypto.randomBytes(32).toString('hex');
};

// Hash token for storage
const hashToken = async (token) => {
  return await bcrypt.hash(token, 10);
};

// Verify token
const verifyToken = async (token, hash) => {
  return await bcrypt.compare(token, hash);
};

// Get all API tokens for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.pool.query(
      `SELECT 
        id, 
        name, 
        token_hash,
        last_used_at, 
        expires_at, 
        is_active, 
        permissions,
        created_at, 
        updated_at,
        CASE 
          WHEN expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP THEN true
          ELSE false
        END as is_expired
      FROM api_tokens 
      WHERE user_id = $1 
      ORDER BY created_at DESC`,
      [userId]
    );

    // Don't return the actual token, only metadata
    const tokens = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      last_used_at: row.last_used_at,
      expires_at: row.expires_at,
      is_active: row.is_active,
      is_expired: row.is_expired,
      permissions: row.permissions || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Show partial token for identification (first 8 chars of hash)
      token_preview: row.token_hash.substring(0, 8) + '...'
    }));

    res.json({ tokens });
  } catch (error) {
    console.error('Get API tokens error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single API token
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const tokenId = req.params.id;

    const result = await db.pool.query(
      `SELECT 
        id, 
        name, 
        last_used_at, 
        expires_at, 
        is_active, 
        permissions,
        created_at, 
        updated_at,
        CASE 
          WHEN expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP THEN true
          ELSE false
        END as is_expired
      FROM api_tokens 
      WHERE id = $1 AND user_id = $2`,
      [tokenId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'API token not found' });
    }

    const token = result.rows[0];
    res.json({
      id: token.id,
      name: token.name,
      last_used_at: token.last_used_at,
      expires_at: token.expires_at,
      is_active: token.is_active,
      is_expired: token.is_expired,
      permissions: token.permissions || [],
      created_at: token.created_at,
      updated_at: token.updated_at
    });
  } catch (error) {
    console.error('Get API token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new API token
router.post('/', authenticate, [
  body('name').notEmpty().trim().withMessage('Token name is required'),
  body('expires_at').optional().isISO8601().withMessage('Invalid expiration date format'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { name, expires_at, permissions } = req.body;

    // Check database connection
    if (!db.pool) {
      console.error('Database pool not initialized');
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    // Generate token
    const token = generateToken();
    const tokenHash = await hashToken(token);

    // Parse expiration date if provided
    let expiresAt = null;
    if (expires_at) {
      expiresAt = new Date(expires_at);
      if (isNaN(expiresAt.getTime())) {
        return res.status(400).json({ message: 'Invalid expiration date' });
      }
    }

    // Validate permissions
    const validPermissions = [
      'products:read',
      'products:write',
      'orders:read',
      'orders:write',
      'customers:read',
      'customers:write',
      'shipments:read',
      'shipments:write',
      'reports:read'
    ];
    
    const tokenPermissions = permissions || [];
    const invalidPermissions = tokenPermissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return res.status(400).json({ 
        message: `Invalid permissions: ${invalidPermissions.join(', ')}` 
      });
    }

    // Insert token into database
    const result = await db.pool.query(
      `INSERT INTO api_tokens (user_id, name, token, token_hash, expires_at, permissions) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, expires_at, permissions, created_at`,
      [userId, name.trim(), token, tokenHash, expiresAt, JSON.stringify(tokenPermissions)]
    );

    // Return token only once (for security, it won't be returned again)
    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      token: token, // Only returned on creation
      expires_at: result.rows[0].expires_at,
      permissions: result.rows[0].permissions,
      created_at: result.rows[0].created_at,
      warning: 'Save this token now. You will not be able to see it again.'
    });
  } catch (error) {
    console.error('Create API token error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });

    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'Token already exists' });
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ message: 'Database connection failed' });
    }

    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update API token (name, permissions, expiration, active status)
router.put('/:id', authenticate, [
  body('name').optional().notEmpty().trim().withMessage('Token name cannot be empty'),
  body('expires_at').optional().isISO8601().withMessage('Invalid expiration date format'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const tokenId = req.params.id;
    const { name, expires_at, permissions, is_active } = req.body;

    // Check if token exists and belongs to user
    const existing = await db.pool.query(
      'SELECT id FROM api_tokens WHERE id = $1 AND user_id = $2',
      [tokenId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'API token not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name.trim());
    }

    if (expires_at !== undefined) {
      paramCount++;
      const expiresAt = expires_at ? new Date(expires_at) : null;
      if (expiresAt && isNaN(expiresAt.getTime())) {
        return res.status(400).json({ message: 'Invalid expiration date' });
      }
      updates.push(`expires_at = $${paramCount}`);
      values.push(expiresAt);
    }

    if (permissions !== undefined) {
      // Validate permissions
      const validPermissions = [
        'products:read',
        'products:write',
        'orders:read',
        'orders:write',
        'customers:read',
        'customers:write',
        'shipments:read',
        'shipments:write',
        'reports:read'
      ];
      
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({ 
          message: `Invalid permissions: ${invalidPermissions.join(', ')}` 
        });
      }

      paramCount++;
      updates.push(`permissions = $${paramCount}`);
      values.push(JSON.stringify(permissions));
    }

    if (is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    paramCount++;
    updates.push(`id = $${paramCount}`);
    values.push(tokenId);

    const query = `UPDATE api_tokens SET ${updates.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`;
    values.push(userId);

    const result = await db.pool.query(query, values);

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      expires_at: result.rows[0].expires_at,
      is_active: result.rows[0].is_active,
      permissions: result.rows[0].permissions || [],
      updated_at: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('Update API token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete API token
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const tokenId = req.params.id;

    const result = await db.pool.query(
      'DELETE FROM api_tokens WHERE id = $1 AND user_id = $2 RETURNING id',
      [tokenId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'API token not found' });
    }

    res.json({ message: 'API token deleted successfully' });
  } catch (error) {
    console.error('Delete API token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Revoke API token (set is_active to false)
router.post('/:id/revoke', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const tokenId = req.params.id;

    const result = await db.pool.query(
      'UPDATE api_tokens SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
      [tokenId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'API token not found' });
    }

    res.json({ 
      message: 'API token revoked successfully',
      token: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        is_active: result.rows[0].is_active
      }
    });
  } catch (error) {
    console.error('Revoke API token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reactivate API token
router.post('/:id/activate', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const tokenId = req.params.id;

    const result = await db.pool.query(
      'UPDATE api_tokens SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
      [tokenId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'API token not found' });
    }

    res.json({ 
      message: 'API token activated successfully',
      token: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        is_active: result.rows[0].is_active
      }
    });
  } catch (error) {
    console.error('Activate API token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

