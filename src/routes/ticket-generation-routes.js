/**
 * Routes pour la génération de billets
 * Définit les endpoints HTTP pour la gestion des jobs de génération de billets
 * 
 * Routes :
 * POST /api/v1/events/:event_id/tickets/generate - Créer un job de génération
 * GET /api/v1/tickets/generation/:job_id - Récupérer le statut d'un job
 * GET /api/v1/events/:event_id/tickets/generation - Lister les jobs d'un événement
 */

const express = require('express');
const router = express.Router();
const { 
  createTicketGenerationJob, 
  getTicketGenerationJobStatus, 
  getEventGenerationJobs 
} = require('../controllers/ticket-generation-controller');
const { requireAuth, requireEventOrganizer } = require('../middleware/auth-middleware');

/**
 * @route POST /api/v1/events/:event_id/tickets/generate
 * @desc Créer un nouveau job de génération de billets pour un événement
 * @access Private (organisateur de l'événement)
 * @body {
 *   event_id: number,
 *   tickets: [
 *     {
 *       ticket_id: number,
 *       ticket_code: string,
 *       template_path: string,
 *       render_payload: object
 *     }
 *   ]
 * }
 */
router.post('/events/:event_id/tickets/generate', requireAuth, requireEventOrganizer, async (req, res) => {
  // Ajout de event_id depuis les params dans le body
  req.body.event_id = parseInt(req.params.event_id);
  
  // Le controller utilisera req.user (défini par le middleware d'auth)
  // et req.db (défini par le middleware de base de données)
  await createTicketGenerationJob(req, res, req.db);
});

/**
 * @route GET /api/v1/tickets/generation/:job_id
 * @desc Récupérer le statut d'un job de génération de billets
 * @access Private (organisateur de l'événement)
 * @param job_id - UUID du job
 */
router.get('/tickets/generation/:job_id', requireAuth, async (req, res) => {
  await getTicketGenerationJobStatus(req, res, req.db);
});

/**
 * @route GET /api/v1/events/:event_id/tickets/generation
 * @desc Lister tous les jobs de génération pour un événement
 * @access Private (organisateur de l'événement)
 * @param event_id - ID de l'événement
 * @query {
 *   page: number (défaut: 1),
 *   limit: number (défaut: 10),
 *   status: string ('pending', 'processing', 'completed', 'failed')
 * }
 */
router.get('/events/:event_id/tickets/generation', requireAuth, requireEventOrganizer, async (req, res) => {
  await getEventGenerationJobs(req, res, req.db);
});

module.exports = router;
