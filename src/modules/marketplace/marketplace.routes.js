const express = require('express');
const marketplaceController = require('./marketplace.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectMarketplaceContext());

// Designer Management
router.post('/designers', 
  ValidationMiddleware.createMarketplaceValidator('becomeDesigner'), 
  marketplaceController.becomeDesigner
);

router.get('/designers', marketplaceController.getDesigners);

router.get('/designers/:id', marketplaceController.getDesignerById);

router.put('/designers/:id', ValidationMiddleware.createMarketplaceValidator('updateDesigner'), marketplaceController.updateDesigner);

// Template Management
router.post('/templates', 
  ValidationMiddleware.createMarketplaceValidator('createTemplate'), 
  marketplaceController.createTemplate
);

router.get('/templates', marketplaceController.getTemplates);

router.get('/templates/:id', 
  marketplaceController.getTemplateById
);

router.put('/templates/:id', ValidationMiddleware.createMarketplaceValidator('updateTemplate'), marketplaceController.updateTemplate);

// Template Purchase
router.post('/templates/:templateId/purchase', ValidationMiddleware.createMarketplaceValidator('purchaseTemplate'), marketplaceController.purchaseTemplate);

// Template Reviews
router.get('/templates/:templateId/reviews', marketplaceController.getTemplateReviews);

router.post('/templates/:templateId/reviews', ValidationMiddleware.createMarketplaceValidator('createReview'), marketplaceController.createReview);

// User Purchases
router.get('/purchases', marketplaceController.getUserPurchases);

// Admin Operations
router.get('/stats', 
  marketplaceController.getMarketplaceStats
);

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
