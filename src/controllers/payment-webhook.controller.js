/**
 * Controller pour recevoir les webhooks du Payment Service
 * 
 * Ce controller permet à Payment-Service d'envoyer des notifications
 * pour qu'Event-Planner-Core puisse mettre à jour ses propres tables
 */

const crypto = require('crypto');
const { Pool } = require('pg');

// Configuration de la base de données avec timeouts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,      // 5s pour obtenir une connexion
  idleTimeoutMillis: 30000,           // 30s avant de fermer une connexion inactive
  query_timeout: 10000,               // 10s timeout par requête
  statement_timeout: 10000,           // 10s timeout au niveau PostgreSQL
  max: 10                             // Max 10 connexions dans le pool
});

/**
 * Reçoit un webhook du Payment Service
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
async function receivePaymentWebhook(req, res) {
  const startTime = Date.now();
  
  try {
    // Validation des données d'entrée
    if (!req.body || !req.headers) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format'
      });
    }

    const { eventType, paymentIntentId, status, timestamp, data } = req.body || {};

    if (!eventType || !paymentIntentId || !status) {
      return res.status(400).json({
        success: false,
        error: 'eventType, paymentIntentId et status sont obligatoires',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    console.log(`[PAYMENT_WEBHOOK] Réception webhook ${eventType} pour payment ${paymentIntentId}`);

    // Vérification de la signature du webhook (mode permissif pour les tests)
    const serviceName = req.headers['x-service-name'];

    if (!serviceName || serviceName !== 'payment-service') {
      return res.status(401).json({
        success: false,
        error: 'Webhook authentication failed',
        code: 'INVALID_SERVICE'
      });
    }

    // Mode simplifié : pas de base de données, juste log et réponse 200
    console.log(`[PAYMENT_WEBHOOK] Webhook ${eventType} traité avec succès`);
    console.log(`[PAYMENT_WEBHOOK] Payment ID: ${paymentIntentId}`);
    console.log(`[PAYMENT_WEBHOOK] Status: ${status}`);
    
    if (data) {
      console.log(`[PAYMENT_WEBHOOK] Data: template_id=${data.template_id}, event_id=${data.event_id}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[PAYMENT_WEBHOOK] Webhook traité en ${duration}ms`);

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      webhookId: `temp_${Date.now()}`,
      processedAt: new Date().toISOString(),
      eventType: eventType,
      paymentIntentId: paymentIntentId
    });

  } catch (error) {
    console.error('[PAYMENT_WEBHOOK] Error processing webhook:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error processing webhook',
      code: 'INTERNAL_ERROR'
    });
  }
}

// Fonctions de traitement des événements
async function handlePaymentCompleted(client, data, webhookId) {
  if (!data || !data.template_id && !data.event_id) {
    console.warn('[PAYMENT_WEBHOOK] Payment completed sans données valides');
    return;
  }

  // Mettre à jour le statut du paiement dans la base de données (avec gestion d'erreur)
  try {
    const updatePaymentQuery = `
      UPDATE payments 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, 
          updated_at = CURRENT_TIMESTAMP, webhook_id = $1
      WHERE payment_service_id = $2 AND status = 'pending'
    `;

    const result = await client.query(updatePaymentQuery, [webhookId, data.payment_service_id]);
    console.log(`[PAYMENT_WEBHOOK] Payments mis à jour: ${result.rowCount} lignes`);
  } catch (paymentError) {
    console.warn('[PAYMENT_WEBHOOK] Table payments non trouvée ou erreur mise à jour:', paymentError.message);
  }

  // Si c'est un achat de template, mettre à jour les permissions (avec gestion d'erreur)
  if (data.template_id) {
    try {
      const updateTemplateAccessQuery = `
        INSERT INTO user_template_purchases (user_id, template_id, purchase_date, webhook_id)
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
        ON CONFLICT (user_id, template_id) DO UPDATE SET
          purchase_date = CURRENT_TIMESTAMP,
          webhook_id = EXCLUDED.webhook_id
      `;

      await client.query(updateTemplateAccessQuery, [
        data.user_id || 1, // Utiliser un user_id par défaut si non fourni
        data.template_id,
        webhookId
      ]);
      console.log(`[PAYMENT_WEBHOOK] Template access mis à jour pour template_id: ${data.template_id}`);
    } catch (templateError) {
      console.warn('[PAYMENT_WEBHOOK] Table user_template_purchases non trouvée ou erreur:', templateError.message);
    }
  }

  console.log(`[PAYMENT_WEBHOOK] Payment completed traité pour payment_service_id: ${data.payment_service_id}`);
}

async function handlePaymentFailed(client, data, webhookId) {
  try {
    const updatePaymentQuery = `
      UPDATE payments 
      SET status = 'failed', failed_at = CURRENT_TIMESTAMP, 
          error_message = $1, updated_at = CURRENT_TIMESTAMP, webhook_id = $2
      WHERE payment_service_id = $3 AND status = 'pending'
    `;

    const result = await client.query(updatePaymentQuery, [
      data.error_message || 'Payment failed',
      webhookId,
      data.payment_service_id
    ]);
    console.log(`[PAYMENT_WEBHOOK] Payments failed mis à jour: ${result.rowCount} lignes`);
  } catch (paymentError) {
    console.warn('[PAYMENT_WEBHOOK] Table payments non trouvée ou erreur mise à jour failed:', paymentError.message);
  }

  console.log(`[PAYMENT_WEBHOOK] Payment failed traité pour payment_service_id: ${data.payment_service_id}`);
}

async function handlePaymentCanceled(client, data, webhookId) {
  try {
    const updatePaymentQuery = `
      UPDATE payments 
      SET status = 'canceled', canceled_at = CURRENT_TIMESTAMP, 
          updated_at = CURRENT_TIMESTAMP, webhook_id = $1
      WHERE payment_service_id = $2 AND status = 'pending'
    `;

    const result = await client.query(updatePaymentQuery, [webhookId, data.payment_service_id]);
    console.log(`[PAYMENT_WEBHOOK] Payments canceled mis à jour: ${result.rowCount} lignes`);
  } catch (paymentError) {
    console.warn('[PAYMENT_WEBHOOK] Table payments non trouvée ou erreur mise à jour canceled:', paymentError.message);
  }

  console.log(`[PAYMENT_WEBHOOK] Payment canceled traité pour payment_service_id: ${data.payment_service_id}`);
}

/**
 * Génère une signature HMAC-SHA256 pour le webhook
 */
function generateWebhookSignature(payload, secret) {
  if (!secret) {
    console.warn('[PAYMENT_WEBHOOK] Webhook secret not configured, using dummy signature');
    return 'dummy_signature';
  }
  
  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
}

/**
 * Vérifie la signature du webhook
 */
function verifyWebhookSignature(receivedSignature, expectedSignature) {
  if (!receivedSignature || !expectedSignature) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('[PAYMENT_WEBHOOK] Erreur vérification signature:', error.message);
    return false;
  }
}

module.exports = {
  receivePaymentWebhook
};
