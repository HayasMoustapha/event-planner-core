const express = require('express');
const guestsController = require('./guests.controller');
const { validate, schemas } = require("../../middleware/validation");

const router = express.Router();

// Guest CRUD Operations
router.post('/', 
  validate(schemas.createGuest),
  guestsController.createGuest
);

router.get('/', 
  validate(schemas.pagination, 'query'),
  guestsController.getGuests
);

router.get('/:id', 
  validate(schemas.idParam, 'params'),
  guestsController.getGuest
);

router.put('/:id', 
  validate(schemas.idParam, 'params'),
  validate(schemas.updateGuest),
  guestsController.updateGuest
);

router.delete('/:id', 
  validate(schemas.idParam, 'params'),
  guestsController.deleteGuest
);

// Event Guest Management
router.get('/events/:eventId/guests', 
  validate(schemas.idParam, 'params'),
  validate(schemas.pagination, 'query'),
  guestsController.getEventGuests
);

router.post('/events/:eventId/guests', 
  validate(schemas.idParam, 'params'),
  guestsController.addGuestToEvent
);

router.post('/events/:eventId/guests/bulk', 
  validate(schemas.idParam, 'params'),
  guestsController.bulkAddGuestsToEvent
);

// Check-in Operations
router.post('/check-in', 
  validate(schemas.checkInGuest),
  guestsController.checkInGuest
);

router.post('/events/:eventId/guests/:guestId/checkin', 
  validate(schemas.idParam, 'params'),
  guestsController.checkInGuestById
);

// Statistics
router.get('/events/:eventId/stats', 
  validate(schemas.idParam, 'params'),
  guestsController.getGuestStats
);

module.exports = router;
