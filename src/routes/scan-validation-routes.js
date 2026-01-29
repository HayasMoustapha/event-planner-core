/**
 * Routes pour la consultation des données de scan de billets
 * Définit les endpoints HTTP pour la LECTURE SEULE des données de validation
 * 
 * Routes :
 * GET /api/v1/events/:event_id/scan/history - Historique des scans (LECTURE SEULE)
 * 
 * NOTE : La validation réelle des billets est gérée par scan-validation-service
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
  getScanHistory 
} = require('../controllers/scan-validation-controller');

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectEventContext());

// Apply error handler for all routes
const scanValidationErrorHandler = ErrorHandlerFactory.createScanValidationErrorHandler();
router.use(scanValidationErrorHandler);

/**
 * @route GET /api/v1/events/:event_id/scan/history
 * @desc Récupérer l'historique des scans pour un événement (LECTURE SEULE)
 * @access Private (organisateur de l'événement)
 * @param event_id - ID de l'événement
 * @query {
 *   page: number (défaut: 1),
 *   limit: number (défaut: 50),
 *   date_from: string (ISO date),
 *   date_to: string (ISO date)
 * }
 * @note Les données proviennent de scan-validation-service
 */
router.get('/events/:event_id/scan/history', SecurityMiddleware.withPermissions(['manage_events']), async (req, res) => {
  await getScanHistory(req, res, req.db);
});

module.exports = router;
