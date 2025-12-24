const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./config/database');

dotenv.config();

const app = express();

// Middleware
// CORS configuration - allow multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://sale.thuanchay.vn',
  'https://www.sale.thuanchay.vn'
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      // In production, you might want to be stricter
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true); // Allow in development
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/promotions', require('./routes/promotions'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/purchase-orders', require('./routes/purchase-orders'));
app.use('/api/stock', require('./routes/stock-management'));
app.use('/api/debt', require('./routes/debt'));
app.use('/api/customer-groups', require('./routes/customer-groups'));
app.use('/api/price-policies', require('./routes/price-policies'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/address', require('./routes/address'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/print-settings', require('./routes/print-settings'));
app.use('/api/api-tokens', require('./routes/api-tokens'));
app.use('/api/reconciliation', require('./routes/reconciliation'));
app.use('/api/reconciliation-upload', require('./routes/reconciliation-upload'));
app.use('/api/profile', require('./routes/profile'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    let dbStatus = 'disconnected';
    if (db.pool) {
      try {
        await db.pool.query('SELECT NOW()');
        dbStatus = 'connected';
      } catch (error) {
        dbStatus = 'error';
        console.error('Health check DB error:', error.message);
      }
    }
    
    res.json({ 
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Server health check failed',
      timestamp: new Date().toISOString(),
      database: 'unknown'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sales Dashboard API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders'
    }
  });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  console.error('❌ Error stack:', err.stack);
  console.error('❌ Request details:', {
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  // Don't send error details in production
  const errorMessage = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Internal server error';
    
  // Ensure response is sent
  if (!res.headersSent) {
    res.status(err.status || 500).json({ 
      message: 'Something went wrong!', 
      error: errorMessage 
    });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
  console.error('❌ Stack:', reason?.stack);
  // Don't exit, log and continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Stack:', error.stack);
  // Log but don't exit immediately to prevent 502
  // In production, you might want to restart gracefully
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️  Server will continue running but may be unstable');
  } else {
    process.exit(1);
  }
});

const PORT = process.env.PORT || 5000;

// Initialize database and start server
db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Database connection established`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail
    });
    // Don't exit immediately, allow server to start but mark as degraded
    console.warn('⚠️  Starting server in degraded mode (database unavailable)');
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} (degraded mode)`);
      console.log('⚠️  Database connection failed - some features may not work');
    });
  });

module.exports = app;

