const express = require('express');
const ticketsController = require('./tickets.controller');
const { SecurityMiddleware, validate, createTicketsValidator } = require('../../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Ticket Type Management
router.post('/', 
  createTicketsValidator('createTicketType'),
  ticketsController.createTicketType
);

router.get('/:id', 
  createTicketsValidator('getTicketTypeById'),
  ticketsController.getTicketTypeById
);

router.get('/events/:eventId/types', 
  createTicketsValidator('getTicketTypesByEvent'),
  ticketsController.getTicketTypesByEvent
);

router.put('/:id', 
  createTicketsValidator('updateTicketType'),
  ticketsController.updateTicketType
);

router.delete('/:id', 
  createTicketsValidator('deleteTicketType'),
  ticketsController.deleteTicketType
);

module.exports = router;
