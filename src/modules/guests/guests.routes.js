const express = require('express');
const guestsController = require('./guests.controller');
const { authenticate, requirePermission, validate, schemas } = require('../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Guest CRUD Operations
router.post('/', 
  requirePermission('guests.create'),
  validate(schemas.createGuest),
  guestsController.createGuest
);

router.get('/', 
  requirePermission('guests.read'),
  validate(schemas.pagination, 'query'),
  guestsController.getGuests
);

router.get('/:id', 
  requirePermission('guests.read'),
  validate(schemas.idParam, 'params'),
  guestsController.getGuest
);

router.put('/:id', 
  requirePermission('guests.update'),
  validate(schemas.idParam, 'params'),
  validate(schemas.updateGuest),
  guestsController.updateGuest
);

router.delete('/:id', 
  requirePermission('guests.delete'),
  validate(schemas.idParam, 'params'),
  guestsController.deleteGuest
);

// Event Guest Management
router.get('/events/:eventId/guests', 
  requirePermission('guests.read'),
  validate(schemas.idParam, 'params'),
  validate(schemas.pagination, 'query'),
  guestsController.getEventGuests
);

router.post('/events/:eventId/guests', 
  requirePermission('guests.create'),
  validate(schemas.idParam, 'params'),
  guestsController.addGuestToEvent
);

router.post('/events/:eventId/guests/bulk', 
  requirePermission('guests.create'),
  validate(schemas.idParam, 'params'),
  guestsController.bulkAddGuestsToEvent
);

// Check-in Operations
router.post('/check-in', 
  requirePermission('guests.update'),
  validate(schemas.checkInGuest),
  guestsController.checkInGuest
);

// Statistics
router.get('/events/:eventId/stats', 
  requirePermission('guests.read'),
  validate(schemas.idParam, 'params'),
  guestsController.getGuestStats
);

module.exports = router;
