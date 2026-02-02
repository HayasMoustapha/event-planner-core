const express = require('express');
const Joi = require('joi');
const guestsController = require('./guests.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');
const guestsErrorHandler = require('./guests.errorHandler');
const { uploadGuestsFile } = require('../../middleware/upload.middleware');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectUserContext());

// Apply error handler for all routes
router.use(guestsErrorHandler);

// Guest CRUD Operations
router.post('/', SecurityMiddleware.withPermissions('guests.create'), ValidationMiddleware.createGuestsValidator('createGuest'), guestsController.createGuest);

// GET routes - avec permission spécifique
router.get('/', SecurityMiddleware.withPermissions('guests.read'), guestsController.getGuests);

router.get('/:id', SecurityMiddleware.withPermissions('guests.read'), guestsController.getGuestById);

router.put('/:id', SecurityMiddleware.withPermissions('guests.update'), ValidationMiddleware.createGuestsValidator('updateGuest'), guestsController.updateGuest);

router.delete('/:id', SecurityMiddleware.withPermissions('guests.delete'), guestsController.deleteGuest);

// Event Guest Management - GET routes avec permission spécifique
router.get('/events/:eventId/guests', SecurityMiddleware.withPermissions('guests.read'), guestsController.getEventGuests);

router.get('/events/:eventId/guests/associations', SecurityMiddleware.withPermissions('guests.read'), guestsController.getEventGuestAssociations);

router.post('/events/:eventId/guests', SecurityMiddleware.withPermissions('guests.create'), guestsController.addGuestsToEvent);

router.post('/events/:eventId/guests/bulk', SecurityMiddleware.withPermissions('guests.create'), guestsController.bulkAddGuestsToEvent);

// Check-in Operations
router.post('/check-in', SecurityMiddleware.withPermissions('guests.checkin'), guestsController.checkInGuest);

router.post('/events/:eventId/guests/:guestId/checkin', SecurityMiddleware.withPermissions('guests.checkin'), guestsController.checkInGuestById);

// Statistics - GET routes avec permission spécifique
router.get('/events/:eventId/stats', SecurityMiddleware.withPermissions('guests.stats.read'), guestsController.getEventGuestStats);

// Import guests from CSV/Excel file
router.post('/events/:eventId/guests/import', 
  SecurityMiddleware.withPermissions('guests.create'), 
  uploadGuestsFile, 
  guestsController.importGuests
);

module.exports = router;
