/**
 * Service de gestion des jobs de génération de billets
 * Ce service gère le cycle de vie complet des jobs de génération de billets
 * dans event-planner-core, y compris la création, le suivi et la mise à jour
 * 
 * Principes :
 * - Persistance des jobs en base de données
 * - Intégration avec le producteur Redis
 * - Mise à jour du statut des tickets
 * - Déclenchement des notifications post-génération
 */

const { createTicketGenerationJob, getTicketGenerationJobStatus } = require('./ticket-generation-producer');
const { createQueue } = require('../../../shared/config/redis-config');

// Nom de la queue pour les résultats de génération
const TICKET_GENERATION_RESULT_QUEUE = 'ticket_generation_result_queue';

/**
 * Crée un job de génération de billets et le persiste en base
 * @param {Object} jobData - Données du job
 * @param {number} jobData.event_id - ID de l'événement
 * @param {Array} jobData.tickets - Liste des tickets à générer
 * @param {number} jobData.created_by - ID de l'utilisateur qui déclenche
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Job créé avec ID
 */
async function createTicketGenerationJobService(jobData, db) {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Validation des permissions (l'utilisateur doit être organisateur de l'événement)
    const permissionQuery = `
      SELECT e.id, e.organizer_id 
      FROM events e 
      WHERE e.id = $1 AND e.organizer_id = $2
    `;
    
    const permissionResult = await client.query(permissionQuery, [jobData.event_id, jobData.created_by]);
    
    if (permissionResult.rows.length === 0) {
      throw new Error('Permissions insuffisantes pour générer des billets pour cet événement');
    }
    
    // Création du job en base de données
    const jobInsertQuery = `
      INSERT INTO ticket_generation_jobs (
        event_id, 
        status, 
        tickets_count, 
        created_by, 
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, uid, created_at
    `;
    
    const jobResult = await client.query(jobInsertQuery, [
      jobData.event_id,
      'pending',
      jobData.tickets.length,
      jobData.created_by
    ]);
    
    const dbJob = jobResult.rows[0];
    
    // Création du job Redis avec l'UUID de la base de données
    const redisJob = await createTicketGenerationJob({
      event_id: jobData.event_id,
      tickets: jobData.tickets
    }, {
      jobId: dbJob.uid.toString() // Utiliser l'UUID comme ID Redis pour idempotence
    });
    
    // Mise à jour du job en base avec l'ID Redis
    const updateJobQuery = `
      UPDATE ticket_generation_jobs 
      SET redis_job_id = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await client.query(updateJobQuery, [redisJob.job_id, dbJob.id]);
    
    await client.query('COMMIT');
    
    console.log(`[JOB_SERVICE] Job de génération créé: ${dbJob.uid} (Redis: ${redisJob.job_id})`);
    
    return {
      job_id: dbJob.id,
      job_uid: dbJob.uid,
      redis_job_id: redisJob.job_id,
      event_id: jobData.event_id,
      tickets_count: jobData.tickets.length,
      status: 'pending',
      created_at: dbJob.created_at
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[JOB_SERVICE] Erreur création job:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Récupère le statut d'un job de génération
 * @param {string} jobUid - UUID du job
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Statut complet du job
 */
async function getTicketGenerationJobStatusService(jobUid, db) {
  const client = await db.connect();
  
  try {
    // Récupération du job en base
    const jobQuery = `
      SELECT 
        jg.id,
        jg.uid,
        jg.event_id,
        jg.status,
        jg.tickets_count,
        jg.redis_job_id,
        jg.error_message,
        jg.created_at,
        jg.updated_at,
        jg.completed_at,
        e.title as event_title
      FROM ticket_generation_jobs jg
      JOIN events e ON e.id = jg.event_id
      WHERE jg.uid = $1
    `;
    
    const jobResult = await client.query(jobQuery, [jobUid]);
    
    if (jobResult.rows.length === 0) {
      throw new Error('Job non trouvé');
    }
    
    const dbJob = jobResult.rows[0];
    
    // Si le job a un ID Redis, récupérer le statut Redis
    let redisStatus = null;
    if (dbJob.redis_job_id) {
      try {
        redisStatus = await getTicketGenerationJobStatus(dbJob.redis_job_id);
      } catch (error) {
        console.warn(`[JOB_SERVICE] Impossible de récupérer le statut Redis: ${error.message}`);
      }
    }
    
    return {
      job_id: dbJob.id,
      job_uid: dbJob.uid,
      event_id: dbJob.event_id,
      event_title: dbJob.event_title,
      status: dbJob.status,
      tickets_count: dbJob.tickets_count,
      redis_status: redisStatus,
      error_message: dbJob.error_message,
      created_at: dbJob.created_at,
      updated_at: dbJob.updated_at,
      completed_at: dbJob.completed_at
    };
    
  } catch (error) {
    console.error('[JOB_SERVICE] Erreur récupération statut job:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Met à jour le statut d'un job après traitement par ticket-generator-service
 * @param {Object} resultData - Données de retour du traitement
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Job mis à jour
 */
async function updateTicketGenerationJobResult(resultData, db) {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Récupération du job via le job_id
    const jobQuery = `
      SELECT id, uid, event_id, status, tickets_count
      FROM ticket_generation_jobs 
      WHERE uid = $1
    `;
    
    const jobResult = await client.query(jobQuery, [resultData.job_id]);
    
    if (jobResult.rows.length === 0) {
      throw new Error(`Job ${resultData.job_id} non trouvé`);
    }
    
    const job = jobResult.rows[0];
    
    // Mise à jour du statut du job
    const updateJobQuery = `
      UPDATE ticket_generation_jobs 
      SET 
        status = $1,
        error_message = $2,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
    `;
    
    const status = resultData.status === 'completed' ? 'completed' : 'failed';
    const errorMessage = resultData.status === 'completed' ? null : (resultData.error || 'Erreur inconnue');
    
    await client.query(updateJobQuery, [status, errorMessage, job.id]);
    
    // Si le traitement est réussi, mettre à jour les tickets
    if (resultData.status === 'completed' && resultData.results) {
      for (const result of resultData.results) {
        const updateTicketQuery = `
          UPDATE tickets 
          SET 
            qr_code_data = $1,
            ticket_file_url = $2,
            updated_at = NOW()
          WHERE id = $3
        `;
        
        await client.query(updateTicketQuery, [
          result.qr_code_data,
          result.file_url,
          result.ticket_id
        ]);
      }
      
      console.log(`[JOB_SERVICE] ${resultData.results.length} tickets mis à jour pour le job ${resultData.job_id}`);
    }
    
    await client.query('COMMIT');
    
    console.log(`[JOB_SERVICE] Job ${resultData.job_id} mis à jour avec le statut: ${status}`);
    
    return {
      job_id: job.id,
      job_uid: job.uid,
      event_id: job.event_id,
      status: status,
      tickets_updated: resultData.results ? resultData.results.length : 0,
      completed_at: new Date().toISOString()
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[JOB_SERVICE] Erreur mise à jour job:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Démarre le consommateur pour les résultats de génération
 * @param {Object} db - Instance de base de données
 */
function startTicketGenerationResultConsumer(db) {
  const queue = createQueue(TICKET_GENERATION_RESULT_QUEUE);
  
  console.log('[JOB_SERVICE] Démarrage consommateur des résultats de génération');
  
  queue.process('generation-result', async (job) => {
    const { data } = job;
    
    try {
      console.log(`[JOB_SERVICE] Traitement résultat pour job: ${data.job_id}`);
      
      // Mise à jour du job en base
      const result = await updateTicketGenerationJobResult(data, db);
      
      // Si le traitement est réussi, déclencher les notifications
      if (data.status === 'completed') {
        // TODO: Déclencher les notifications d'envoi de billets
        console.log(`[JOB_SERVICE] Notifications à déclencher pour job: ${data.job_id}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`[JOB_SERVICE] Erreur traitement résultat job ${data.job_id}:`, error.message);
      throw error;
    }
  });
  
  // Gestion des erreurs de la queue
  queue.on('error', (error) => {
    console.error('[JOB_SERVICE] Erreur queue résultats:', error.message);
  });
  
  queue.on('failed', (job, error) => {
    console.error(`[JOB_SERVICE] Job ${job.id} échoué:`, error.message);
  });
}

module.exports = {
  createTicketGenerationJobService,
  getTicketGenerationJobStatusService,
  updateTicketGenerationJobResult,
  startTicketGenerationResultConsumer,
  TICKET_GENERATION_RESULT_QUEUE
};
