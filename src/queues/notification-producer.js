/**
 * Producteur Redis pour les notifications
 * Gère l'envoi de jobs de notification vers notification-service
 */

const { v4: uuidv4 } = require('uuid');
const { createQueue } = require('../../../shared/config/redis-config');

const NOTIFICATION_QUEUE = 'notification_queue';

async function createTicketNotificationJob(notificationData, options = {}) {
  try {
    if (!notificationData.event_id) {
      throw new Error('event_id est obligatoire');
    }
    
    if (!notificationData.tickets || notificationData.tickets.length === 0) {
      throw new Error('tickets est obligatoire');
    }
    
    const jobId = uuidv4();
    
    const payload = {
      job_id: jobId,
      notification_type: 'ticket_generation_complete',
      event_id: notificationData.event_id,
      organizer_id: notificationData.organizer_id,
      tickets: notificationData.tickets.map(ticket => ({
        ticket_id: ticket.ticket_id,
        ticket_code: ticket.ticket_code,
        guest_name: ticket.guest_name,
        guest_email: ticket.guest_email,
        guest_phone: ticket.guest_phone,
        ticket_file_url: ticket.ticket_file_url,
        event_title: ticket.event_title,
        event_date: ticket.event_date,
        event_location: ticket.event_location
      })),
      notification_preferences: notificationData.notification_preferences || {
        email: true,
        sms: false
      },
      template_data: {
        event_title: notificationData.event_title,
        event_date: notificationData.event_date,
        event_location: notificationData.event_location,
        organizer_name: notificationData.organizer_name,
        generated_at: new Date().toISOString()
      }
    };
    
    const defaultOptions = {
      priority: 1,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    };
    
    const jobOptions = { ...defaultOptions, ...options };
    const queue = createQueue(NOTIFICATION_QUEUE);
    
    const job = await queue.add('send_ticket_notification', payload, jobOptions);
    
    console.log(`[NOTIFICATION_PRODUCER] Job créé: ${job.id} pour événement ${notificationData.event_id}`);
    
    return {
      success: true,
      job_id: jobId,
      redis_job_id: job.id,
      queue_name: NOTIFICATION_QUEUE,
      notification_type: payload.notification_type,
      tickets_count: payload.tickets.length,
      created_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[NOTIFICATION_PRODUCER] Erreur création job:', error.message);
    throw new Error(`Impossible de créer le job: ${error.message}`);
  }
}

async function getNotificationJobStatus(jobId) {
  try {
    const queue = createQueue(NOTIFICATION_QUEUE);
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return {
        success: false,
        error: 'Job non trouvé',
        code: 'JOB_NOT_FOUND'
      };
    }
    
    const jobData = await job.getState();
    
    return {
      success: true,
      job_id: jobId,
      status: jobData,
      progress: job.progress,
      data: job.data,
      processed_on: job.processedOn,
      finished_on: job.finishedOn,
      failed_reason: job.failedReason,
      attempts_made: job.attemptsMade,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[NOTIFICATION_PRODUCER] Erreur statut job:', error.message);
    throw new Error(`Impossible de récupérer le statut: ${error.message}`);
  }
}

module.exports = {
  createTicketNotificationJob,
  getNotificationJobStatus,
  NOTIFICATION_QUEUE
};
