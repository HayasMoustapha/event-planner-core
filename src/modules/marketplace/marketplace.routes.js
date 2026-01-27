const express = require('express');
const marketplaceController = require('./marketplace.controller');
const { SecurityMiddleware, validate, createMarketplaceValidator, ContextInjector } = require('../../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectMarketplaceContext());

// Designer Management
router.post('/designers', 
  createMarketplaceValidator('becomeDesigner'), 
  marketplaceController.becomeDesigner
);

router.get('/designers', marketplaceController.getDesigners);

router.get('/designers/:id', marketplaceController.getDesignerById);

router.put('/designers/:id', updateMarketplaceValidator('updateDesigner'), marketplaceController.updateDesigner);

// Template Management
router.post('/templates', 
  createMarketplaceValidator('createTemplate'), 
  marketplaceController.createTemplate
);

router.get('/templates', marketplaceController.getTemplates);

router.get('/templates/:id', 
  marketplaceController.getTemplateById
);

router.put('/templates/:id', updateMarketplaceValidator('updateTemplate'), marketplaceController.updateTemplate);

// Template Purchase
router.post('/templates/:templateId/purchase', createMarketplaceValidator('purchaseTemplate'), marketplaceController.purchaseTemplate);

// Template Reviews
router.get('/templates/:templateId/reviews', marketplaceController.getTemplateReviews);

router.post('/templates/:templateId/reviews', createMarketplaceValidator('createReview'), marketplaceController.createReview);

// User Purchases
router.get('/purchases', marketplaceController.getUserPurchases);

// Admin Operations
router.get('/stats', 
  marketplaceController.getMarketplaceStats
);

router.post('/templates/:id/approve', 
  createMarketplaceValidator('approveTemplate'), 
  marketplaceController.approveTemplate
);

router.delete('/templates/:id', 
  createMarketplaceValidator('deleteTemplate'), 
  marketplaceController.deleteTemplate
);

router.post('/templates/:id/reject', createMarketplaceValidator('rejectTemplate'), marketplaceController.rejectTemplate);

router.post('/designers/:id/verify', createMarketplaceValidator('verifyDesigner'), marketplaceController.verifyDesigner);

module.exports = router;
