const express = require('express');
const ticketsController = require('./tickets.controller');
const { authenticate, requirePermission, validate, schemas } = require('../../middleware');

// Import routes
const ticketTypesRoutes = require('./ticket-types.routes');
const ticketTemplatesRoutes = require('./ticket-templates.routes');
const ticketGenerationJobsRoutes = require('./ticket-generation-jobs.routes');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Ticket Type Management
router.use('/types', ticketTypesRoutes);

// Ticket Template Management
router.use('/templates', ticketTemplatesRoutes);

// Ticket Generation Jobs
router.use('/jobs', ticketGenerationJobsRoutes);

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

// Statistics
router.get('/events/:eventId/stats', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  ticketsController.getTicketStats
);

module.exports = router;
