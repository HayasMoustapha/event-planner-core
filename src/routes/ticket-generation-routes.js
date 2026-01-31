/**
 * Routes unifiées pour la génération de tickets
 * Structure optimisée avec Redis Queue
 * 
 * Routes :
 * POST /api/v1/tickets/generation-jobs - Créer un job de génération
 * GET /api/v1/tickets/generation-jobs/:job_id - Statut d'un job
 * GET /api/v1/events/:event_id/tickets/generation-jobs - Jobs d'un événement
 */

const express = require('express');
const router = express.Router();
const { SecurityMiddleware } = require('../../../shared');
const { 
  createTicketGenerationJob,
  getTicketGenerationJobStatus,
  getEventGenerationJobs
} = require('../controllers/unified-ticket-generation.controller');

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

/**
 * @route POST /api/v1/tickets/generation-jobs
 * @desc Créer un job de génération de tickets avec structure enrichie
 * @access Private (organisateur de l'événement)
 */
router.post('/tickets/generation-jobs', 
  SecurityMiddleware.withPermissions('tickets.jobs.create'), 
  createTicketGenerationJob
);

/**
 * @route GET /api/v1/tickets/generation-jobs/:job_id
 * @desc Récupérer le statut d'un job de génération
 * @access Private (organisateur de l'événement)
 */
router.get('/tickets/generation-jobs/:job_id', 
  SecurityMiddleware.withPermissions('tickets.jobs.read'), 
  getTicketGenerationJobStatus
);

/**
 * @route GET /api/v1/events/:event_id/tickets/generation-jobs
 * @desc Lister tous les jobs de génération pour un événement
 * @access Private (organisateur de l'événement)
 */
router.get('/events/:event_id/tickets/generation-jobs', 
  SecurityMiddleware.withPermissions(['manage_events']), 
  getEventGenerationJobs
);

module.exports = router;
