const express = require('express');
const Joi = require('joi');
const ticketsController = require('./tickets.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');
const ticketsErrorHandler = require('./tickets.errorHandler');

// Import routes
const ticketTypesRoutes = require('./ticket-types.routes');
const ticketTemplatesRoutes = require('./ticket-templates.routes');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectTicketContext());

// Apply error handler for all routes
router.use(ticketsErrorHandler);

// Ticket Type Management
router.use('/types', ticketTypesRoutes);

// Ticket Template Management
router.use('/templates', ticketTemplatesRoutes);

// Ticket Management
router.post('/', 
  SecurityMiddleware.withPermissions('tickets.create'), 
  ValidationMiddleware.createTicketsValidator('createTicket'), 
  ticketsController.createTicket
);

router.get('/', SecurityMiddleware.withPermissions('tickets.read'), ticketsController.getTickets);

router.get('/code/:ticketCode', SecurityMiddleware.withPermissions('tickets.read'), ticketsController.getTicketByCode);

router.get('/events/:eventId/tickets', SecurityMiddleware.withPermissions('tickets.read'), ticketsController.getEventTickets);

// Ticket Validation
router.post('/:id/validate', SecurityMiddleware.withPermissions('tickets.validate'), ticketsController.validateTicket);

router.post('/validate', SecurityMiddleware.withPermissions('tickets.validate'), ticketsController.validateTicketByCode);

// Bulk Operations
router.post('/bulk/generate', SecurityMiddleware.withPermissions('tickets.create'), ticketsController.bulkGenerateTickets);

router.post('/jobs', SecurityMiddleware.withPermissions('tickets.jobs.create'), ticketsController.createJob);

router.post('/jobs/:jobId/process', SecurityMiddleware.withPermissions('tickets.jobs.process'), ticketsController.processJob);

// Statistics - GET routes avec permission spécifique
router.get('/events/:eventId/stats', SecurityMiddleware.withPermissions('tickets.stats.read'), ticketsController.getEventTicketStats);

module.exports = router;
