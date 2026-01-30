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
    const { eventType, paymentIntentId, status, timestamp, data } = req.body;
    
    console.log(`[PAYMENT_WEBHOOK] Réception webhook ${eventType} pour payment ${paymentIntentId}`);
    
    // 1. Validation de la signature du webhook
    const signature = req.headers['x-webhook-signature'];
    if (!signature) {
      return res.status(401).json({
        success: false,
        error: 'Signature manquante',
        code: 'MISSING_SIGNATURE'
      });
    }
    
    const isValidSignature = verifyWebhookSignature(req.body, signature);
    if (!isValidSignature) {
      return res.status(401).json({
        success: false,
        error: 'Signature invalide',
        code: 'INVALID_SIGNATURE'
      });
    }
    
    // 2. Validation des données d'entrée
    if (!eventType || !paymentIntentId || !status) {
      return res.status(400).json({
        success: false,
        error: 'eventType, paymentIntentId et status sont obligatoires',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    // 3. Traiter le webhook selon le type d'événement
    let result;
    switch (eventType) {
      case 'payment.completed':
        result = await handlePaymentCompleted(paymentIntentId, data, eventType);
        break;
      case 'payment.failed':
        result = await handlePaymentFailed(paymentIntentId, data, eventType);
        break;
      case 'payment.canceled':
        result = await handlePaymentCanceled(paymentIntentId, data, eventType);
        break;
      default:
        console.warn(`[PAYMENT_WEBHOOK] Type d'événement non géré: ${eventType}`);
        result = { success: true, message: 'Événement ignoré' };
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`[PAYMENT_WEBHOOK] Webhook traité en ${processingTime}ms pour payment ${paymentIntentId}`);
    
    res.status(200).json({
      success: true,
      data: {
        paymentIntentId: paymentIntentId,
        eventType: eventType,
        status: status,
        processed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        result: result
      },
      webhookId: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: 'Webhook traité avec succès'
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[PAYMENT_WEBHOOK] Erreur traitement webhook:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement du webhook',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      processing_time_ms: processingTime
    });
  }
}

/**
 * Gère un paiement complété
 * @param {string} paymentIntentId - ID du paiement
 * @param {Object} data - Données du paiement
 * @param {string} eventType - Type d'événement webhook
 */
async function handlePaymentCompleted(paymentIntentId, data, eventType) {
  const client = await pool.connect();
  
  try {
    // 1. Mettre à jour la table purchases si c'est un achat de template
    if (data.template_id) {
      const updatePurchaseQuery = `
        UPDATE purchases 
        SET 
          payment_status = 'completed',
          payment_gateway = $2,
          payment_intent_id = $3,
          payment_completed_at = NOW(),
          completed_at = NOW(),
          updated_at = NOW()
        WHERE transaction_id = $1
      `;
      
      await client.query(updatePurchaseQuery, [
        paymentIntentId,
        data.gateway || 'stripe',
        data.payment_service_id || paymentIntentId
      ]);
      console.log(`[PAYMENT_WEBHOOK] Purchase mise à jour pour payment ${paymentIntentId}`);
    }
    
    // 2. Logger dans la console (pas de table de logs dans Event-Planner-Core)
    // Les logs techniques appartiennent à Payment-Service
    console.log(`[PAYMENT_WEBHOOK] Webhook ${eventType} traité pour payment ${paymentIntentId}`);
    
    // 3. Mettre à jour le statut des tickets si applicable
    if (data.event_id && data.ticket_ids) {
      await updateTicketsStatus(client, data.ticket_ids, 'paid', data);
    }
    
    return {
      success: true,
      updates_applied: [
        'purchases',
        'webhook_logs',
        'tickets (if applicable)'
      ]
    };
    
  } finally {
    client.release();
  }
}

/**
 * Gère un paiement échoué
 * @param {string} paymentIntentId - ID du paiement
 * @param {Object} data - Données du paiement
 * @param {string} eventType - Type d'événement webhook
 */
async function handlePaymentFailed(paymentIntentId, data, eventType) {
  const client = await pool.connect();
  
  try {
    // 1. Mettre à jour la table purchases
    if (data.template_id) {
      const updatePurchaseQuery = `
        UPDATE purchases 
        SET 
          payment_status = 'failed',
          payment_gateway = $2,
          payment_intent_id = $3,
          updated_at = NOW()
        WHERE transaction_id = $1
      `;
      
      await client.query(updatePurchaseQuery, [
        paymentIntentId,
        data.gateway || 'stripe',
        data.payment_service_id || paymentIntentId
      ]);
    }
    
    // 2. Logger dans la console (pas de table de logs dans Event-Planner-Core)
    console.log(`[PAYMENT_WEBHOOK] Webhook ${eventType} traité pour payment ${paymentIntentId}`);
    
    // 3. Mettre à jour le statut des tickets si applicable
    if (data.event_id && data.ticket_ids) {
      await updateTicketsStatus(client, data.ticket_ids, 'payment_failed', data);
    }
    
    return {
      success: true,
      updates_applied: [
        'purchases',
        'webhook_logs',
        'tickets (if applicable)'
      ]
    };
    
  } finally {
    client.release();
  }
}

/**
 * Gère un paiement annulé
 * @param {string} paymentIntentId - ID du paiement
 * @param {Object} data - Données du paiement
 * @param {string} eventType - Type d'événement webhook
 */
async function handlePaymentCanceled(paymentIntentId, data, eventType) {
  const client = await pool.connect();
  
  try {
    // 1. Mettre à jour la table purchases
    if (data.template_id) {
      const updatePurchaseQuery = `
        UPDATE purchases 
        SET 
          payment_status = 'canceled',
          payment_gateway = $2,
          payment_intent_id = $3,
          updated_at = NOW()
        WHERE transaction_id = $1
      `;
      
      await client.query(updatePurchaseQuery, [
        paymentIntentId,
        data.gateway || 'stripe',
        data.payment_service_id || paymentIntentId
      ]);
    }
    
    // 2. Logger dans la console (pas de table de logs dans Event-Planner-Core)
    console.log(`[PAYMENT_WEBHOOK] Webhook ${eventType} traité pour payment ${paymentIntentId}`);
    
    // 3. Mettre à jour le statut des tickets si applicable
    if (data.event_id && data.ticket_ids) {
      await updateTicketsStatus(client, data.ticket_ids, 'canceled', data);
    }
    
    return {
      success: true,
      updates_applied: [
        'purchases',
        'webhook_logs',
        'tickets (if applicable)'
      ]
    };
    
  } finally {
    client.release();
  }
}

/**
 * Met à jour le statut des tickets
 * @param {Object} client - Client PostgreSQL
 * @param {Array} ticketIds - IDs des tickets
 * @param {string} status - Nouveau statut
 * @param {Object} data - Données supplémentaires
 */
async function updateTicketsStatus(client, ticketIds, status, data) {
  if (!ticketIds || ticketIds.length === 0) {
    return;
  }
  
  const updateQuery = `
    UPDATE tickets 
    SET 
      payment_status = $1,
      payment_gateway = $2,
      payment_intent_id = $3,
      payment_completed_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = ANY($4)
  `;
  
  await client.query(updateQuery, [
    status,
    data.gateway || 'stripe',
    data.payment_service_id || data.paymentIntentId,
    ticketIds
  ]);
}

/**
 * Vérifie la signature du webhook
 * @param {Object} payload - Données du webhook
 * @param {string} signature - Signature à vérifier
 * @returns {boolean} True si la signature est valide
 */
function verifyWebhookSignature(payload, signature) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
    const payloadString = JSON.stringify(payload);
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadString, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
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
