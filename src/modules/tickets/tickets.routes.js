const express = require('express');
const Joi = require('joi');
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

router.get('/', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'validated', 'used', 'cancelled').optional(),
  event_id: Joi.number().integer().positive().optional()
}), ticketsController.getTickets);

router.get('/code/:ticketCode', ValidationMiddleware.validateParams({
  ticketCode: Joi.string().required()
}), ticketsController.getTicketByCode);

router.get('/events/:eventId/tickets', ValidationMiddleware.validateParams({
  eventId: Joi.number().integer().positive().required()
}), ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'validated', 'used', 'cancelled').optional()
}), ticketsController.getEventTickets);

// Ticket Validation
router.post('/:id/validate', ticketsController.validateTicket);

router.post('/validate', ticketsController.validateTicketByCode);

// Bulk Operations
router.post('/bulk/generate', ticketsController.bulkGenerateTickets);

router.post('/jobs', ticketsController.createJob);

router.post('/jobs/:jobId/process', ticketsController.processJob);

// Statistics - GET routes avec validation
router.get('/events/:eventId/stats', ValidationMiddleware.validateParams({
  eventId: Joi.number().integer().positive().required()
}), ticketsController.getEventTicketStats);

module.exports = router;
