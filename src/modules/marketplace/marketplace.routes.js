const express = require('express');
const marketplaceController = require('./marketplace.controller');
const { validate, schemas } = require("../../middleware/validation");

const router = express.Router();

// Designer Management
router.post('/designers', 
  marketplaceController.becomeDesigner
);

router.get('/designers', 
  validate(schemas.pagination, 'query'),
  marketplaceController.getDesigners
);

router.get('/designers/:id', 
  validate(schemas.idParam, 'params'),
  marketplaceController.getDesigner
);

router.put('/designers/:id', 
  validate(schemas.idParam, 'params'),
  marketplaceController.updateDesigner
);

// Template Management
router.post('/templates', 
  marketplaceController.createTemplate
);

router.get('/templates', 
  validate(schemas.pagination, 'query'),
  marketplaceController.getTemplates
);

router.get('/templates/:id', 
  validate(schemas.idParam, 'params'),
  marketplaceController.getTemplate
);

router.put('/templates/:id', 
  validate(schemas.idParam, 'params'),
  marketplaceController.updateTemplate
);

// Template Purchase
router.post('/templates/:templateId/purchase', 
  validate(schemas.idParam, 'params'),
  marketplaceController.purchaseTemplate
);

// Template Reviews
router.post('/templates/:templateId/reviews', 
  validate(schemas.idParam, 'params'),
  marketplaceController.createReview
);

router.get('/templates/:templateId/reviews', 
  validate(schemas.idParam, 'params'),
  validate(schemas.pagination, 'query'),
  marketplaceController.getTemplateReviews
);

// User Purchases
router.get('/purchases', 
  validate(schemas.pagination, 'query'),
  marketplaceController.getUserPurchases
);

// Admin Operations
router.get('/stats', 
  marketplaceController.getMarketplaceStats
);

router.post('/templates/:id/approve', 
  validate(schemas.idParam, 'params'),
  marketplaceController.approveTemplate
);

router.post('/templates/:id/reject', 
  validate(schemas.idParam, 'params'),
  marketplaceController.rejectTemplate
);

router.post('/designers/:id/verify', 
  validate(schemas.idParam, 'params'),
  marketplaceController.verifyDesigner
);

module.exports = router;
