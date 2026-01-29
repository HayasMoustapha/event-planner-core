/**
 * Controller pour la gestion des paiements
 * Gère les endpoints HTTP pour les opérations de paiement
 * 
 * Principes :
 * - Validation des permissions utilisateur
 * - Communication avec payment-service
 * - Gestion des webhooks
 * - Logs structurés pour audit
 */

const { initiatePayment, getPaymentStatus, cancelPayment, handlePaymentWebhook } = require('../services/payment-service');

/**
 * Initialise un paiement pour un événement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function createPayment(req, res) {
  try {
    const {
      event_id,
      amount,
      currency = 'EUR',
      payment_method,
      customer_info,
      return_url,
      cancel_url,
      description
    } = req.body;
    
    const user_id = req.user.id;
    
    // Validation des données d'entrée
    if (!event_id) {
      return res.status(400).json({
        success: false,
        error: 'event_id est obligatoire',
        code: 'MISSING_EVENT_ID'
      });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount doit être positif',
        code: 'INVALID_AMOUNT'
      });
    }
    
    if (!payment_method || !['stripe', 'paypal'].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        error: 'payment_method doit être "stripe" ou "paypal"',
        code: 'INVALID_PAYMENT_METHOD'
      });
    }
    
    // Vérification que l'utilisateur est organisateur de l'événement
    const eventQuery = `
      SELECT id, title, organizer_id 
      FROM events 
      WHERE id = $1 AND organizer_id = $2
    `;
    
    const eventResult = await db.query(eventQuery, [event_id, user_id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes pour cet événement',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    const event = eventResult.rows[0];
    
    // Préparation des données de paiement
    const paymentData = {
      event_id: event.id,
      organizer_id: user_id,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      payment_method: payment_method,
      customer_info: customer_info || {},
      metadata: {
        event_title: event.title,
        organizer_name: req.user.email || req.user.name,
        description: description || `Paiement pour ${event.title}`,
        return_url: return_url,
        cancel_url: cancel_url
      }
    };
    
    // Initialisation du paiement
    const result = await initiatePayment(paymentData, db);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result,
        message: 'Paiement initialisé avec succès'
      });
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('[PAYMENT_CONTROLLER] Erreur création paiement:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de l\'initialisation du paiement',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Récupère le statut d'un paiement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function getPayment(req, res) {
  try {
    const { payment_intent_id } = req.params;
    const user_id = req.user.id;
    
    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'payment_intent_id est obligatoire',
        code: 'MISSING_PAYMENT_INTENT_ID'
      });
    }
    
    // Récupération du statut du paiement
    const result = await getPaymentStatus(payment_intent_id, db);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    // Vérification que l'utilisateur a les permissions pour voir ce paiement
    const permissionQuery = `
      SELECT id FROM payments 
      WHERE payment_intent_id = $1 AND organizer_id = $2
    `;
    
    const permissionResult = await db.query(permissionQuery, [payment_intent_id, user_id]);
    
    if (permissionResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes pour ce paiement',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result.payment,
      message: 'Statut du paiement récupéré avec succès'
    });
    
  } catch (error) {
    console.error('[PAYMENT_CONTROLLER] Erreur récupération statut paiement:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la récupération du statut',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Annule un paiement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function cancelPaymentIntent(req, res) {
  try {
    const { payment_intent_id } = req.params;
    const user_id = req.user.id;
    
    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'payment_intent_id est obligatoire',
        code: 'MISSING_PAYMENT_INTENT_ID'
      });
    }
    
    // Vérification que l'utilisateur a les permissions pour annuler ce paiement
    const permissionQuery = `
      SELECT id FROM payments 
      WHERE payment_intent_id = $1 AND organizer_id = $2
    `;
    
    const permissionResult = await db.query(permissionQuery, [payment_intent_id, user_id]);
    
    if (permissionResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes pour ce paiement',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // Annulation du paiement
    const result = await cancelPayment(payment_intent_id, db);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result,
        message: 'Paiement annulé avec succès'
      });
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('[PAYMENT_CONTROLLER] Erreur annulation paiement:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de l\'annulation du paiement',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Traite un webhook du service de paiement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function handleWebhook(req, res) {
  try {
    const webhookData = req.body;
    
    // Validation des données du webhook
    if (!webhookData.payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'payment_intent_id est obligatoire dans le webhook',
        code: 'MISSING_PAYMENT_INTENT_ID'
      });
    }
    
    if (!webhookData.status) {
      return res.status(400).json({
        success: false,
        error: 'status est obligatoire dans le webhook',
        code: 'MISSING_STATUS'
      });
    }
    
    // Persistance du webhook en base pour audit
    await persistWebhook(webhookData, db);
    
    // Traitement du webhook
    const result = await handlePaymentWebhook(webhookData, db);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Webhook traité avec succès'
      });
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('[PAYMENT_CONTROLLER] Erreur traitement webhook:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors du traitement du webhook',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Liste les paiements pour un événement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function getEventPayments(req, res) {
  try {
    const { event_id } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const user_id = req.user.id;
    
    // Vérification que l'utilisateur est organisateur de l'événement
    const eventQuery = `
      SELECT id FROM events 
      WHERE id = $1 AND organizer_id = $2
    `;
    
    const eventResult = await db.query(eventQuery, [event_id, user_id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes pour cet événement',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // Construction de la requête
    let query = `
      SELECT 
        id,
        payment_intent_id,
        payment_service_id,
        amount,
        currency,
        payment_method,
        status,
        created_at,
        updated_at,
        completed_at,
        error_message
      FROM payments 
      WHERE event_id = $1
    `;
    
    const params = [event_id];
    
    // Filtre par statut
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    
    // Tri et pagination
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, (page - 1) * limit);
    
    const result = await db.query(query, params);
    
    // Comptage total
    let countQuery = `SELECT COUNT(*) FROM payments WHERE event_id = $1`;
    const countParams = [event_id];
    
    if (status) {
      countQuery += ` AND status = $2`;
      countParams.push(status);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.status(200).json({
      success: true,
      data: {
        payments: result.rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: total,
          total_pages: Math.ceil(total / limit)
        }
      },
      message: 'Paiements récupérés avec succès'
    });
    
  } catch (error) {
    console.error('[PAYMENT_CONTROLLER] Erreur liste paiements événement:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la récupération des paiements',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Persiste un webhook en base pour audit
 * @param {Object} webhookData - Données du webhook
 * @param {Object} db - Instance de base de données
 */
async function persistWebhook(webhookData, db) {
  try {
    const query = `
      INSERT INTO payment_webhooks (
        payment_intent_id,
        webhook_type,
        webhook_data,
        processed
      ) VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    
    const values = [
      webhookData.payment_intent_id,
      `payment_${webhookData.status}`,
      JSON.stringify(webhookData),
      false
    ];
    
    await db.query(query, values);
    
  } catch (error) {
    console.error('[PAYMENT_CONTROLLER] Erreur persistance webhook:', error.message);
    // Ne pas throw l'erreur pour ne pas bloquer le traitement
  }
}

module.exports = {
  createPayment,
  getPayment,
  cancelPaymentIntent,
  handleWebhook,
  getEventPayments
};
