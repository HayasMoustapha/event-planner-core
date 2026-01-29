/**
 * Routes pour la gestion des paiements
 * Définit les endpoints HTTP pour les opérations de paiement
 * 
 * Routes :
 * POST /api/v1/payments/initiate - Initialiser un paiement
 * GET /api/v1/payments/:payment_intent_id - Récupérer le statut d'un paiement
 * POST /api/v1/payments/:payment_intent_id/cancel - Annuler un paiement
 * POST /api/v1/payments/webhooks - Traiter un webhook de paiement
 * GET /api/v1/events/:event_id/payments - Lister les paiements d'un événement
 */

const express = require('express');
const router = express.Router();
const { 
  createPayment, 
  getPayment, 
  cancelPaymentIntent, 
  handleWebhook,
  getEventPayments
} = require('../controllers/payment-controller');
const { requireAuth, requireEventOrganizer } = require('../middleware/auth-middleware');

/**
 * @route POST /api/v1/payments/initiate
 * @desc Initialiser un nouveau paiement pour un événement
 * @access Private (organisateur de l'événement)
 * @body {
 *   event_id: number,
 *   amount: number,
 *   currency: string (défaut: 'EUR'),
 *   payment_method: string ('stripe' | 'paypal'),
 *   customer_info: object,
 *   return_url: string,
 *   cancel_url: string,
 *   description: string
 * }
 */
router.post('/payments/initiate', requireAuth, async (req, res) => {
  await createPayment(req, res, req.db);
});

/**
 * @route GET /api/v1/payments/:payment_intent_id
 * @desc Récupérer le statut d'un paiement
 * @access Private (propriétaire du paiement)
 * @param payment_intent_id - UUID du paiement
 */
router.get('/payments/:payment_intent_id', requireAuth, async (req, res) => {
  await getPayment(req, res, req.db);
});

/**
 * @route POST /api/v1/payments/:payment_intent_id/cancel
 * @desc Annuler un paiement en attente
 * @access Private (propriétaire du paiement)
 * @param payment_intent_id - UUID du paiement
 */
router.post('/payments/:payment_intent_id/cancel', requireAuth, async (req, res) => {
  await cancelPaymentIntent(req, res, req.db);
});

/**
 * @route POST /api/v1/payments/webhooks
 * @desc Traiter un webhook du service de paiement
 * @access Public (endpoint pour payment-service)
 * @body {
 *   payment_intent_id: string,
 *   status: string,
 *   completed_at: string,
 *   error_message: string,
 *   metadata: object
 * }
 */
router.post('/payments/webhooks', async (req, res) => {
  await handleWebhook(req, res, req.db);
});

/**
 * @route GET /api/v1/events/:event_id/payments
 * @desc Lister tous les paiements pour un événement
 * @access Private (organisateur de l'événement)
 * @param event_id - ID de l'événement
 * @query {
 *   page: number (défaut: 1),
 *   limit: number (défaut: 10),
 *   status: string ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')
 * }
 */
router.get('/events/:event_id/payments', requireAuth, requireEventOrganizer, async (req, res) => {
  await getEventPayments(req, res, req.db);
});

module.exports = router;
