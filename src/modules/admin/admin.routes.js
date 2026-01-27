const express = require('express');
const Joi = require('joi');
const adminController = require('./admin.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.adminOnly());

// Apply admin context injection
router.use(ContextInjector.injectAdminContext());

// Dashboard - GET routes avec validation
router.get('/dashboard', ValidationMiddleware.validateQuery({
  period: Joi.string().valid('day', 'week', 'month', 'year').default('month')
}), adminController.getDashboard);

// Global Statistics - GET routes avec validation
router.get('/stats', ValidationMiddleware.validateQuery({
  period: Joi.string().valid('day', 'week', 'month', 'year').default('month')
}), adminController.getGlobalStats);

// Recent Activity - GET routes avec validation
router.get('/activity', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  type: Joi.string().valid('all', 'events', 'tickets', 'users', 'payments').default('all')
}), adminController.getRecentActivity);

// System Logs - GET routes avec validation
router.get('/logs', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(100),
  level: Joi.string().valid('error', 'warning', 'info', 'debug').optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional()
}), adminController.getSystemLogs);

router.post('/logs', adminController.createSystemLog);

// User Management (via Auth Service) - GET routes avec validation
router.get('/users', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  role: Joi.string().valid('user', 'organizer', 'designer', 'admin').optional(),
  search: Joi.string().max(100).optional()
}), adminController.getUsers);

router.get('/users/:id', ValidationMiddleware.validateParams({
  id: Joi.number().integer().positive().required()
}), adminController.getUserById);

// Note: Les routes de modification d'utilisateurs sont gérées par l'Auth Service
// POST /api/auth/users (création)
// PUT /api/auth/users/:id (mise à jour)
// DELETE /api/auth/users/:id (suppression)
// PUT /api/auth/users/:id/status (changement statut)

// Event Management - GET routes avec validation
router.get('/events', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('draft', 'published', 'archived').optional(),
  organizer_id: Joi.number().integer().positive().optional(),
  search: Joi.string().max(100).optional()
}), adminController.getEvents);

// Content Moderation - GET routes avec validation
router.get('/templates/pending', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
}), adminController.getTemplatesPendingApproval);

router.get('/designers/pending', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
}), adminController.getDesignersPendingApproval);

router.post('/moderate', adminController.moderateContent);

// Analytics - GET routes avec validation
router.get('/analytics/revenue', ValidationMiddleware.validateQuery({
  period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional()
}), adminController.getRevenueAnalytics);

router.get('/analytics/events', ValidationMiddleware.validateQuery({
  period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional()
}), adminController.getEventGrowthStats);

// Data Export - GET routes avec validation
router.get('/export', ValidationMiddleware.validateQuery({
  type: Joi.string().valid('users', 'events', 'tickets', 'payments', 'all').default('all'),
  format: Joi.string().valid('json', 'csv', 'xlsx').default('json'),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional()
}), adminController.exportData);

// System Health - GET routes sans validation (monitoring)
router.get('/health', adminController.getSystemHealth);

// Backup
router.post('/backup', adminController.createBackup);

module.exports = router;
