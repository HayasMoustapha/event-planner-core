const express = require('express');
const ticketsController = require('./tickets.controller');
const { SecurityMiddleware, ValidationMiddleware } = require('../../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Ticket Type Management
router.post('/', 
  ValidationMiddleware.createTicketsValidator('createTicketType'),
  ticketsController.createTicketType
);

router.get('/:id', 
  ValidationMiddleware.createTicketsValidator('getTicketTypeById'),
  ticketsController.getTicketTypeById
);

// Verifier pourauoi ca fait planter le serveur
router.get('/events/:eventId/types', 
  ValidationMiddleware.createTicketsValidator('getTicketTypesByEvent'),
  ticketsController.getTicketTypesByEvent
);

router.put('/:id', 
  ValidationMiddleware.createTicketsValidator('updateTicketType'),
  ticketsController.updateTicketType
);

router.delete('/:id', 
  ValidationMiddleware.createTicketsValidator('deleteTicketType'),
  ticketsController.deleteTicketType
);

module.exports = router;
