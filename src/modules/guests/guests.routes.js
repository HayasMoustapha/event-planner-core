const express = require('express');
const guestsController = require('./guests.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectUserContext());

// Guest CRUD Operations
router.post('/', ValidationMiddleware.createGuestsValidator('createGuest'), guestsController.createGuest);

router.get('/', guestsController.getGuests);

router.get('/:id', guestsController.getGuestById);

router.put('/:id', ValidationMiddleware.createGuestsValidator('updateGuest'), guestsController.updateGuest);

router.delete('/:id', guestsController.deleteGuest);

// Event Guest Management
router.get('/events/:eventId/guests', guestsController.getEventGuests);

router.post('/events/:eventId/guests', guestsController.addGuestsToEvent);

router.post('/events/:eventId/guests/bulk', guestsController.bulkAddGuestsToEvent);

// Check-in Operations
router.post('/check-in', guestsController.checkInGuest);

router.post('/events/:eventId/guests/:guestId/checkin', guestsController.checkInGuestById);

// Statistics
router.get('/events/:eventId/stats', guestsController.getEventGuestStats);

module.exports = router;
