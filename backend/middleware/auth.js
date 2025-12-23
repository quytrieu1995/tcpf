const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

/**
 * Authenticate using JWT token (for web app users)
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Try JWT authentication first (for web app users)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
      req.user = decoded;
      req.authType = 'jwt';
      return next();
    } catch (jwtError) {
      // If JWT verification fails, try API token authentication
      // API tokens start with 'tcpf_'
      if (token.startsWith('tcpf_')) {
        return authenticateApiToken(req, res, next, token);
      }
      
      // If it's not an API token format, return JWT error
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Authenticate using API token (for external applications)
 */
const authenticateApiToken = async (req, res, next, token) => {
  try {
    if (!db.pool) {
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    // Get all active tokens and check if any matches
    const result = await db.pool.query(
      `SELECT 
        at.id,
        at.user_id,
        at.name,
        at.token_hash,
        at.expires_at,
        at.is_active,
        at.permissions,
        at.last_used_at,
        u.username,
        u.email,
        u.role
      FROM api_tokens at
      JOIN users u ON at.user_id = u.id
      WHERE at.is_active = true
      AND (at.expires_at IS NULL OR at.expires_at > CURRENT_TIMESTAMP)`
    );

    // Check each token hash
    for (const tokenRecord of result.rows) {
      const isValid = await bcrypt.compare(token, tokenRecord.token_hash);
      
      if (isValid) {
        // Update last_used_at
        await db.pool.query(
          'UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
          [tokenRecord.id]
        );

        // Set user info from token's user
        req.user = {
          id: tokenRecord.user_id,
          username: tokenRecord.username,
          email: tokenRecord.email,
          role: tokenRecord.role
        };
        req.authType = 'api_token';
        req.apiToken = {
          id: tokenRecord.id,
          name: tokenRecord.name,
          permissions: tokenRecord.permissions || []
        };
        
        return next();
      }
    }

    return res.status(401).json({ message: 'Invalid API token' });
  } catch (error) {
    console.error('API token authentication error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

/**
 * Optional authentication - allows both authenticated and unauthenticated requests
 */
const authenticateOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No auth header, continue without user
      req.user = null;
      req.authType = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      req.authType = null;
      return next();
    }

    // Try to authenticate, but don't fail if it doesn't work
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
      req.user = decoded;
      req.authType = 'jwt';
      return next();
    } catch (jwtError) {
      if (token.startsWith('tcpf_')) {
        try {
          await authenticateApiToken(req, res, next, token);
          return;
        } catch (apiError) {
          // Continue without auth
          req.user = null;
          req.authType = null;
          return next();
        }
      }
      
      // Continue without auth
      req.user = null;
      req.authType = null;
      return next();
    }
  } catch (error) {
    // Continue without auth on any error
    req.user = null;
    req.authType = null;
    return next();
  }
};

module.exports = { 
  authenticate,
  authenticateOptional
};

