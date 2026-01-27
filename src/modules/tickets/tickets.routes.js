const express = require('express');
const ticketsController = require('./tickets.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');

// Import routes
const ticketTypesRoutes = require('./ticket-types.routes');
const ticketTemplatesRoutes = require('./ticket-templates.routes');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectTicketContext());

// Ticket Type Management
router.use('/types', ticketTypesRoutes);

// Ticket Template Management
router.use('/templates', ticketTemplatesRoutes);

// Ticket Management
router.post('/', 
  ValidationMiddleware.createTicketsValidator('createTicket'), 
  ticketsController.createTicket
);

router.get('/', ticketsController.getTickets);

router.get('/code/:ticketCode', ticketsController.getTicketByCode);

router.get('/events/:eventId/tickets', 
  ticketsController.getEventTickets
);

// Ticket Validation
router.post('/:id/validate', ticketsController.validateTicket);

router.post('/validate', ticketsController.validateTicketByCode);

// Bulk Operations
router.post('/bulk/generate', ticketsController.bulkGenerateTickets);

router.post('/jobs', ticketsController.createJob);

router.post('/jobs/:jobId/process', ticketsController.processJob);

// Statistics
router.get('/events/:eventId/stats', 
  ticketsController.getEventTicketStats
);

module.exports = router;
