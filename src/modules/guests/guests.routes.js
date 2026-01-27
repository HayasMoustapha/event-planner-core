const express = require('express');
const Joi = require('joi');
const guestsController = require('./guests.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');
const guestsErrorHandler = require('./guests.errorHandler');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectUserContext());

// Apply error handler for all routes
router.use(guestsErrorHandler);

// Guest CRUD Operations
router.post('/', ValidationMiddleware.createGuestsValidator('createGuest'), guestsController.createGuest);

// GET routes - validation simple et cohérente
router.get('/', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled').optional()
}), guestsController.getGuests);

router.get('/:id', ValidationMiddleware.validateParams({
  id: Joi.number().integer().positive().required()
}), guestsController.getGuestById);

router.put('/:id', ValidationMiddleware.createGuestsValidator('updateGuest'), guestsController.updateGuest);

router.delete('/:id', guestsController.deleteGuest);

// Event Guest Management - GET routes avec validation
router.get('/events/:eventId/guests', ValidationMiddleware.validateParams({
  eventId: Joi.number().integer().positive().required()
}), ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled').optional()
}), guestsController.getEventGuests);

router.post('/events/:eventId/guests', guestsController.addGuestsToEvent);

router.post('/events/:eventId/guests/bulk', guestsController.bulkAddGuestsToEvent);

// Check-in Operations
router.post('/check-in', guestsController.checkInGuest);

router.post('/events/:eventId/guests/:guestId/checkin', guestsController.checkInGuestById);

// Statistics - GET routes avec validation
router.get('/events/:eventId/stats', ValidationMiddleware.validateParams({
  eventId: Joi.number().integer().positive().required()
}), guestsController.getEventGuestStats);

module.exports = router;
