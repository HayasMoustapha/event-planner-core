const express = require('express');
const ticketsController = require('./tickets.controller');
const { authenticate, requirePermission, validate, schemas } = require('../../middleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Ticket Type Management
router.post('/types', 
  requirePermission('tickets.create'),
  ticketsController.createTicketType
);

router.get('/types/:id', 
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

router.put('/types/:id', 
  requirePermission('tickets.update'),
  validate(schemas.idParam, 'params'),
  ticketsController.updateTicketType
);

router.delete('/types/:id', 
  requirePermission('tickets.delete'),
  validate(schemas.idParam, 'params'),
  ticketsController.deleteTicketType
);

// Ticket Management
router.post('/', 
  requirePermission('tickets.create'),
  ticketsController.generateTicket
);

router.get('/:id', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  ticketsController.getTicket
);

router.get('/code/:ticketCode', 
  requirePermission('tickets.read'),
  ticketsController.getTicketByCode
);

router.get('/events/:eventId/tickets', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  validate(schemas.pagination, 'query'),
  ticketsController.getTicketsByEvent
);

// Ticket Validation
router.post('/:id/validate', 
  requirePermission('tickets.validate'),
  validate(schemas.idParam, 'params'),
  ticketsController.validateTicket
);

router.post('/validate', 
  requirePermission('tickets.validate'),
  ticketsController.validateTicketByCode
);

// Bulk Operations
router.post('/bulk/generate', 
  requirePermission('tickets.create'),
  ticketsController.bulkGenerateTickets
);

// Statistics
router.get('/events/:eventId/stats', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  ticketsController.getTicketStats
);

module.exports = router;
