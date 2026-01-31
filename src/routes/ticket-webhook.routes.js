/**
 * Routes pour recevoir les webhooks du Ticket Generator Service
 * 
 * Ces routes permettent à Ticket-Generator Service d'envoyer des notifications
 * pour qu'Event-Planner-Core puisse mettre à jour ses tables de tickets
 */

const express = require('express');
const router = express.Router();

// Import du controller
const ticketWebhookController = require('../controllers/ticket-webhook.controller');

// Middleware pour wrapper les controllers et injecter req.db
function wrapController(controllerFn) {
  return (req, res, next) => {
    console.log('[TICKET_WEBHOOK_ROUTE] Entering:', req.method, req.originalUrl);
    
    // Appeler le controller avec req, res, next (req.db est déjà injecté par le middleware)
    Promise.resolve(controllerFn(req, res, next))
      .then(() => {
        console.log('[TICKET_WEBHOOK_ROUTE] Exiting:', req.originalUrl);
      })
      .catch((error) => {
        console.error('[TICKET_WEBHOOK_ROUTE] Error:', error.message);
        next(error);
      });
  };
}

/**
 * POST /api/internal/ticket-generation-webhook
 * Reçoit un webhook du Ticket Generator Service
 * 
 * Corps de la requête :
 * {
 *   "eventType": "ticket.completed|ticket.failed|ticket.partial",
 *   "jobId": "number",
 *   "status": "string",
 *   "timestamp": "ISO string",
 *   "data": {
 *     "tickets": [
 *       {
 *         "ticketId": "number",
 *         "ticketCode": "string",
 *         "qrCodeData": "string",
 *         "fileUrl": "string",
 *         "filePath": "string",
 *         "generatedAt": "ISO string",
 *         "success": "boolean"
 *       }
 *     ],
 *     "summary": {
 *       "total": "number",
 *       "successful": "number",
 *       "failed": "number",
 *       "processingTime": "number"
 *     },
 *     "error": "string|null"
 *   }
 * }
 * 
 * Headers requis :
 * - X-Service-Name: ticket-generator-service
 * - X-Request-ID: string
 * - X-Timestamp: ISO string
 * - X-Webhook-Signature: HMAC-SHA256
 */
router.post('/ticket-generation-webhook', wrapController(ticketWebhookController.receiveTicketGenerationWebhook));

// Alias route for backward compatibility with tests
router.post('/ticket-webhook', wrapController(ticketWebhookController.receiveTicketGenerationWebhook));

module.exports = router;
