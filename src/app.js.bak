require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { port, corsOrigin } = require('./config');

// Configuration validation
const { validateConfig } = require('./config/validation');
try {
  validateConfig();
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  process.exit(1);
}

const { ErrorHandler } = require('./utils/errors');

// Import routes
const eventsRoutes = require('./modules/events/events.routes');
const guestsRoutes = require('./modules/guests/guests.routes');
const ticketsRoutes = require('./modules/tickets/tickets.routes');
const marketplaceRoutes = require('./modules/marketplace/marketplace.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const healthRoutes = require('./health/health.routes');

// Create Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Health check routes (no auth required)
app.use('/health', healthRoutes);

// API routes
app.use('/api/v1/events', eventsRoutes);
app.use('/api/v1/guests', guestsRoutes);
app.use('/api/v1/tickets', ticketsRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Event Planner Core API',
    version: process.env.SERVICE_VERSION || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(ErrorHandler.globalHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
