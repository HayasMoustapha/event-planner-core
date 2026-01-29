/**
 * Routes pour la validation de scan de billets
 * Définit les endpoints HTTP pour la validation en temps réel des billets
 * 
 * Routes :
 * POST /api/v1/scan/validate - Valider un billet scanné
 * GET /api/v1/events/:event_id/scan/history - Historique des scans
 */

const express = require('express');
const router = express.Router();
const { 
  validateScannedTicket, 
  getScanHistory 
} = require('../controllers/scan-validation-controller');
const { requireAuth, requireEventOrganizer } = require('../middleware/auth-middleware');

/**
 * @route POST /api/v1/scan/validate
 * @desc Valider un billet scanné en temps réel
 * @access Private (nécessite permission scan_ticket)
 * @body {
 *   ticket_code: string,
 *   event_id: number
 * }
 */
router.post('/scan/validate', requireAuth, async (req, res) => {
  await validateScannedTicket(req, res, req.db);
});

/**
 * @route GET /api/v1/events/:event_id/scan/history
 * @desc Récupérer l'historique des scans pour un événement
 * @access Private (organisateur de l'événement)
 * @param event_id - ID de l'événement
 * @query {
 *   page: number (défaut: 1),
 *   limit: number (défaut: 50),
 *   date_from: string (ISO date),
 *   date_to: string (ISO date)
 * }
 */
router.get('/events/:event_id/scan/history', requireAuth, requireEventOrganizer, async (req, res) => {
  await getScanHistory(req, res, req.db);
});

module.exports = router;
