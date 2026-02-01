/**
 * Routes pour la consultation des données de scan de billets
 * Définit les endpoints HTTP pour la LECTURE SEULE des données de validation
 * 
 * Routes :
 * GET /api/v1/events/:event_id/scan/history - Historique des scans (LECTURE SEULE)
 * POST /api/internal/scans/validate - Validation interne de ticket (pour Scan-Validation Service)
 * GET /api/internal/scans/record/:ticketId - Consultation scan record (lecture seule depuis Scan-Validation)
 * 
 * NOTE : La validation réelle des billets est gérée par scan-validation-service
 * NOTE : Chaque service garde ses données propres, communication via API
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
  getScanHistory,
  validateTicketInternal,
  getScanRecordFromValidationService
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
 * @note Les données proviennent de la base locale event-planner-core
 */
router.get('/events/:event_id/scan/history', SecurityMiddleware.withPermissions(['manage_events']), async (req, res) => {
  await getScanHistory(req, res, req.db);
});

/**
 * @route POST /api/internal/scans/validate
 * @desc Validation interne de ticket (appelé par Scan-Validation Service)
 * @access Internal (service-to-service)
 * @body {
 *   ticketId: string,
 *   eventId: string,
 *   ticketType: string,
 *   scanContext: object,
 *   validationMetadata: object
 * }
 * @note Effectue la validation métier LOCALE et met à jour le ticket
 */
router.post('/api/internal/scans/validate', async (req, res) => {
  await validateTicketInternal(req, res, req.db);
});

/**
 * @route GET /api/internal/scans/record/:ticketId
 * @desc Consulte le scan record d'un ticket depuis Scan-Validation Service (LECTURE SEULE)
 * @access Internal (service-to-service)
 * @param ticketId - ID du ticket à consulter
 * @note Appelle Scan-Validation Service pour récupérer les logs de scan
 */
router.get('/api/internal/scans/record/:ticketId', async (req, res) => {
  await getScanRecordFromValidationService(req, res, req.db);
});

module.exports = router;
