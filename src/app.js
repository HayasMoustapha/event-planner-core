require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { port, corsOrigin, rateLimitWindowMs, rateLimitMaxRequests } = require('./config');

// Configuration validation
const { validateConfig } = require('./config/validation');
try {
  validateConfig();
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  process.exit(1);
}

// Import security middleware
const securityMiddleware = require('./middleware/security');
const { ErrorHandler } = require('./utils/errors');
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');

// Import routes
const eventsRoutes = require('./modules/events/events.routes');
const guestsRoutes = require('./modules/guests/guests.routes');
const ticketsRoutes = require('./modules/tickets/tickets.routes');
const marketplaceRoutes = require('./modules/marketplace/marketplace.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const healthRoutes = require('./health/health.routes');

// Create Express app
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
}));

// CORS configuration
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMaxRequests,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Rate limiting plus strict pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives pour l'auth
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later.'
  },
  skipSuccessfulRequests: true
});

// MongoDB sanitization (protège contre l'injection NoSQL)
app.use(mongoSanitize());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware global (analyse toutes les requêtes)
app.use(securityMiddleware.security({
  enabled: true,
  logLevel: 'warn',
  blockOnHighRisk: true,
  sanitizeInput: true
}));

// IP blacklist middleware
app.use(securityMiddleware.ipBlacklist());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Metrics middleware (collecte les métriques de performance)
app.use(metricsMiddleware);

// Health check routes (remplace l'endpoint simple)
app.use('/health', healthRoutes);

// Metrics endpoint for Prometheus
app.get('/metrics', metricsEndpoint);

// API routes
app.use('/api/events', eventsRoutes);
app.use('/api/guests', guestsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res, next) => {
  ErrorHandler.notFoundHandler(req, res, next);
});

// Global error handler
app.use(ErrorHandler.globalHandler);

module.exports = app;