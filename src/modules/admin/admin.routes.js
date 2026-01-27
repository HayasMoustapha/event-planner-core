const express = require('express');
const adminController = require('./admin.controller');
const { validate, schemas } = require("../../middleware/validation");

const router = express.Router();

// Dashboard
router.get('/dashboard', 
  adminController.getDashboard
);

// Global Statistics
router.get('/stats', 
  adminController.getGlobalStats
);

// Recent Activity
router.get('/activity', 
  adminController.getRecentActivity
);

// System Logs
router.get('/logs', 
  validate(schemas.pagination, 'query'),
  adminController.getSystemLogs
);

router.post('/logs', 
  adminController.createSystemLog
);

// User Management (via Auth Service)
router.get('/users', 
  validate(schemas.pagination, 'query'),
  adminController.getUsers
);

router.get('/users/:id', 
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
  validate(schemas.pagination, 'query'),
  adminController.getEvents
);

// Content Moderation
router.get('/templates/pending', 
  validate(schemas.pagination, 'query'),
  adminController.getTemplatesPendingApproval
);

router.get('/designers/pending', 
  validate(schemas.pagination, 'query'),
  adminController.getDesignersPendingVerification
);

router.post('/moderate', 
  adminController.moderateContent
);

// Analytics
router.get('/analytics/revenue', 
  adminController.getRevenueStats
);

router.get('/analytics/events', 
  adminController.getEventGrowthStats
);

// Data Export
router.get('/export', 
  adminController.exportData
);

// System Health
router.get('/health', 
  adminController.getSystemHealth
);

// Backup
router.post('/backup', 
  adminController.createBackup
);

module.exports = router;
