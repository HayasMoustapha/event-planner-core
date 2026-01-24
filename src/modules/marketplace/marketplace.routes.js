const express = require('express');
const marketplaceController = require('./marketplace.controller');
const { authenticate, requirePermission, validate, schemas } = require('../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Designer Management
router.post('/designers', 
  requirePermission('marketplace.create'),
  marketplaceController.becomeDesigner
);

router.get('/designers', 
  requirePermission('marketplace.read'),
  validate(schemas.pagination, 'query'),
  marketplaceController.getDesigners
);

router.get('/designers/:id', 
  requirePermission('marketplace.read'),
  validate(schemas.idParam, 'params'),
  marketplaceController.getDesigner
);

router.put('/designers/:id', 
  requirePermission('marketplace.update'),
  validate(schemas.idParam, 'params'),
  marketplaceController.updateDesigner
);

// Template Management
router.post('/templates', 
  requirePermission('marketplace.create'),
  marketplaceController.createTemplate
);

router.get('/templates', 
  requirePermission('marketplace.read'),
  validate(schemas.pagination, 'query'),
  marketplaceController.getTemplates
);

router.get('/templates/:id', 
  requirePermission('marketplace.read'),
  validate(schemas.idParam, 'params'),
  marketplaceController.getTemplate
);

router.put('/templates/:id', 
  requirePermission('marketplace.update'),
  validate(schemas.idParam, 'params'),
  marketplaceController.updateTemplate
);

// Template Purchase
router.post('/templates/:templateId/purchase', 
  requirePermission('marketplace.purchase'),
  validate(schemas.idParam, 'params'),
  marketplaceController.purchaseTemplate
);

// Template Reviews
router.post('/templates/:templateId/reviews', 
  requirePermission('marketplace.create'),
  validate(schemas.idParam, 'params'),
  marketplaceController.createReview
);

router.get('/templates/:templateId/reviews', 
  requirePermission('marketplace.read'),
  validate(schemas.idParam, 'params'),
  validate(schemas.pagination, 'query'),
  marketplaceController.getTemplateReviews
);

// User Purchases
router.get('/purchases', 
  requirePermission('marketplace.read'),
  validate(schemas.pagination, 'query'),
  marketplaceController.getUserPurchases
);

// Admin Operations
router.get('/stats', 
  requirePermission('marketplace.read'),
  marketplaceController.getMarketplaceStats
);

router.post('/templates/:id/approve', 
  requirePermission('marketplace.moderate'),
  validate(schemas.idParam, 'params'),
  marketplaceController.approveTemplate
);

router.post('/templates/:id/reject', 
  requirePermission('marketplace.moderate'),
  validate(schemas.idParam, 'params'),
  marketplaceController.rejectTemplate
);

router.post('/designers/:id/verify', 
  requirePermission('marketplace.moderate'),
  validate(schemas.idParam, 'params'),
  marketplaceController.verifyDesigner
);

module.exports = router;
