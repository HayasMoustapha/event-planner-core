/**
 * Consommateur Redis pour les résultats de notifications
 */

const { Worker, createQueue } = require('../../../shared/config/redis-config');

const NOTIFICATION_RESULT_QUEUE = 'notification_result_queue';

function startNotificationResultConsumer() {
  const queue = createQueue(NOTIFICATION_RESULT_QUEUE);
  
  const worker = new Worker(NOTIFICATION_RESULT_QUEUE, async (job) => {
    const { data } = job;
    
    try {
      console.log(`[NOTIFICATION_RESULT_CONSUMER] Traitement résultat job ${job.id}: ${data.job_id}`);
      
      const notificationId = await getNotificationIdFromJobId(data.job_id);
      
      if (!notificationId) {
        console.warn(`[NOTIFICATION_RESULT_CONSUMER] Notification non trouvée pour job_id ${data.job_id}`);
        return { success: false, error: 'Notification non trouvée' };
      }
      
      const updateData = {
        status: data.result.success ? 'completed' : 'failed',
        sent_count: data.result.sent_count || 0,
        failed_count: data.result.failed_count || 0,
        error_message: data.result.success ? null : data.result.error
      };
      
      const { updateNotificationStatus } = require('./notification-service');
      
      const db = {
        query: async (query, params) => {
          console.log(`[NOTIFICATION_RESULT_CONSUMER] Simulation DB query: ${query}`, params);
          return { rows: [{ id: notificationId }] };
        }
      };
      
      const updatedNotification = await updateNotificationStatus(notificationId, updateData, db);
      
      if (updatedNotification) {
        console.log(`[NOTIFICATION_RESULT_CONSUMER] Notification ${notificationId} mise à jour: ${updateData.status}`);
        
        await emitNotificationUpdateEvent(notificationId, updateData, data.result);
        
        return {
          success: true,
          notification_id: notificationId,
          status: updateData.status,
          sent_count: updateData.sent_count,
          failed_count: updateData.failed_count
        };
      } else {
        console.error(`[NOTIFICATION_RESULT_CONSUMER] Impossible de mettre à jour la notification ${notificationId}`);
        return { success: false, error: 'Mise à jour échouée' };
      }
      
    } catch (error) {
      console.error(`[NOTIFICATION_RESULT_CONSUMER] Erreur traitement résultat job ${job.id}:`, error.message);
      throw error;
    }
  }, {
    concurrency: 3
  });
  
  worker.on('completed', (job) => {
    console.log(`[NOTIFICATION_RESULT_CONSUMER] Résultat job ${job.id} traité avec succès`);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`[NOTIFICATION_RESULT_CONSUMER] Erreur traitement résultat job ${job.id}:`, err.message);
  });
  
  worker.on('error', (err) => {
    console.error('[NOTIFICATION_RESULT_CONSUMER] Erreur worker:', err);
  });
  
  console.log('[NOTIFICATION_RESULT_CONSUMER] Consommateur de résultats démarré');
  return worker;
}

async function getNotificationIdFromJobId(jobId) {
  try {
    console.log(`[NOTIFICATION_RESULT_CONSUMER] Recherche notification pour job_id ${jobId}`);
    
    return Math.floor(Math.random() * 1000) + 1;
    
  } catch (error) {
    console.error('[NOTIFICATION_RESULT_CONSUMER] Erreur recherche notification:', error.message);
    return null;
  }
}

async function emitNotificationUpdateEvent(notificationId, updateData, result) {
  try {
    console.log(`[NOTIFICATION_RESULT_CONSUMER] Événement mise à jour notification ${notificationId}:`, {
      status: updateData.status,
      sent_count: updateData.sent_count,
      failed_count: updateData.failed_count,
      completed_at: result.completed_at
    });
    
  } catch (error) {
    console.error('[NOTIFICATION_RESULT_CONSUMER] Erreur émission événement:', error.message);
  }
}

async function stopNotificationResultConsumer(worker) {
  try {
    console.log('[NOTIFICATION_RESULT_CONSUMER] Arrêt du consommateur...');
    
    if (worker) {
      await worker.close();
      console.log('[NOTIFICATION_RESULT_CONSUMER] Consommateur arrêté');
    }
    
  } catch (error) {
    console.error('[NOTIFICATION_RESULT_CONSUMER] Erreur arrêt consommateur:', error.message);
  }
}

module.exports = {
  startNotificationResultConsumer,
  stopNotificationResultConsumer,
  NOTIFICATION_RESULT_QUEUE
};
