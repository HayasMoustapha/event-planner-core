const express = require('express');
const ticketTemplatesController = require('./ticket-templates.controller');
const { authenticate, requirePermission } = require('../../../../shared');
const { validate, schemas } = require("../../middleware/validation");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Ticket Templates CRUD Operations
router.post('/', 
  requirePermission('tickets.create'),
  ticketTemplatesController.createTemplate
);

router.get('/', 
  requirePermission('tickets.read'),
  validate(schemas.pagination, 'query'),
  ticketTemplatesController.getTemplates
);

router.get('/popular', 
  requirePermission('tickets.read'),
  ticketTemplatesController.getPopularTemplates
);

router.get('/:id', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  ticketTemplatesController.getTemplate
);

router.put('/:id', 
  requirePermission('tickets.update'),
  validate(schemas.idParam, 'params'),
  ticketTemplatesController.updateTemplate
);

router.delete('/:id', 
  requirePermission('tickets.delete'),
  validate(schemas.idParam, 'params'),
  ticketTemplatesController.deleteTemplate
);

// Template Operations
router.post('/:id/validate', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  ticketTemplatesController.validateTemplateForEvent
);

router.post('/:id/clone', 
  requirePermission('tickets.create'),
  validate(schemas.idParam, 'params'),
  ticketTemplatesController.cloneTemplate
);

module.exports = router;
