/**
 * Routes pour la consultation des jobs de génération de billets
 * Définit les endpoints HTTP pour la LECTURE SEULE des jobs de génération
 * 
 * Routes :
 * GET /api/v1/tickets/generation/:job_id - Statut d'un job (LECTURE SEULE)
 * GET /api/v1/events/:event_id/tickets/generation - Jobs d'un événement (LECTURE SEULE)
 * 
 * NOTE : La génération réelle des billets est gérée par ticket-generator-service
 */

const express = require('express');
const router = express.Router();
const { 
  SecurityMiddleware, 
  ContextInjector, 
  ValidationMiddleware,
  ErrorHandlerFactory
} = require('../../../shared');
const { 
  getTicketGenerationJobStatus, 
  getEventGenerationJobs,
  createTicketGenerationJob,
  createModernTicketGenerationJob
} = require('../controllers/ticket-generation-controller');

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectEventContext());

// Apply error handler for all routes
const ticketGenerationErrorHandler = ErrorHandlerFactory.createTicketGeneratorErrorHandler();
router.use(ticketGenerationErrorHandler);

/**
 * @route GET /api/v1/tickets/generation/:job_id
 * @desc Récupérer le statut d'un job de génération de billets (LECTURE SEULE)
 * @access Private (organisateur de l'événement)
 * @param job_id - UUID du job
 * @note Les données proviennent de ticket-generator-service
 */
router.get('/tickets/generation/:job_id', SecurityMiddleware.authenticated(), async (req, res) => {
  await getTicketGenerationJobStatus(req, res, req.db);
});

/**
 * @route GET /api/v1/events/:event_id/tickets/generation
 * @desc Lister tous les jobs de génération pour un événement (LECTURE SEULE)
 * @access Private (organisateur de l'événement)
 * @param event_id - ID de l'événement
 * @query {
 *   page: number (défaut: 1),
 *   limit: number (défaut: 10),
 *   status: string ('pending', 'processing', 'completed', 'failed')
 * }
 * @note Les données proviennent de ticket-generator-service
 */
router.get('/events/:event_id/tickets/generation', SecurityMiddleware.withPermissions(['manage_events']), async (req, res) => {
  await getEventGenerationJobs(req, res, req.db);
});


// Initiation du job pour la creation d'un ticket (structure moderne)
router.post('/jobs', SecurityMiddleware.withPermissions('tickets.jobs.create'), async (req, res) => {
  await createModernTicketGenerationJob(req, res, req.db);
});

// Route alternative pour l'ancienne structure (compatibilité)
router.post('/jobs/legacy', SecurityMiddleware.withPermissions('tickets.jobs.create'), async (req, res) => {
  await createTicketGenerationJob(req, res, req.db);
});

module.exports = router;
