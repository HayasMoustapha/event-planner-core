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

router.get('/', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
}), ticketTemplatesController.getTemplates);

router.get('/popular', ValidationMiddleware.validateQuery({
  limit: Joi.number().integer().min(1).max(20).default(10)
}), ticketTemplatesController.getPopularTemplates);

router.get('/:id', ValidationMiddleware.validateParams({
  id: Joi.number().integer().positive().required()
}), ticketTemplatesController.getTemplate);

router.put('/:id', ValidationMiddleware.validate({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional()
}), ticketTemplatesController.updateTemplate);

router.delete('/:id', ValidationMiddleware.validateParams({
  id: Joi.number().integer().positive().required()
}), ticketTemplatesController.deleteTemplate);

// Template Operations
router.post('/:id/validate', ValidationMiddleware.validate({
  event_id: Joi.number().integer().positive().required()
}), ticketTemplatesController.validateTemplateForEvent);

router.post('/:id/clone', ValidationMiddleware.validate({
  name: Joi.string().min(1).max(100).required()
}), ticketTemplatesController.cloneTemplate);

module.exports = router;
