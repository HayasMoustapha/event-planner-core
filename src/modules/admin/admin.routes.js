const express = require('express');
const adminController = require('./admin.controller');
const { authenticate, requirePermission } = require("../../../../shared");
const { validate, schemas } = require("../../middleware/validation");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Dashboard
router.get('/dashboard', 
  requirePermission('admin.read'),
  adminController.getDashboard
);

// Global Statistics
router.get('/stats', 
  requirePermission('admin.read'),
  adminController.getGlobalStats
);

// Recent Activity
router.get('/activity', 
  requirePermission('admin.read'),
  adminController.getRecentActivity
);

// System Logs
router.get('/logs', 
  requirePermission('admin.read'),
  validate(schemas.pagination, 'query'),
  adminController.getSystemLogs
);

router.post('/logs', 
  requirePermission('admin.create'),
  adminController.createSystemLog
);

// User Management (via Auth Service)
router.get('/users', 
  requirePermission('admin.read'),
  validate(schemas.pagination, 'query'),
  adminController.getUsers
);

router.get('/users/:id', 
  requirePermission('admin.read'),
  validate(schemas.idParam, 'params'),
  adminController.getUserById
);

// Note: Les routes de modification d'utilisateurs sont gérées par l'Auth Service
// POST /api/auth/users (création)
// PUT /api/auth/users/:id (mise à jour)
// DELETE /api/auth/users/:id (suppression)
// PUT /api/auth/users/:id/status (changement statut)

// Event Management
router.get('/events', 
  requirePermission('admin.read'),
  validate(schemas.pagination, 'query'),
  adminController.getEvents
);

// Content Moderation
router.get('/templates/pending', 
  requirePermission('admin.moderate'),
  validate(schemas.pagination, 'query'),
  adminController.getTemplatesPendingApproval
);

router.get('/designers/pending', 
  requirePermission('admin.moderate'),
  validate(schemas.pagination, 'query'),
  adminController.getDesignersPendingVerification
);

router.post('/moderate', 
  requirePermission('admin.moderate'),
  adminController.moderateContent
);

// Analytics
router.get('/analytics/revenue', 
  requirePermission('admin.read'),
  adminController.getRevenueStats
);

router.get('/analytics/events', 
  requirePermission('admin.read'),
  adminController.getEventGrowthStats
);

// Data Export
router.get('/export', 
  requirePermission('admin.export'),
  adminController.exportData
);

// System Health
router.get('/health', 
  requirePermission('admin.read'),
  adminController.getSystemHealth
);

// Backup
router.post('/backup', 
  requirePermission('admin.backup'),
  adminController.createBackup
);

module.exports = router;
