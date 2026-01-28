const express = require('express');
const invitationsController = require('./invitations.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');

const router = express.Router();

// Apply context injection for all routes
router.use(ContextInjector.injectEventContext());

// Apply error handler for all routes
router.use(require('./invitations.errorHandler'));

// Invitation Management
router.post('/send', 
  SecurityMiddleware.withPermissions('events.invitations.send'), 
  ValidationMiddleware.createInvitationsValidator('sendInvitations'),
  invitationsController.sendInvitations
);

// Get invitations by event
router.get('/event/:eventId', 
  SecurityMiddleware.withPermissions('events.invitations.read'),
  invitationsController.getInvitationsByEvent
);

// Get invitation stats by event
router.get('/event/:eventId/stats', 
  SecurityMiddleware.withPermissions('events.invitations.read'),
  invitationsController.getInvitationStats
);

// Get invitation by code (public access for guests)
router.get('/code/:invitation_code', 
  invitationsController.getInvitationByCode
);

// Respond to invitation (public access for guests)
router.post('/code/:invitation_code/respond', 
  ValidationMiddleware.createInvitationsValidator('respondToInvitation'),
  invitationsController.respondToInvitation
);

// Delete invitation (organizer only)
router.delete('/:id', 
  SecurityMiddleware.withPermissions('events.invitations.delete'),
  invitationsController.deleteInvitation
);

module.exports = router;
