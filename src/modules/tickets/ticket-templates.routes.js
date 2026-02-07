const express = require('express');
const Joi = require('joi');
const ticketTemplatesController = require('./ticket-templates.controller');
const { uploadTemplateFile } = require('../../middleware/upload.middleware');
const { SecurityMiddleware, ValidationMiddleware } = require('../../../../shared');

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

// Ticket Templates CRUD Operations
router.post('/', 
  SecurityMiddleware.withPermissions('tickets.templates.create'),
  uploadTemplateFile,
  attachTemplateFile,
  ValidationMiddleware.createTicketTemplatesValidator('createTemplate'),
  ticketTemplatesController.createTemplate
);

router.get('/', SecurityMiddleware.withPermissions('tickets.templates.read'), ticketTemplatesController.getTemplates);

router.get('/popular', SecurityMiddleware.withPermissions('tickets.templates.read'), ticketTemplatesController.getPopularTemplates);

router.get('/:id', SecurityMiddleware.withPermissions('tickets.templates.read'), ticketTemplatesController.getTemplateById);

router.put('/:id', 
  SecurityMiddleware.withPermissions('tickets.templates.update'),
  uploadTemplateFile,
  attachTemplateFile,
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
  ValidationMiddleware.validateParams(Joi.object({ id: Joi.number().integer().positive().required() })),
  ticketTemplatesController.validateTemplateForEvent
);

router.post('/:id/clone',
  SecurityMiddleware.withPermissions('tickets.templates.create'),
  ValidationMiddleware.validateParams(Joi.object({ id: Joi.number().integer().positive().required() })),
  ValidationMiddleware.validate(Joi.object({ name: Joi.string().min(1).max(255).optional() })),
  ticketTemplatesController.cloneTemplate
);

router.get('/:id/preview',
  SecurityMiddleware.withPermissions('tickets.templates.read'),
  ValidationMiddleware.validateParams(Joi.object({ id: Joi.number().integer().positive().required() })),
  ticketTemplatesController.getPreview
);

module.exports = router;
