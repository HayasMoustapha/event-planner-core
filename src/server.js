const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');

const config = require('./config');
const bootstrap = require('./bootstrap');
const { specs, swaggerUi } = require('./config/swagger');
const UnifiedJWTSecret = require('../../shared/config/unified-jwt-secret');

// ========================================
// SYSTÈME PARTAGÉ CENTRALISÉ (NOUVEAU)
// ========================================
const { 
  middlewares: sharedMiddlewares,
  configureService,
  log,
  ERROR_CODES,
  createError,
  success,
  error,
  notFound,
  healthCheck,
  metrics
} = require('../../shared');

// CONFIGURATION JWT UNIFIÉ - ÉTAPE CRUCIALE
UnifiedJWTSecret.configureService('event-planner-core');

// Configuration du service avec système partagé
const serviceConfig = configureService('event-planner-core', {
  enableErrorHandling: true,
  enableResponseHandling: true,
  customizations: {
    serviceName: 'Event Planner Core',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  }
});

// Import routes
const eventsRoutes = require('./modules/events/events.routes');
const guestsRoutes = require('./modules/guests/guests.routes');
const ticketsRoutes = require('./modules/tickets/tickets.routes');
const invitationsRoutes = require('./modules/invitations/invitations.routes');
const marketplaceRoutes = require('./modules/marketplace/marketplace.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const ticketGenerationRoutes = require('./routes/ticket-generation-routes');

// Service de communication Redis Queue pour la communication asynchrone
const eventQueueService = require('./core/queue/event-queue.service');

// Service de génération de tickets (consommateur de résultats)
const { startTicketGenerationResultConsumer } = require('./queues/ticket-generation-service');

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
    // Utilisation du système partagé pour le rate limiting
    log('warn', 'Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    return res.apiRateLimitExceeded({
      limit: limiter.max,
      windowMs: limiter.windowMs,
      retryAfter: Math.ceil(limiter.windowMs / 1000)
    });
  }
});

app.use(limiter);

// ========================================
// MIDDLEWARES SYSTÈME PARTAGÉ (REMPLACE LES LOCAUX)
// ========================================
// Application des middlewares du système partagé
app.use(sharedMiddlewares);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware pour tracking
app.use((req, res, next) => {
  req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  
  // Log avec système partagé
  log('info', 'Request started', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next();
});

// Sécurité contre les injections NoSQL - CORRECTION : désactiver mongoSanitize défectueux
// TODO: Remplacer par une solution plus stable comme mongo-express-sanitize
// this.app.use(mongoSanitize());

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

// ========================================
// 📊 MIDDLEWARE DE BASE DE DONNÉES
// Ajoute la connexion à la base de données à chaque requête
// ========================================
app.use((req, res, next) => {
  req.db = require('./config/database');
  next();
});

// JWT Authentication middleware - Pour les routes protégées
const jwt = require('jsonwebtoken');
app.use((req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token invalide, mais on continue sans utilisateur
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// METRICS AVEC SYSTÈME PARTAGÉ
// ========================================
app.get('/metrics', (req, res) => {
  try {
    // Metrics Prometheus avec système partagé
    const metricsData = generatePrometheusMetrics();
    return metrics(res, metricsData, 'prometheus');
  } catch (err) {
    log('error', 'Metrics generation failed', { error: err.message });
    return res.apiInternalError({
      message: 'Failed to generate metrics',
      details: err.message
    });
  }
});

// ========================================
// FONCTIONS UTILITAIRES HEALTH CHECK
// ========================================
async function checkDatabaseHealth() {
  try {
    const database = require('./config/database');
    const client = await database.pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    return {
      status: 'healthy',
      responseTime: '< 100ms',
      connections: {
        total: database.pool.totalCount,
        idle: database.pool.idleCount,
        waiting: database.pool.waitingCount
      }
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err.message
    };
  }
}

async function checkRedisHealth() {
  try {
    const eventQueueService = require('./core/queue/event-queue.service');
    const stats = await eventQueueService.getQueueStats();
    
    return {
      status: 'healthy',
      queues: stats
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err.message
    };
  }
}

async function checkQueueHealth() {
  try {
    const eventQueueService = require('./core/queue/event-queue.service');
    return {
      status: eventQueueService.isInitialized ? 'healthy' : 'unhealthy',
      initialized: eventQueueService.isInitialized
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err.message
    };
  }
}

function checkMemoryHealth() {
  const memUsage = process.memoryUsage();
  const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  return {
    status: memoryUsagePercent < 90 ? 'healthy' : 'warning',
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapUsagePercent: `${memoryUsagePercent.toFixed(2)}%`
  };
}

async function checkDiskHealth() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const criticalPaths = ['./logs', './uploads', './temp'];
    const diskInfo = {};
    
    for (const dirPath of criticalPaths) {
      try {
        const stats = fs.statSync(dirPath);
        diskInfo[dirPath] = {
          exists: true,
          accessible: true
        };
      } catch (error) {
        diskInfo[dirPath] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    return {
      status: 'healthy',
      paths: diskInfo
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err.message
    };
  }
}

function generatePrometheusMetrics() {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return `# HELP event_planner_core_memory_usage_bytes Memory usage in bytes
# TYPE event_planner_core_memory_usage_bytes gauge
event_planner_core_memory_usage_bytes{type="heap"} ${memUsage.heapUsed}
event_planner_core_memory_usage_bytes{type="external"} ${memUsage.external}
event_planner_core_memory_usage_bytes{type="rss"} ${memUsage.rss}

# HELP event_planner_core_uptime_seconds Process uptime in seconds
# TYPE event_planner_core_uptime_seconds counter
event_planner_core_uptime_seconds ${uptime}

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total 0

# HELP event_planner_core_active_connections Active database connections
# TYPE event_planner_core_active_connections gauge
event_planner_core_active_connections 0`;
}

// Swagger documentation endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Event Planner Core API Documentation'
}));
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
app.use('/api/invitations', invitationsRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1', ticketGenerationRoutes);

// 404 handler
app.use(ErrorHandler.notFoundHandler);

// Global error handler
app.use(ErrorHandler.globalHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Arrêt du service Redis Queue
    await eventQueueService.shutdown();
    console.log('✅ Redis Queue service closed');
  } catch (error) {
    console.error('❌ Error shutting down Redis Queue service:', error.message);
  }
  
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
    // Bootstrap automatique de l'application (crée la BD et applique les migrations)
    await bootstrap.initialize();
    
    // Initialisation du service Redis Queue pour la communication asynchrone
    await eventQueueService.initialize();
    
    // Démarrage du consommateur de résultats de génération de tickets
    startTicketGenerationResultConsumer();
    console.log('🎫 Ticket generation result consumer started');
    
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
    log('error', 'Server startup failed', { 
      error: error.message,
      stack: error.stack,
      method: 'SERVER_STARTUP' 
    });
    process.exit(1);
  }
}

// Start the server
let server;
startServer();

module.exports = app;
