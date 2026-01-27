const express = require('express');
const Joi = require('joi');
const marketplaceController = require('./marketplace.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');
const { marketplaceErrorHandler } = require('./marketplace.errorHandler');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectMarketplaceContext());

// Apply error handler for all routes
router.use(marketplaceErrorHandler);

// Designer Management - GET routes avec validation
router.get('/designers', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'approved', 'rejected').optional()
}), marketplaceController.getDesigners);

router.get('/designers/:id', ValidationMiddleware.validateParams({
  id: Joi.number().integer().positive().required()
}), marketplaceController.getDesignerById);

router.put('/designers/:id', ValidationMiddleware.createMarketplaceValidator('updateDesigner'), marketplaceController.updateDesigner);

// Template Management
router.post('/templates', 
  ValidationMiddleware.createMarketplaceValidator('createTemplate'), 
  marketplaceController.createTemplate
);

router.get('/templates', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  designer_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('pending_review', 'approved', 'rejected').optional()
}), marketplaceController.getTemplates);

router.get('/templates/:id', ValidationMiddleware.validateParams({
  id: Joi.number().integer().positive().required()
}), marketplaceController.getTemplateById);

router.put('/templates/:id', ValidationMiddleware.createMarketplaceValidator('updateTemplate'), marketplaceController.updateTemplate);

// Template Purchase
router.post('/templates/:templateId/purchase', ValidationMiddleware.createMarketplaceValidator('purchaseTemplate'), marketplaceController.purchaseTemplate);

// Template Reviews - GET routes avec validation
router.get('/templates/:templateId/reviews', ValidationMiddleware.validateParams({
  templateId: Joi.number().integer().positive().required()
}), ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
}), marketplaceController.getTemplateReviews);

router.post('/templates/:templateId/reviews', ValidationMiddleware.createMarketplaceValidator('createReview'), marketplaceController.createReview);

// User Purchases - GET routes avec validation
router.get('/purchases', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
}), marketplaceController.getUserPurchases);

// Admin Operations - GET routes avec validation
router.get('/stats', ValidationMiddleware.validateQuery({
  period: Joi.string().valid('day', 'week', 'month', 'year').default('month')
}), marketplaceController.getMarketplaceStats);

router.post('/templates/:id/approve', 
  ValidationMiddleware.createMarketplaceValidator('approveTemplate'), 
  marketplaceController.approveTemplate
);

router.delete('/templates/:id', 
  ValidationMiddleware.createMarketplaceValidator('deleteTemplate'), 
  marketplaceController.deleteTemplate
);

router.post('/templates/:id/reject', ValidationMiddleware.createMarketplaceValidator('rejectTemplate'), marketplaceController.rejectTemplate);

router.post('/designers/:id/verify', ValidationMiddleware.createMarketplaceValidator('verifyDesigner'), marketplaceController.verifyDesigner);

module.exports = router;
