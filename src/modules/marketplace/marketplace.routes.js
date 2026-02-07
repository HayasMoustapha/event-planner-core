const express = require('express');
const Joi = require('joi');
const marketplaceController = require('./marketplace.controller');
const paymentRoutes = require('./payment.routes.simple'); // Utilisation des routes simplifiées pour les tests
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');
const { uploadTemplateFile } = require('../../middleware/upload.middleware');
const marketplaceErrorHandler = require('./marketplace.errorHandler');

const router = express.Router();

const attachTemplateFile = (req, res, next) => {
  if (req.file?.path) {
    req.body = req.body || {};
    req.body.source_files_path = req.file.path;
  }
  next();
};

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectMarketplaceContext());

// Apply error handler for all routes
router.use(marketplaceErrorHandler);

// Intégrer les routes de paiement (version simplifiée sans RBAC)
router.use(paymentRoutes);

// Designer Management - GET routes avec permission spécifique
router.get('/designers', SecurityMiddleware.withPermissions('marketplace.designers.read'), marketplaceController.getDesigners);

// Stats routes pour designers et templates (doivent être avant /:id)
router.get('/designers/stats', SecurityMiddleware.withPermissions('marketplace.stats.read'), marketplaceController.getDesignerStats);

router.get('/templates/stats', SecurityMiddleware.withPermissions('marketplace.stats.read'), marketplaceController.getTemplateStats);

router.get('/purchases/stats', SecurityMiddleware.withPermissions('marketplace.stats.read'), marketplaceController.getPurchaseStats);

router.get('/reviews/stats', SecurityMiddleware.withPermissions('marketplace.stats.read'), marketplaceController.getReviewStats);

router.get('/designers/:id', SecurityMiddleware.withPermissions('marketplace.designers.read'), marketplaceController.getDesignerById);

// Inscription comme designer
router.post('/designers/register', SecurityMiddleware.withPermissions('marketplace.designers.create'), marketplaceController.becomeDesigner);

router.put('/designers/:id', SecurityMiddleware.withPermissions('marketplace.designers.update'), ValidationMiddleware.createMarketplaceValidator('updateDesigner'), marketplaceController.updateDesigner);

// Template Management
router.post('/templates', 
  SecurityMiddleware.withPermissions('marketplace.templates.create'),
  uploadTemplateFile,
  attachTemplateFile,
  ValidationMiddleware.createMarketplaceValidator('createTemplate'), 
  marketplaceController.createTemplate
);

router.get('/templates', SecurityMiddleware.withPermissions('marketplace.templates.read'), marketplaceController.getTemplates);

router.get('/templates/:id', SecurityMiddleware.withPermissions('marketplace.templates.read'), marketplaceController.getTemplateById);

router.put('/templates/:id',
  SecurityMiddleware.withPermissions('marketplace.templates.update'),
  uploadTemplateFile,
  attachTemplateFile,
  ValidationMiddleware.createMarketplaceValidator('updateTemplate'),
  marketplaceController.updateTemplate
);

// Template Purchase
router.post('/templates/:templateId/purchase', SecurityMiddleware.withPermissions('marketplace.templates.purchase'), ValidationMiddleware.createMarketplaceValidator('purchaseTemplate'), marketplaceController.purchaseTemplate);

// Template Reviews - GET routes avec permission spécifique
router.get('/templates/:templateId/reviews', SecurityMiddleware.withPermissions('marketplace.reviews.read'), marketplaceController.getTemplateReviews);

router.post('/templates/:templateId/reviews', SecurityMiddleware.withPermissions('marketplace.reviews.create'), ValidationMiddleware.createMarketplaceValidator('createReview'), marketplaceController.createReview);

// User Purchases - GET routes avec permission spécifique
router.get('/purchases', SecurityMiddleware.withPermissions('marketplace.purchases.read'), marketplaceController.getUserPurchases);

// Admin Operations - GET routes avec permission spécifique
router.get('/stats', SecurityMiddleware.withPermissions('marketplace.stats.read'), marketplaceController.getMarketplaceStats);

// Admin routes
router.get('/admin/designers', SecurityMiddleware.withPermissions('marketplace.admin.read'), marketplaceController.getAdminDesigners);

router.get('/admin/templates', SecurityMiddleware.withPermissions('marketplace.admin.read'), marketplaceController.getAdminTemplates);

router.get('/admin/purchases', SecurityMiddleware.withPermissions('marketplace.admin.read'), marketplaceController.getAdminPurchases);

router.get('/admin/reviews', SecurityMiddleware.withPermissions('marketplace.admin.read'), marketplaceController.getAdminReviews);

router.post('/admin/designers/:id/verify', SecurityMiddleware.withPermissions('marketplace.admin.verify'), marketplaceController.verifyDesigner);

router.post('/templates/:id/approve', 
  SecurityMiddleware.withPermissions('marketplace.templates.approve'),
  ValidationMiddleware.createMarketplaceValidator('approveTemplate'), 
  marketplaceController.approveTemplate
);

router.delete('/templates/:id', 
  SecurityMiddleware.withPermissions('marketplace.templates.delete'),
  ValidationMiddleware.createMarketplaceValidator('deleteTemplate'), 
  marketplaceController.deleteTemplate
);

router.post('/templates/:id/reject', SecurityMiddleware.withPermissions('marketplace.templates.reject'), ValidationMiddleware.createMarketplaceValidator('rejectTemplate'), marketplaceController.rejectTemplate);

module.exports = router;
