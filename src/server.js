const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
const { ErrorHandler } = require('./utils/errors');

// Import routes
const eventsRoutes = require('./modules/events/events.routes');
const guestsRoutes = require('./modules/guests/guests.routes');
const ticketsRoutes = require('./modules/tickets/tickets.routes');
const marketplaceRoutes = require('./modules/marketplace/marketplace.routes');
const adminRoutes = require('./modules/admin/admin.routes');

// Import database migrator
const migrator = require('./database/migrator');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    errorId: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const error = ErrorHandler.handleRateLimit(req);
    ErrorHandler.logError(error, req);
    res.status(429).json(error.toJSON());
  }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: config.corsOrigin || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging middleware
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Event Planner Core API',
    version: '1.0.0',
    description: 'Backend API for Event Planner Core platform',
    endpoints: {
      events: '/api/events',
      guests: '/api/guests',
      tickets: '/api/tickets',
      marketplace: '/api/marketplace',
      admin: '/api/admin'
    },
    documentation: '/api/docs',
    health: '/health'
  });
});

// API routes
app.use('/api/events', eventsRoutes);
app.use('/api/guests', guestsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use(ErrorHandler.notFoundHandler);

// Global error handler
app.use(ErrorHandler.globalHandler);

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
  
  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connections
    // This would be implemented based on your database connection setup
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  ErrorHandler.logError(error, { method: 'UNCAUGHT_EXCEPTION', url: 'N/A' });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  ErrorHandler.logError(reason, { method: 'UNHANDLED_REJECTION', url: 'N/A' });
  process.exit(1);
});

// Start server function
async function startServer() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Run database migrations
    const migrationResult = await migrator.migrate();
    
    if (migrationResult.executed > 0) {
      console.log(`✅ Successfully executed ${migrationResult.executed} migrations`);
    } else {
      console.log('✅ Database is up to date');
    }

    console.log('🚀 Starting Event Planner Core server...');
    
    const PORT = config.port || 3001;
    const HOST = '0.0.0.0';
    
    server = app.listen(PORT, HOST, () => {
      console.log(`🎉 Server is running on ${HOST}:${PORT}`);
      console.log(`📚 API documentation: http://${HOST}:${PORT}/api`);
      console.log(`💚 Health check: http://${HOST}:${PORT}/health`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    ErrorHandler.logError(error, { method: 'SERVER_STARTUP', url: 'N/A' });
    process.exit(1);
  }
}

// Start the server
let server;
startServer();

module.exports = app;
