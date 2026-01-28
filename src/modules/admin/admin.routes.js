const express = require('express');
const Joi = require('joi');
const adminController = require('./admin.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');
const adminErrorHandler = require('./admin.errorHandler');

const router = express.Router();


// Apply authentication to all routes
router.use(SecurityMiddleware.adminOnly());

// Apply admin context injection
router.use(ContextInjector.injectAdminContext());

// Apply error handler for all routes
router.use(adminErrorHandler);

// Dashboard - GET routes avec permission spécifique
router.get('/dashboard', SecurityMiddleware.withPermissions('admin.dashboard.read'), adminController.getDashboard);

// Global Statistics - GET routes avec permission spécifique
router.get('/stats', SecurityMiddleware.withPermissions('admin.stats.read'), adminController.getGlobalStats);

// Recent Activity - GET routes avec permission spécifique
router.get('/activity', SecurityMiddleware.withPermissions('admin.activity.read'), adminController.getRecentActivity);

// System Logs - GET routes avec permission spécifique
router.get('/logs', SecurityMiddleware.withPermissions('admin.logs.read'), adminController.getSystemLogs);

router.post('/logs', SecurityMiddleware.withPermissions('admin.logs.create'), adminController.createSystemLog);

// User Management (via Auth Service) - GET routes avec permission spécifique
router.get('/users', SecurityMiddleware.withPermissions('admin.users.read'), adminController.getUsers);

router.get('/users/:id', SecurityMiddleware.withPermissions('admin.users.read'), adminController.getUserById);

// Note: Les routes de modification d'utilisateurs sont gérées par l'Auth Service
// POST /api/auth/users (création)
// PUT /api/auth/users/:id (mise à jour)
// DELETE /api/auth/users/:id (suppression)
// PUT /api/auth/users/:id/status (changement statut)

// Event Management - GET routes avec permission spécifique
router.get('/events', SecurityMiddleware.withPermissions('admin.events.read'), adminController.getEvents);

// Content Moderation - GET routes avec permission spécifique
router.get('/templates/pending', SecurityMiddleware.withPermissions('admin.templates.read'), adminController.getTemplatesPendingApproval);

router.get('/designers/pending', SecurityMiddleware.withPermissions('admin.designers.read'), adminController.getDesignersPendingApproval);

router.post('/moderate', SecurityMiddleware.withPermissions('admin.moderate'), adminController.moderateContent);

// Analytics - GET routes avec permission spécifique
router.get('/analytics/revenue', SecurityMiddleware.withPermissions('admin.analytics.revenue'), adminController.getRevenueAnalytics);

router.get('/analytics/events', SecurityMiddleware.withPermissions('admin.analytics.events'), adminController.getEventGrowthStats);

// Data Export - GET routes avec permission spécifique
router.get('/export', SecurityMiddleware.withPermissions('admin.export'), adminController.exportData);

// System Health - GET routes avec permission spécifique (monitoring)
router.get('/health', SecurityMiddleware.withPermissions('admin.health.read'), adminController.getSystemHealth);

// Backup
router.post('/backup', SecurityMiddleware.withPermissions('admin.backup.create'), adminController.createBackup);

module.exports = router;
