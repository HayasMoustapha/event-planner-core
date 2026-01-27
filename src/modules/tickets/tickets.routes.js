const express = require('express');
const ticketsController = require('./tickets.controller');
const { validate, schemas } = require("../../middleware/validation");

// Import routes
const ticketTypesRoutes = require('./ticket-types.routes');
const ticketTemplatesRoutes = require('./ticket-templates.routes');

const router = express.Router();

// Ticket Type Management
router.use('/types', ticketTypesRoutes);

// Ticket Template Management
router.use('/templates', ticketTemplatesRoutes);

// Ticket Management
router.post('/', 
  ticketsController.generateTicket
);

router.get('/', 
  validate(schemas.pagination, 'query'),
  ticketsController.getTickets
);

router.get('/code/:ticketCode', 
  ticketsController.getTicketByCode
);

router.get('/events/:eventId/tickets', 
  validate(schemas.idParam, 'params'),
  validate(schemas.pagination, 'query'),
  ticketsController.getTicketsByEvent
);

// Ticket Validation
router.post('/:id/validate', 
  validate(schemas.idParam, 'params'),
  ticketsController.validateTicket
);

router.post('/validate', 
  ticketsController.validateTicketByCode
);

// Bulk Operations
router.post('/bulk/generate', 
  ticketsController.bulkGenerateTickets
);

router.post('/jobs', 
  ticketsController.createJob
);

router.post('/jobs/:jobId/process', 
  validate(schemas.idParam, 'params'),
  ticketsController.processJob
);

// Statistics
router.get('/events/:eventId/stats', 
  validate(schemas.idParam, 'params'),
  ticketsController.getTicketStats
);

module.exports = router;
