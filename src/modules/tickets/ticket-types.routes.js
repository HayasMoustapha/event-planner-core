const express = require('express');
const ticketsController = require('./tickets.controller');
const { validate, schemas } = require("../../middleware/validation");

const router = express.Router();

// Ticket Type Management
router.post('/', 
  ticketsController.createTicketType
);

router.get('/:id', 
  validate(schemas.idParam, 'params'),
  ticketsController.getTicketType
);

router.get('/events/:eventId/types', 
  validate(schemas.idParam, 'params'),
  validate(schemas.pagination, 'query'),
  ticketsController.getTicketTypesByEvent
);

router.put('/:id', 
  validate(schemas.idParam, 'params'),
  ticketsController.updateTicketType
);

router.delete('/:id', 
  validate(schemas.idParam, 'params'),
  ticketsController.deleteTicketType
);

module.exports = router;
