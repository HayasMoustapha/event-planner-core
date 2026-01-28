const express = require('express');
const Joi = require('joi');
const ticketTemplatesController = require('./ticket-templates.controller');
const { SecurityMiddleware, ValidationMiddleware } = require('../../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Ticket Templates CRUD Operations
// router.post('/', 
//   ValidationMiddleware.createTicketsValidator('createTemplate'),
//   ticketTemplatesController.createTemplate
// );

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
  ValidationMiddleware.createTicketTemplatesValidator('validateTemplateForEvent'),
  ticketTemplatesController.validateTemplateForEvent
);

router.post('/:id/clone', SecurityMiddleware.withPermissions('tickets.templates.create'), ValidationMiddleware.validate({
  name: Joi.string().min(1).max(100).required()
}), ticketTemplatesController.cloneTemplate);

module.exports = router;
