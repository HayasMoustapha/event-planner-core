const express = require('express');
const ticketsController = require('./tickets.controller');
const { authenticate, requirePermission } = require("../../../../shared");
const { validate, schemas } = require("../../middleware/validation");

// Import routes
const ticketTypesRoutes = require('./ticket-types.routes');
const ticketTemplatesRoutes = require('./ticket-templates.routes');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Ticket Type Management
router.use('/types', ticketTypesRoutes);

// Ticket Template Management
router.use('/templates', ticketTemplatesRoutes);

// Ticket Management
router.post('/', 
  requirePermission('tickets.create'),
  ticketsController.generateTicket
);

router.get('/', 
  requirePermission('tickets.read'),
  validate(schemas.pagination, 'query'),
  ticketsController.getTickets
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

router.post('/jobs', 
  requirePermission('tickets.create'),
  ticketsController.createJob
);

router.post('/jobs/:jobId/process', 
  requirePermission('tickets.update'),
  validate(schemas.idParam, 'params'),
  ticketsController.processJob
);

// Statistics
router.get('/events/:eventId/stats', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  ticketsController.getTicketStats
);

module.exports = router;
