const express = require('express');
const Joi = require('joi');
const ticketTemplatesController = require('./ticket-templates.controller');
const { SecurityMiddleware, ValidationMiddleware } = require('../../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Ticket Templates CRUD Operations
router.post('/', 
  SecurityMiddleware.withPermissions('tickets.templates.create'),
  ValidationMiddleware.createTicketTemplatesValidator('createTemplate'),
  ticketTemplatesController.createTemplate
);

router.get('/', SecurityMiddleware.withPermissions('tickets.templates.read'), ticketTemplatesController.getTemplates);

router.get('/popular', SecurityMiddleware.withPermissions('tickets.templates.read'), ticketTemplatesController.getPopularTemplates);

router.get('/:id', SecurityMiddleware.withPermissions('tickets.templates.read'), ticketTemplatesController.getTemplateById);

router.put('/:id', 
  SecurityMiddleware.withPermissions('tickets.templates.update'),
  ValidationMiddleware.createTicketTemplatesValidator('updateTemplate'),
  ticketTemplatesController.updateTemplate
);

router.delete('/:id', 
  SecurityMiddleware.withPermissions('tickets.templates.delete'),
  ValidationMiddleware.createTicketTemplatesValidator('deleteTemplate'),
  ticketTemplatesController.deleteTemplate
);

// Template Operations
router.post('/:id/validate', 
  SecurityMiddleware.withPermissions('tickets.templates.validate'),
  ValidationMiddleware.validateParams({ id: Joi.number().integer().positive().required() }),
  ticketTemplatesController.validateTemplateForEvent
);

router.post('/:id/clone',
  SecurityMiddleware.withPermissions('tickets.templates.create'),
  ValidationMiddleware.validateParams({ id: Joi.number().integer().positive().required() }),
  ValidationMiddleware.createTicketTemplatesValidator('cloneTemplate'),
  ticketTemplatesController.cloneTemplate
);

router.get('/:id/preview',
  SecurityMiddleware.withPermissions('tickets.templates.read'),
  ValidationMiddleware.validateParams({ id: Joi.number().integer().positive().required() }),
  ticketTemplatesController.getPreview
);

module.exports = router;
