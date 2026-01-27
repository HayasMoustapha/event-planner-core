const express = require('express');
const ticketTemplatesController = require('./ticket-templates.controller');
const { validate, schemas } = require("../../middleware/validation");

const router = express.Router();

// Ticket Templates CRUD Operations
router.post('/', 
  ticketTemplatesController.createTemplate
);

router.get('/', 
  validate(schemas.pagination, 'query'),
  ticketTemplatesController.getTemplates
);

router.get('/popular', 
  ticketTemplatesController.getPopularTemplates
);

router.get('/:id', 
  validate(schemas.idParam, 'params'),
  ticketTemplatesController.getTemplate
);

router.put('/:id', 
  validate(schemas.idParam, 'params'),
  ticketTemplatesController.updateTemplate
);

router.delete('/:id', 
  validate(schemas.idParam, 'params'),
  ticketTemplatesController.deleteTemplate
);

// Template Operations
router.post('/:id/validate', 
  validate(schemas.idParam, 'params'),
  ticketTemplatesController.validateTemplateForEvent
);

router.post('/:id/clone', 
  validate(schemas.idParam, 'params'),
  ticketTemplatesController.cloneTemplate
);

module.exports = router;
