/**
 * Routes pour recevoir les webhooks du Payment Service
 * 
 * Ces routes permettent à Payment-Service d'envoyer des notifications
 * pour qu'Event-Planner-Core puisse mettre à jour ses propres tables
 */

const express = require('express');
const router = express.Router();

// Import du controller
const paymentWebhookController = require('../controllers/payment-webhook.controller');

// Middleware pour wrapper les controllers et injecter req.db
function wrapController(controllerFn) {
  return (req, res, next) => {
    console.log('[PAYMENT_WEBHOOK_ROUTE] Entering:', req.method, req.originalUrl);
    
    // Appeler le controller avec req, res, next (req.db est déjà injecté par le middleware)
    Promise.resolve(controllerFn(req, res, next))
      .then(() => {
        console.log('[PAYMENT_WEBHOOK_ROUTE] Exiting:', req.originalUrl);
      })
      .catch((error) => {
        console.error('[PAYMENT_WEBHOOK_ROUTE] Error:', error.message);
        next(error);
      });
  };
}

/**
 * POST /api/internal/payment-webhook
 * Reçoit un webhook du Payment Service
 * 
 * Corps de la requête :
 * {
 *   "eventType": "payment.completed|payment.failed|payment.canceled",
 *   "paymentIntentId": "string",
 *   "status": "string",
 *   "timestamp": "ISO string",
 *   "data": {
 *     "source": "payment-service",
 *     "payment_service_id": "string",
 *     "gateway": "stripe|paypal|cinetpay",
 *     "amount": "number",
 *     "currency": "EUR",
 *     "completed_at": "ISO string",
 *     "error_message": "string|null",
 *     "template_id": "number|null",
 *     "event_id": "number|null",
 *     "ticket_ids": "array|null"
 *   }
 * }
 * 
 * Headers requis :
 * - X-Service-Name: payment-service
 * - X-Request-ID: string
 * - X-Timestamp: ISO string
 * - X-Webhook-Signature: HMAC-SHA256
 */
router.post('/payment-webhook', wrapController(paymentWebhookController.receivePaymentWebhook));

module.exports = router;
