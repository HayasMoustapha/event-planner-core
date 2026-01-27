const express = require('express');
const adminController = require('./admin.controller');
const { SecurityMiddleware, validate, createAdminValidator } = require('../../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.adminOnly());

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Global Statistics
router.get('/stats', adminController.getGlobalStats);

// Recent Activity
router.get('/activity', adminController.getRecentActivity);

// System Logs
router.get('/logs', adminController.getSystemLogs);

router.post('/logs', adminController.createSystemLog);

// User Management (via Auth Service)
router.get('/users', adminController.getUsers);

router.get('/users/:id', adminController.getUserById);

// Note: Les routes de modification d'utilisateurs sont gérées par l'Auth Service
// POST /api/auth/users (création)
// PUT /api/auth/users/:id (mise à jour)
// DELETE /api/auth/users/:id (suppression)
// PUT /api/auth/users/:id/status (changement statut)

// Event Management
router.get('/events', adminController.getEvents);

// Content Moderation
router.get('/templates/pending', adminController.getTemplatesPendingApproval);

router.get('/designers/pending', 
  adminController.getDesignersPendingApproval
);

router.post('/moderate', adminController.moderateContent);

// Analytics
router.get('/analytics/revenue', adminController.getRevenueAnalytics);

router.get('/analytics/events', adminController.getEventGrowthStats);

// Data Export
router.get('/export', adminController.exportData);

// System Health
router.get('/health', adminController.getSystemHealth);

// Backup
router.post('/backup', adminController.createBackup);

module.exports = router;
