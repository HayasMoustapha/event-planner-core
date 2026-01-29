/**
 * Producteur Redis pour la génération de billets
 * Ce service permet à event-planner-core de créer des jobs de génération de billets
 * et de les envoyer dans la file d'attente Redis pour traitement par ticket-generator-service
 * 
 * Principes :
 * - Communication asynchrone via BullMQ
 * - Payload exact selon les spécifications du plan
 * - Gestion des erreurs et retry automatique
 * - Logs structurés pour monitoring
 */

const { v4: uuidv4 } = require('uuid');
const { createQueue } = require('../../../../../../shared/config/redis-config');

// Nom de la queue pour la génération de billets
const TICKET_GENERATION_QUEUE = 'ticket_generation_queue';

/**
 * Crée et configure la queue de génération de billets
 * @returns {Queue} Instance Bull Queue configurée
 */
function createTicketGenerationQueue() {
  return createQueue(TICKET_GENERATION_QUEUE);
}

/**
 * Crée un job de génération de billets selon les spécifications exactes
 * @param {Object} jobData - Données du job de génération
 * @param {number} jobData.event_id - ID de l'événement
 * @param {Array} jobData.tickets - Liste des tickets à générer
 * @param {Object} options - Options du job
 * @returns {Promise<Object>} Job créé
 */
async function createTicketGenerationJob(jobData, options = {}) {
  // Validation des données obligatoires
  if (!jobData.event_id) {
    throw new Error('event_id est obligatoire pour la génération de billets');
  }
  
  if (!jobData.tickets || !Array.isArray(jobData.tickets) || jobData.tickets.length === 0) {
    throw new Error('tickets est obligatoire et doit être un tableau non vide');
  }

  // Validation de chaque ticket
  for (const ticket of jobData.tickets) {
    if (!ticket.ticket_id) {
      throw new Error('ticket_id est obligatoire pour chaque ticket');
    }
    if (!ticket.ticket_code) {
      throw new Error('ticket_code est obligatoire pour chaque ticket');
    }
    if (!ticket.template_path) {
      throw new Error('template_path est obligatoire pour chaque ticket');
    }
    if (!ticket.render_payload) {
      throw new Error('render_payload est obligatoire pour chaque ticket');
    }
  }

  // Création du payload exact selon les spécifications
  const payload = {
    job_id: uuidv4(), // UUID unique pour idempotence
    event_id: jobData.event_id,
    tickets: jobData.tickets.map(ticket => ({
      ticket_id: ticket.ticket_id,
      ticket_code: ticket.ticket_code,
      template_path: ticket.template_path,
      render_payload: ticket.render_payload
    }))
  };

  // Options par défaut du job
  const defaultOptions = {
    // Priorité haute pour les billets (plus petit = plus prioritaire)
    priority: 1,
    // Tentatives en cas d'échec
    attempts: 5,
    // Backoff exponentiel
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    // Supprimer le job après 24h
    removeOnComplete: 100,
    removeOnFail: 50
  };

  // Fusion des options
  const jobOptions = { ...defaultOptions, ...options };

  try {
    // Création de la queue
    const queue = createTicketGenerationQueue();
    
    // Ajout du job dans la queue
    const job = await queue.add('generate-tickets', payload, jobOptions);
    
    console.log(`[TICKET_GENERATION] Job créé: ${job.id} pour l'événement ${jobData.event_id}`);
    console.log(`[TICKET_GENERATION] Nombre de tickets: ${jobData.tickets.length}`);
    console.log(`[TICKET_GENERATION] Job ID: ${payload.job_id}`);
    
    return {
      job_id: job.id,
      generation_job_id: payload.job_id,
      event_id: jobData.event_id,
      tickets_count: jobData.tickets.length,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[TICKET_GENERATION] Erreur création job:`, error.message);
    throw new Error(`Impossible de créer le job de génération: ${error.message}`);
  }
}

/**
 * Récupère le statut d'un job de génération
 * @param {string} jobId - ID du job Bull
 * @returns {Promise<Object>} Statut du job
 */
async function getTicketGenerationJobStatus(jobId) {
  try {
    const queue = createTicketGenerationQueue();
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return {
        error: 'Job non trouvé',
        status: 'not_found'
      };
    }

    const jobState = await job.getState();
    const jobProgress = job.progress();
    
    return {
      job_id: jobId,
      status: jobState,
      progress: jobProgress,
      data: job.data,
      created_at: job.timestamp,
      processed_at: job.processedOn,
      finished_at: job.finishedOn,
      failed_reason: job.failedReason
    };
    
  } catch (error) {
    console.error(`[TICKET_GENERATION] Erreur récupération statut job ${jobId}:`, error.message);
    throw new Error(`Impossible de récupérer le statut du job: ${error.message}`);
  }
}

/**
 * Annule un job de génération en cours
 * @param {string} jobId - ID du job Bull
 * @returns {Promise<boolean>} True si annulé avec succès
 */
async function cancelTicketGenerationJob(jobId) {
  try {
    const queue = createTicketGenerationQueue();
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return false;
    }

    // Annulation du job
    await job.remove();
    
    console.log(`[TICKET_GENERATION] Job ${jobId} annulé`);
    return true;
    
  } catch (error) {
    console.error(`[TICKET_GENERATION] Erreur annulation job ${jobId}:`, error.message);
    throw new Error(`Impossible d'annuler le job: ${error.message}`);
  }
}

/**
 * Récupère les statistiques de la queue
 * @returns {Promise<Object>} Statistiques de la queue
 */
async function getQueueStats() {
  try {
    const queue = createTicketGenerationQueue();
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length
    };
    
  } catch (error) {
    console.error('[TICKET_GENERATION] Erreur récupération stats queue:', error.message);
    throw new Error(`Impossible de récupérer les statistiques: ${error.message}`);
  }
}

module.exports = {
  createTicketGenerationQueue,
  createTicketGenerationJob,
  getTicketGenerationJobStatus,
  cancelTicketGenerationJob,
  getQueueStats,
  TICKET_GENERATION_QUEUE
};
