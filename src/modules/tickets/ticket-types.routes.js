const express = require('express');
const ticketsController = require('./tickets.controller');
const { authenticate, requirePermission } = require("../../../../shared/");
const { validate, schemas } = require("../../middleware/validation");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Ticket Type Management
router.post('/', 
  requirePermission('tickets.create'),
  ticketsController.createTicketType
);

router.get('/:id', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  ticketsController.getTicketType
);

router.get('/events/:eventId/types', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  validate(schemas.pagination, 'query'),
  ticketsController.getTicketTypesByEvent
);

router.put('/:id', 
  requirePermission('tickets.update'),
  validate(schemas.idParam, 'params'),
  ticketsController.updateTicketType
);

router.delete('/:id', 
  requirePermission('tickets.delete'),
  validate(schemas.idParam, 'params'),
  ticketsController.deleteTicketType
);

module.exports = router;
