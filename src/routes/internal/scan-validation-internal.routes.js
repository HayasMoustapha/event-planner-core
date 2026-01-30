/**
 * Routes internes pour la validation de tickets (utilisées par Scan-Validation Service)
 * 
 * IMPORTANT : Ces routes sont INTERNES et utilisées UNIQUEMENT par Scan-Validation Service
 * Elles évitent les appels circulaires en effectuant la validation métier localement
 * 
 * Architecture :
 * Scan-Validation Service -> Event-Planner-Core (ces routes) -> Base de données
 * PAS D'APPEL RETOUR à Scan-Validation Service
 */

const express = require('express');
const router = express.Router();

// Import des controllers internes
const scanValidationController = require('../../controllers/internal/scan-validation-internal.controller');

/**
 * POST /api/internal/validation/validate-ticket
 * Validation d'un ticket via appel interne de Scan-Validation Service
 * 
 * Corps de la requête :
 * {
 *   "ticketId": "uuid",
 *   "eventId": "uuid", 
 *   "ticketType": "standard|vip|premium",
 *   "userId": "uuid",
 *   "scanContext": {
 *     "location": "string",
 *     "deviceId": "string",
 *     "timestamp": "ISO string",
 *     "operatorId": "uuid",
 *     "checkpointId": "string"
 *   },
 *   "validationMetadata": {
 *     "qrVersion": "string",
 *     "qrAlgorithm": "string",
 *     "validatedAt": "ISO string"
 *   }
 * }
 */
router.post('/validation/validate-ticket', scanValidationController.validateTicketInternal);

/**
 * GET /api/internal/tickets/:ticketId/status
 * Vérification du statut d'un ticket
 * 
 * Paramètres :
 * - ticketId: UUID du ticket
 */
router.get('/tickets/:ticketId/status', scanValidationController.checkTicketStatus);

module.exports = router;
