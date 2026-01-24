const express = require('express');
const ticketGenerationJobsController = require('./ticket-generation-jobs.controller');
const { authenticate, requirePermission } = require("../../../../shared/");
const { validate, schemas } = require("../../middleware/validation");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Ticket Generation Jobs CRUD Operations
router.post('/', 
  requirePermission('tickets.create'),
  ticketGenerationJobsController.createJob
);

router.get('/', 
  requirePermission('tickets.read'),
  validate(schemas.pagination, 'query'),
  ticketGenerationJobsController.getJobs
);

router.get('/stats', 
  requirePermission('tickets.read'),
  ticketGenerationJobsController.getJobStats
);

router.get('/failed', 
  requirePermission('tickets.read'),
  ticketGenerationJobsController.getFailedJobs
);

router.get('/:id', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  ticketGenerationJobsController.getJob
);

router.put('/:id', 
  requirePermission('tickets.update'),
  validate(schemas.idParam, 'params'),
  ticketGenerationJobsController.updateJob
);

router.delete('/:id', 
  requirePermission('tickets.delete'),
  validate(schemas.idParam, 'params'),
  ticketGenerationJobsController.deleteJob
);

// Job Operations
router.post('/:id/process', 
  requirePermission('tickets.process'),
  validate(schemas.idParam, 'params'),
  ticketGenerationJobsController.processJob
);

router.post('/:id/retry', 
  requirePermission('tickets.process'),
  validate(schemas.idParam, 'params'),
  ticketGenerationJobsController.retryFailedJob
);

router.post('/:id/cancel', 
  requirePermission('tickets.update'),
  validate(schemas.idParam, 'params'),
  ticketGenerationJobsController.cancelJob
);

// Event-specific jobs
router.get('/events/:eventId/jobs', 
  requirePermission('tickets.read'),
  validate(schemas.idParam, 'params'),
  validate(schemas.pagination, 'query'),
  ticketGenerationJobsController.getJobsByEvent
);

module.exports = router;
