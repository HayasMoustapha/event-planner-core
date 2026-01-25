const express = require('express');
const eventsController = require('./events.controller');
const { authenticate, requirePermission } = require("../../../../shared");
const { validate, schemas } = require("../../middleware/validation");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// CRUD Operations
router.post('/', 
  requirePermission('events.create'),
  validate(schemas.createEvent),
  eventsController.createEvent
);

router.get('/', 
  requirePermission('events.read'),
  validate(schemas.pagination, 'query'),
  eventsController.getEvents
);

router.get('/stats', 
  requirePermission('events.read'),
  eventsController.getEventStats
);

router.get('/:id', 
  requirePermission('events.read'),
  validate(schemas.idParam, 'params'),
  eventsController.getEvent
);

router.put('/:id', 
  requirePermission('events.update'),
  validate(schemas.idParam, 'params'),
  validate(schemas.updateEvent),
  eventsController.updateEvent
);

router.delete('/:id', 
  requirePermission('events.delete'),
  validate(schemas.idParam, 'params'),
  eventsController.deleteEvent
);

// Event Lifecycle Management
router.post('/:id/publish', 
  requirePermission('events.publish'),
  validate(schemas.idParam, 'params'),
  eventsController.publishEvent
);

router.post('/:id/archive', 
  requirePermission('events.archive'),
  validate(schemas.idParam, 'params'),
  eventsController.archiveEvent
);

module.exports = router;