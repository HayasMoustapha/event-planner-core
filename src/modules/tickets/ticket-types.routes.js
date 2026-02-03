const express = require('express');
const ticketsController = require('./tickets.controller');
const { SecurityMiddleware, ValidationMiddleware } = require('../../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Ticket Type Management
router.get('/', 
  SecurityMiddleware.withPermissions('tickets.types.read'),
  ValidationMiddleware.createTicketsValidator('getAllTicketTypes'),
  ticketsController.getAllTicketTypes
);

router.post('/', 
  SecurityMiddleware.withPermissions('tickets.types.create'),
  ValidationMiddleware.createTicketsValidator('createTicketType'),
  ticketsController.createTicketType
);

router.get('/:id', SecurityMiddleware.withPermissions('tickets.types.read'), ticketsController.getTicketTypeById);

// Verifier pourauoi ca fait planter le serveur
router.get('/events/:eventId/types', SecurityMiddleware.withPermissions('tickets.types.read'), ticketsController.getTicketTypesByEvent);

router.put('/:id', 
  SecurityMiddleware.withPermissions('tickets.types.update'),
  ValidationMiddleware.createTicketsValidator('updateTicketType'),
  ticketsController.updateTicketType
);

router.delete('/:id', 
  SecurityMiddleware.withPermissions('tickets.types.delete'),
  ValidationMiddleware.createTicketsValidator('deleteTicketType'),
  ticketsController.deleteTicketType
);

module.exports = router;
