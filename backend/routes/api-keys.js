const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

/**
 * Generate a secure random string
 */
function generateSecureString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate client_id and key_secret
 */
function generateApiKey() {
  const clientId = `client_${generateSecureString(16)}`;
  const keySecret = generateSecureString(32);
  return { clientId, keySecret };
}

/**
 * Hash key_secret for storage
 */
function hashKeySecret(keySecret) {
  return crypto.createHash('sha256').update(keySecret).digest('hex');
}

/**
 * Generate API token from client_id and key_secret
 */
function generateToken(clientId, keySecret) {
  const payload = `${clientId}:${keySecret}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Get all API keys (only for authenticated users)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, is_active } = req.query;
    
    let query = 'SELECT id, client_id, name, description, is_active, last_used_at, expires_at, created_at, updated_at FROM api_keys WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await db.pool.query(query, params);
    const countResult = await db.pool.query('SELECT COUNT(*) FROM api_keys');
    
    res.json({
      api_keys: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single API key
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(
      'SELECT id, client_id, name, description, is_active, last_used_at, expires_at, created_at, updated_at FROM api_keys WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'API key not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new API key
router.post('/', authenticate, [
  body('name').optional().trim(),
  body('description').optional().trim(),
  body('expires_at').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, expires_at } = req.body;
    const user = req.user;

    // Generate client_id and key_secret
    const { clientId, keySecret } = generateApiKey();
    const hashedKeySecret = hashKeySecret(keySecret);
    
    // Generate token
    const token = generateToken(clientId, keySecret);

    // Insert into database
    const result = await db.pool.query(
      `INSERT INTO api_keys (client_id, key_secret, token, name, description, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, client_id, name, description, is_active, expires_at, created_at`,
      [
        clientId,
        hashedKeySecret,
        token,
        name || `API Key ${new Date().toISOString().split('T')[0]}`,
        description || null,
        expires_at || null,
        user.id
      ]
    );

    // Return API key with unhashed key_secret (only shown once)
    res.status(201).json({
      id: result.rows[0].id,
      client_id: clientId,
      key_secret: keySecret, // Only shown once!
      token: token,
      name: result.rows[0].name,
      description: result.rows[0].description,
      expires_at: result.rows[0].expires_at,
      created_at: result.rows[0].created_at,
      warning: '⚠️ Save key_secret now! It will not be shown again.'
    });
  } catch (error) {
    console.error('Create API key error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'Client ID already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate token from client_id and key_secret
router.post('/generate-token', [
  body('client_id').notEmpty().withMessage('client_id is required'),
  body('key_secret').notEmpty().withMessage('key_secret is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { client_id, key_secret } = req.body;

    // Verify client_id and key_secret
    const result = await db.pool.query(
      'SELECT * FROM api_keys WHERE client_id = $1 AND is_active = true',
      [client_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid client_id' });
    }

    const apiKey = result.rows[0];
    const hashedSecret = hashKeySecret(key_secret);

    if (apiKey.key_secret !== hashedSecret) {
      return res.status(401).json({ message: 'Invalid key_secret' });
    }

    // Check if expired
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return res.status(401).json({ message: 'API key has expired' });
    }

    // Generate or get existing token
    let token = apiKey.token;
    if (!token) {
      token = generateToken(client_id, key_secret);
      await db.pool.query(
        'UPDATE api_keys SET token = $1 WHERE id = $2',
        [token, apiKey.id]
      );
    }

    res.json({
      success: true,
      token: token,
      client_id: client_id,
      expires_at: apiKey.expires_at
    });
  } catch (error) {
    console.error('Generate token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update API key
router.put('/:id', authenticate, [
  body('name').optional().trim(),
  body('description').optional().trim(),
  body('is_active').optional().isBoolean(),
  body('expires_at').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, is_active, expires_at } = req.body;
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }

    if (is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      params.push(is_active);
    }

    if (expires_at !== undefined) {
      paramCount++;
      updates.push(`expires_at = $${paramCount}`);
      params.push(expires_at);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.params.id);

    const query = `UPDATE api_keys SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, client_id, name, description, is_active, expires_at, updated_at`;

    const result = await db.pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'API key not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete/Revoke API key
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(
      'DELETE FROM api_keys WHERE id = $1 RETURNING id, client_id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'API key not found' });
    }

    res.json({ 
      message: 'API key revoked successfully',
      client_id: result.rows[0].client_id
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Revoke API key (set is_active to false)
router.patch('/:id/revoke', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(
      'UPDATE api_keys SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, client_id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'API key not found' });
    }

    res.json({ 
      message: 'API key revoked successfully',
      client_id: result.rows[0].client_id
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reactivate API key
router.patch('/:id/activate', authenticate, async (req, res) => {
  try {
    const result = await db.pool.query(
      'UPDATE api_keys SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, client_id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'API key not found' });
    }

    res.json({ 
      message: 'API key activated successfully',
      client_id: result.rows[0].client_id
    });
  } catch (error) {
    console.error('Activate API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

