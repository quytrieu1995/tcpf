const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');

/**
 * Authenticate using JWT token (for web app users)
 */
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    req.user = decoded;
    req.authType = 'jwt';
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Authenticate using API key (client_id + key_secret or token)
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    // Check for API token in Authorization header
    const authHeader = req.headers.authorization;
    let apiKey = null;
    let clientId = null;
    let keySecret = null;

    if (authHeader) {
      // Format: Bearer <token> or ApiKey <token>
      const parts = authHeader.split(' ');
      if (parts.length === 2 && (parts[0] === 'Bearer' || parts[0] === 'ApiKey')) {
        apiKey = parts[1];
      }
    }

    // Check for client_id and key_secret in headers or query params
    if (!apiKey) {
      clientId = req.headers['x-client-id'] || req.query.client_id;
      keySecret = req.headers['x-key-secret'] || req.query.key_secret;
    }

    if (!apiKey && (!clientId || !keySecret)) {
      return res.status(401).json({ 
        message: 'API authentication required. Provide either API token or client_id + key_secret' 
      });
    }

    let apiKeyRecord = null;

    if (apiKey) {
      // Authenticate using token
      const result = await db.pool.query(
        'SELECT * FROM api_keys WHERE token = $1 AND is_active = true',
        [apiKey]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid API token' });
      }

      apiKeyRecord = result.rows[0];

      // Check if token is expired
      if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
        return res.status(401).json({ message: 'API token has expired' });
      }

      // Update last_used_at
      await db.pool.query(
        'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [apiKeyRecord.id]
      );
    } else {
      // Authenticate using client_id + key_secret
      const result = await db.pool.query(
        'SELECT * FROM api_keys WHERE client_id = $1 AND is_active = true',
        [clientId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid client_id' });
      }

      apiKeyRecord = result.rows[0];

      // Verify key_secret (compare hashed)
      const hashedSecret = crypto
        .createHash('sha256')
        .update(keySecret)
        .digest('hex');

      if (apiKeyRecord.key_secret !== hashedSecret) {
        return res.status(401).json({ message: 'Invalid key_secret' });
      }

      // Check if expired
      if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
        return res.status(401).json({ message: 'API key has expired' });
      }

      // Update last_used_at
      await db.pool.query(
        'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [apiKeyRecord.id]
      );
    }

    // Attach API key info to request
    req.apiKey = apiKeyRecord;
    req.user = {
      id: apiKeyRecord.created_by,
      type: 'api_key',
      api_key_id: apiKeyRecord.id
    };
    req.authType = 'api_key';
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

/**
 * Authenticate using either JWT or API key (flexible authentication)
 */
const authenticateOptional = async (req, res, next) => {
  try {
    // Try JWT first
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
        req.user = decoded;
        req.authType = 'jwt';
        return next();
      } catch (error) {
        // JWT failed, try API key
      }
    }

    // Try API key
    await authenticateApiKey(req, res, next);
  } catch (error) {
    return res.status(401).json({ message: 'Authentication required' });
  }
};

module.exports = { 
  authenticate, 
  authenticateApiKey, 
  authenticateOptional 
};

