/**
 * Controller pour recevoir les webhooks du Ticket Generator Service
 * 
 * Ce controller permet à Ticket-Generator Service d'envoyer des notifications
 * pour qu'Event-Planner-Core puisse mettre à jour ses tables de tickets
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
 * Reçoit un webhook du Ticket Generator Service
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
async function receiveTicketGenerationWebhook(req, res) {
  const startTime = Date.now();
  
  try {
    const { eventType, jobId, status, timestamp, data } = req.body;
    
    console.log(`[TICKET_WEBHOOK] Réception webhook ${eventType} pour job ${jobId}`);
    
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
    if (!eventType || !jobId || !status) {
      return res.status(400).json({
        success: false,
        error: 'eventType, jobId et status sont obligatoires',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    // 3. Traiter le webhook selon le type d'événement
    let result;
    switch (eventType) {
      case 'ticket.completed':
        result = await handleTicketGenerationCompleted(jobId, data);
        break;
      case 'ticket.failed':
        result = await handleTicketGenerationFailed(jobId, data);
        break;
      case 'ticket.partial':
        result = await handleTicketGenerationPartial(jobId, data);
        break;
      default:
        console.warn(`[TICKET_WEBHOOK] Type d'événement non géré: ${eventType}`);
        result = { success: true, message: 'Événement ignoré' };
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`[TICKET_WEBHOOK] Webhook traité en ${processingTime}ms pour job ${jobId}`);
    
    res.status(200).json({
      success: true,
      data: {
        jobId: jobId,
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
    console.error('[TICKET_WEBHOOK] Erreur traitement webhook:', error.message);
    
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
 * Gère une génération de tickets complétée avec succès
 * @param {number} jobId - ID du job de génération
 * @param {Object} data - Données de génération
 */
async function handleTicketGenerationCompleted(jobId, data) {
  const client = await pool.connect();
  
  try {
    // 1. Mettre à jour le statut du job dans ticket_generation_jobs
    const updateJobQuery = `
      UPDATE ticket_generation_jobs 
      SET 
        status = 'completed',
        completed_at = NOW(),
        tickets_processed = $1,
        updated_at = NOW()
      WHERE id = $2
    `;
    
    await client.query(updateJobQuery, [data.summary?.successful || 0, jobId]);
    console.log(`[TICKET_WEBHOOK] Job ${jobId} marqué comme complété`);
    
    // 2. Mettre à jour chaque ticket généré dans la table tickets
    let ticketsUpdated = 0;
    if (data.tickets && data.tickets.length > 0) {
      for (const ticket of data.tickets) {
        const updatedRows = await updateGeneratedTicket(client, ticket, 'completed');
        ticketsUpdated += updatedRows;
      }
    }
    
    // 3. Logger dans la console (pas de table de logs dans Event-Planner-Core)
    console.log(`[TICKET_WEBHOOK] Génération complétée pour job ${jobId}: ${data.summary?.successful || 0} tickets`);
    
    return {
      success: true,
      updates_applied: [
        'ticket_generation_jobs',
        'tickets (qr_code_data, ticket_file_url, ticket_file_path, generation_job_id)',
        'file_urls'
      ],
      tickets_updated: ticketsUpdated,
      tickets_received: data.tickets?.length || 0
    };
    
  } finally {
    client.release();
  }
}

/**
 * Gère une génération de tickets échouée
 * @param {number} jobId - ID du job de génération
 * @param {Object} data - Données de l'échec
 */
async function handleTicketGenerationFailed(jobId, data) {
  const client = await pool.connect();
  
  try {
    // 1. Mettre à jour le statut du job
    const updateJobQuery = `
      UPDATE ticket_generation_jobs 
      SET 
        status = 'failed',
        completed_at = NOW(),
        error_message = $1,
        updated_at = NOW()
      WHERE id = $2
    `;
    
    await client.query(updateJobQuery, [data.error || 'Échec de génération', jobId]);
    
    // 2. Mettre à jour les tickets avec statut échoué
    let ticketsUpdated = 0;
    if (data.tickets && data.tickets.length > 0) {
      for (const ticket of data.tickets) {
        const updatedRows = await updateGeneratedTicket(client, ticket, 'failed');
        ticketsUpdated += updatedRows;
      }
    }
    
    console.log(`[TICKET_WEBHOOK] Génération échouée pour job ${jobId}: ${data.error || 'Erreur inconnue'}`);
    
    return {
      success: true,
      updates_applied: [
        'ticket_generation_jobs',
        'tickets (mise à jour statut échec)'
      ],
      tickets_updated: ticketsUpdated,
      tickets_received: data.tickets?.length || 0
    };
    
  } finally {
    client.release();
  }
}

/**
 * Gère une génération de tickets partielle (certains réussis, d'autres échoués)
 * @param {number} jobId - ID du job de génération
 * @param {Object} data - Données de la génération partielle
 */
async function handleTicketGenerationPartial(jobId, data) {
  const client = await pool.connect();
  
  try {
    // 1. Mettre à jour le statut du job comme partiel
    const updateJobQuery = `
      UPDATE ticket_generation_jobs 
      SET 
        status = 'completed',
        completed_at = NOW(),
        tickets_processed = $1,
        error_message = $2,
        updated_at = NOW()
      WHERE id = $3
    `;
    
    await client.query(updateJobQuery, [
      data.summary?.successful || 0,
      `${data.summary?.failed || 0} tickets échoués sur ${data.summary?.total || 0}`,
      jobId
    ]);
    
    // 2. Mettre à jour les tickets selon leur statut individuel
    let ticketsUpdated = 0;
    if (data.tickets && data.tickets.length > 0) {
      for (const ticket of data.tickets) {
        const status = ticket.success ? 'completed' : 'failed';
        const updatedRows = await updateGeneratedTicket(client, ticket, status);
        ticketsUpdated += updatedRows;
      }
    }
    
    console.log(`[TICKET_WEBHOOK] Génération partielle pour job ${jobId}: ${data.summary?.successful || 0} succès, ${data.summary?.failed || 0} échecs`);
    
    return {
      success: true,
      updates_applied: [
        'ticket_generation_jobs',
        'tickets (mise à jour statut individuel)'
      ],
      tickets_updated: ticketsUpdated,
      tickets_received: data.tickets?.length || 0,
      summary: data.summary
    };
    
  } finally {
    client.release();
  }
}

/**
 * Met à jour un ticket généré dans la base de données
 * @param {Object} client - Client PostgreSQL
 * @param {Object} ticket - Données du ticket
 * @param {string} status - Statut du ticket
 */
async function updateGeneratedTicket(client, ticket, status) {
  const updateQuery = `
    UPDATE tickets 
    SET 
      qr_code_data = $1,
      ticket_file_url = $2,
      ticket_file_path = $3,
      generation_job_id = $4,
      updated_at = NOW()
    WHERE id = $5
  `;
  
  const result = await client.query(updateQuery, [
    ticket.qrCodeData || null,
    ticket.fileUrl || null,
    ticket.filePath || null,
    ticket.jobId || null,
    ticket.ticketId
  ]);
  
  // Vérifier que le ticket a bien été mis à jour
  if (result.rowCount === 0) {
    console.warn(`[TICKET_WEBHOOK] Ticket ${ticket.ticketId} non trouvé pour mise à jour`);
  } else {
    console.log(`[TICKET_WEBHOOK] Ticket ${ticket.ticketId} mis à jour avec fichier: ${ticket.fileUrl}`);
  }
  
  return result.rowCount;
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
    console.error('[TICKET_WEBHOOK] Erreur vérification signature:', error.message);
    return false;
  }
}

module.exports = {
  receiveTicketGenerationWebhook
};
