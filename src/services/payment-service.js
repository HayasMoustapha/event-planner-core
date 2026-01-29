/**
 * Service de paiement pour event-planner-core
 * Gère la communication avec payment-service via HTTP synchrone
 * 
 * Principes :
 * - Communication HTTP synchrone avec payment-service
 * - Gestion des webhooks pour les callbacks de paiement
 * - Support Stripe et PayPal
 * - Idempotence via payment_intent_id
 * - Logs structurés pour audit
 */

const axios = require('axios');

// Configuration du service de paiement
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';
const PAYMENT_TIMEOUT = parseInt(process.env.PAYMENT_TIMEOUT_MS) || 10000; // 10 secondes max

/**
 * Initialise un paiement pour un événement
 * @param {Object} paymentData - Données du paiement
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Résultat de l'initialisation
 */
async function initiatePayment(paymentData, db) {
  const startTime = Date.now();
  
  try {
    // Validation des données obligatoires
    if (!paymentData.event_id) {
      throw new Error('event_id est obligatoire');
    }
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('amount doit être positif');
    }
    
    if (!paymentData.currency) {
      throw new Error('currency est obligatoire');
    }
    
    if (!paymentData.payment_method) {
      throw new Error('payment_method est obligatoire (stripe/paypal)');
    }
    
    console.log(`[PAYMENT_SERVICE] Initialisation paiement pour événement ${paymentData.event_id}`);
    
    // Persistance en base de données locale
    const paymentRecord = await persistPaymentRecord(paymentData, db);
    
    // Préparation du payload pour le service de paiement
    const paymentPayload = {
      payment_intent_id: paymentRecord.payment_intent_id,
      event_id: paymentData.event_id,
      organizer_id: paymentData.organizer_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payment_method: paymentData.payment_method,
      customer_info: paymentData.customer_info || {},
      metadata: {
        event_title: paymentData.event_title,
        organizer_name: paymentData.organizer_name,
        description: paymentData.description || `Paiement pour ${paymentData.event_title}`,
        return_url: paymentData.return_url,
        cancel_url: paymentData.cancel_url
      }
    };
    
    // Appel synchrone au service de paiement
    const paymentResponse = await callPaymentService('/api/payments/initiate', paymentPayload);
    
    // Mise à jour du record local avec les infos du service de paiement
    await updatePaymentRecordWithServiceData(paymentRecord.id, paymentResponse, db);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`[PAYMENT_SERVICE] Paiement initialisé en ${processingTime}ms: ${paymentRecord.payment_intent_id}`);
    
    return {
      success: true,
      payment_intent_id: paymentRecord.payment_intent_id,
      payment_id: paymentRecord.id,
      payment_url: paymentResponse.payment_url,
      client_secret: paymentResponse.client_secret,
      payment_method: paymentData.payment_method,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      processing_time_ms: processingTime
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[PAYMENT_SERVICE] Erreur initialisation paiement:', error.message);
    
    // Gestion des erreurs spécifiques
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Timeout du service de paiement',
        code: 'PAYMENT_TIMEOUT',
        processing_time_ms: processingTime
      };
    }
    
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Service de paiement indisponible',
        code: 'PAYMENT_SERVICE_UNAVAILABLE',
        processing_time_ms: processingTime
      };
    }
    
    return {
      success: false,
      error: error.message,
      code: 'PAYMENT_INIT_ERROR',
      processing_time_ms: processingTime
    };
  }
}

/**
 * Récupère le statut d'un paiement
 * @param {string} paymentIntentId - ID du payment intent
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Statut du paiement
 */
async function getPaymentStatus(paymentIntentId, db) {
  try {
    // Récupération depuis la base de données locale
    const localQuery = `
      SELECT 
        id,
        payment_intent_id,
        event_id,
        organizer_id,
        amount,
        currency,
        payment_method,
        status,
        payment_service_id,
        client_secret,
        payment_url,
        error_message,
        created_at,
        updated_at,
        completed_at
      FROM payments 
      WHERE payment_intent_id = $1
    `;
    
    const localResult = await db.query(localQuery, [paymentIntentId]);
    
    if (localResult.rows.length === 0) {
      return {
        success: false,
        error: 'Paiement non trouvé',
        code: 'PAYMENT_NOT_FOUND'
      };
    }
    
    const payment = localResult.rows[0];
    
    // Si le paiement est encore en attente, vérifier le statut auprès du service
    if (payment.status === 'pending' && payment.payment_service_id) {
      try {
        const serviceResponse = await callPaymentService(`/api/payments/${payment.payment_service_id}/status`);
        
        // Mise à jour du statut local si différent
        if (serviceResponse.status !== payment.status) {
          await updatePaymentStatus(payment.id, {
            status: serviceResponse.status,
            completed_at: serviceResponse.completed_at,
            error_message: serviceResponse.error_message
          }, db);
          
          payment.status = serviceResponse.status;
          payment.completed_at = serviceResponse.completed_at;
          payment.error_message = serviceResponse.error_message;
        }
        
      } catch (error) {
        console.warn(`[PAYMENT_SERVICE] Impossible de vérifier le statut du service: ${error.message}`);
      }
    }
    
    return {
      success: true,
      payment: {
        id: payment.id,
        payment_intent_id: payment.payment_intent_id,
        event_id: payment.event_id,
        amount: payment.amount,
        currency: payment.currency,
        payment_method: payment.payment_method,
        status: payment.status,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        completed_at: payment.completed_at,
        error_message: payment.error_message
      }
    };
    
  } catch (error) {
    console.error('[PAYMENT_SERVICE] Erreur récupération statut paiement:', error.message);
    throw new Error(`Impossible de récupérer le statut du paiement: ${error.message}`);
  }
}

/**
 * Annule un paiement
 * @param {string} paymentIntentId - ID du payment intent
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Résultat de l'annulation
 */
async function cancelPayment(paymentIntentId, db) {
  try {
    // Récupération du paiement local
    const payment = await getPaymentStatus(paymentIntentId, db);
    
    if (!payment.success) {
      return payment;
    }
    
    // Vérifier que le paiement peut être annulé
    if (payment.payment.status !== 'pending') {
      return {
        success: false,
        error: 'Seuls les paiements en attente peuvent être annulés',
        code: 'PAYMENT_NOT_CANCELLABLE'
      };
    }
    
    // Appel au service de paiement pour annulation
    if (payment.payment.payment_service_id) {
      const cancelResponse = await callPaymentService(`/api/payments/${payment.payment.payment_service_id}/cancel`, {
        reason: 'cancelled_by_user'
      });
      
      // Mise à jour du statut local
      await updatePaymentStatus(payment.payment.id, {
        status: 'cancelled',
        completed_at: new Date().toISOString()
      }, db);
      
      console.log(`[PAYMENT_SERVICE] Paiement ${paymentIntentId} annulé avec succès`);
      
      return {
        success: true,
        payment_intent_id: paymentIntentId,
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      };
    }
    
    return {
      success: false,
      error: 'Impossible d\'annuler le paiement',
      code: 'CANCEL_ERROR'
    };
    
  } catch (error) {
    console.error('[PAYMENT_SERVICE] Erreur annulation paiement:', error.message);
    throw new Error(`Impossible d'annuler le paiement: ${error.message}`);
  }
}

/**
 * Traite un webhook du service de paiement
 * @param {Object} webhookData - Données du webhook
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Résultat du traitement
 */
async function handlePaymentWebhook(webhookData, db) {
  try {
    const { payment_intent_id, status, completed_at, error_message, metadata } = webhookData;
    
    if (!payment_intent_id) {
      throw new Error('payment_intent_id est obligatoire dans le webhook');
    }
    
    console.log(`[PAYMENT_SERVICE] Traitement webhook pour paiement ${payment_intent_id}: ${status}`);
    
    // Récupération du paiement local
    const payment = await getPaymentStatus(payment_intent_id, db);
    
    if (!payment.success) {
      return {
        success: false,
        error: 'Paiement non trouvé pour le webhook',
        code: 'WEBHOOK_PAYMENT_NOT_FOUND'
      };
    }
    
    // Mise à jour du statut
    const updateData = {
      status: status,
      completed_at: completed_at,
      error_message: error_message
    };
    
    const updatedPayment = await updatePaymentStatus(payment.payment.id, updateData, db);
    
    // Si le paiement est réussi, déclencher les actions post-paiement
    if (status === 'completed') {
      await handleSuccessfulPayment(payment.payment, db);
    }
    
    console.log(`[PAYMENT_SERVICE] Webhook traité pour paiement ${payment_intentId}`);
    
    return {
      success: true,
      payment_intent_id: payment_intent_id,
      status: status,
      updated_at: updatedPayment.updated_at
    };
    
  } catch (error) {
    console.error('[PAYMENT_SERVICE] Erreur traitement webhook:', error.message);
    throw new Error(`Impossible de traiter le webhook: ${error.message}`);
  }
}

/**
 * Persiste l'enregistrement de paiement en base
 * @param {Object} paymentData - Données du paiement
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Enregistrement créé
 */
async function persistPaymentRecord(paymentData, db) {
  try {
    const { v4: uuidv4 } = require('uuid');
    const paymentIntentId = uuidv4();
    
    const query = `
      INSERT INTO payments (
        payment_intent_id,
        event_id,
        organizer_id,
        amount,
        currency,
        payment_method,
        customer_info,
        metadata,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;
    
    const values = [
      paymentIntentId,
      paymentData.event_id,
      paymentData.organizer_id,
      paymentData.amount,
      paymentData.currency,
      paymentData.payment_method,
      JSON.stringify(paymentData.customer_info || {}),
      JSON.stringify(paymentData.metadata || {}),
      'pending'
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
    
  } catch (error) {
    console.error('[PAYMENT_SERVICE] Erreur persistance paiement:', error.message);
    throw new Error('Impossible de persister le paiement');
  }
}

/**
 * Met à jour le record de paiement avec les données du service
 * @param {number} paymentId - ID du paiement
 * @param {Object} serviceData - Données du service de paiement
 * @param {Object} db - Instance de base de données
 */
async function updatePaymentRecordWithServiceData(paymentId, serviceData, db) {
  try {
    const query = `
      UPDATE payments 
      SET 
        payment_service_id = $1,
        client_secret = $2,
        payment_url = $3,
        updated_at = NOW()
      WHERE id = $4
    `;
    
    await db.query(query, [
      serviceData.payment_service_id,
      serviceData.client_secret,
      serviceData.payment_url,
      paymentId
    ]);
    
  } catch (error) {
    console.error('[PAYMENT_SERVICE] Erreur mise à jour record paiement:', error.message);
    // Ne pas throw l'erreur pour ne pas bloquer le flow
  }
}

/**
 * Met à jour le statut d'un paiement
 * @param {number} paymentId - ID du paiement
 * @param {Object} updateData - Données de mise à jour
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Paiement mis à jour
 */
async function updatePaymentStatus(paymentId, updateData, db) {
  try {
    const query = `
      UPDATE payments 
      SET 
        status = $1,
        completed_at = COALESCE($2, completed_at),
        error_message = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const values = [
      updateData.status,
      updateData.completed_at,
      updateData.error_message,
      paymentId
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
    
  } catch (error) {
    console.error('[PAYMENT_SERVICE] Erreur mise à jour statut paiement:', error.message);
    throw new Error(`Impossible de mettre à jour le statut: ${error.message}`);
  }
}

/**
 * Appelle le service de paiement
 * @param {string} endpoint - Endpoint à appeler
 * @param {Object} payload - Données à envoyer
 * @returns {Promise<Object>} Réponse du service
 */
async function callPaymentService(endpoint, payload = {}) {
  try {
    const config = {
      timeout: PAYMENT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'event-planner-core',
        'X-Request-ID': `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    };
    
    let response;
    
    if (Object.keys(payload).length > 0) {
      response = await axios.post(`${PAYMENT_SERVICE_URL}${endpoint}`, payload, config);
    } else {
      response = await axios.get(`${PAYMENT_SERVICE_URL}${endpoint}`, config);
    }
    
    return response.data.data || response.data;
    
  } catch (error) {
    console.error('[PAYMENT_SERVICE] Erreur appel service paiement:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Timeout du service de paiement');
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Service de paiement indisponible');
    }
    
    if (error.response) {
      throw new Error(`Service paiement error: ${error.response.data.error || error.response.statusText}`);
    }
    
    throw new Error('Erreur lors de l\'appel au service de paiement');
  }
}

/**
 * Gère les actions post-paiement réussi
 * @param {Object} payment - Données du paiement
 * @param {Object} db - Instance de base de données
 */
async function handleSuccessfulPayment(payment, db) {
  try {
    // TODO: Implémenter les actions post-paiement
    // - Activer les fonctionnalités premium de l'événement
    // - Envoyer une confirmation de paiement
    // - Mettre à jour le statut de l'événement si nécessaire
    
    console.log(`[PAYMENT_SERVICE] Actions post-paiement pour ${payment.payment_intent_id}`);
    
  } catch (error) {
    console.error('[PAYMENT_SERVICE] Erreur actions post-paiement:', error.message);
  }
}

module.exports = {
  initiatePayment,
  getPaymentStatus,
  cancelPayment,
  handlePaymentWebhook
};
