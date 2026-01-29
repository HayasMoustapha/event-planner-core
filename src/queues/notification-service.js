/**
 * Service de gestion des notifications
 */

const { createTicketNotificationJob, getNotificationJobStatus } = require('./notification-producer');

async function createTicketNotification(notificationData, db) {
  try {
    const notificationRecord = await persistNotificationRecord(notificationData, db);
    
    const jobResult = await createTicketNotificationJob({
      ...notificationData,
      notification_id: notificationRecord.id
    });
    
    await updateNotificationRecordWithJob(notificationRecord.id, jobResult.redis_job_id, db);
    
    return {
      success: true,
      notification_id: notificationRecord.id,
      job_id: jobResult.job_id,
      redis_job_id: jobResult.redis_job_id,
      status: 'pending'
    };
    
  } catch (error) {
    console.error('[NOTIFICATION_SERVICE] Erreur création notification:', error.message);
    throw new Error(`Impossible de créer la notification: ${error.message}`);
  }
}

async function persistNotificationRecord(notificationData, db) {
  const query = `
    INSERT INTO notifications (
      event_id, organizer_id, notification_type, recipients_count,
      notification_preferences, template_data, status, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *
  `;
  
  const values = [
    notificationData.event_id,
    notificationData.organizer_id,
    'ticket_generation_complete',
    notificationData.tickets.length,
    JSON.stringify(notificationData.notification_preferences || { email: true, sms: false }),
    JSON.stringify({
      event_title: notificationData.event_title,
      event_date: notificationData.event_date,
      event_location: notificationData.event_location,
      organizer_name: notificationData.organizer_name
    }),
    'pending'
  ];
  
  const result = await db.query(query, values);
  return result.rows[0];
}

async function updateNotificationRecordWithJob(notificationId, redisJobId, db) {
  const query = `
    UPDATE notifications 
    SET redis_job_id = $1, updated_at = NOW()
    WHERE id = $2
  `;
  
  await db.query(query, [redisJobId, notificationId]);
}

async function getNotificationStatus(notificationId, db) {
  const query = `
    SELECT id, event_id, notification_type, redis_job_id, status,
           recipients_count, sent_count, failed_count, error_message,
           created_at, updated_at, completed_at
    FROM notifications 
    WHERE id = $1
  `;
  
  const result = await db.query(query, [notificationId]);
  
  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Notification non trouvée',
      code: 'NOTIFICATION_NOT_FOUND'
    };
  }
  
  const notification = result.rows[0];
  
  let redisStatus = null;
  if (notification.redis_job_id) {
    try {
      redisStatus = await getNotificationJobStatus(notification.redis_job_id);
    } catch (error) {
      console.warn(`[NOTIFICATION_SERVICE] Erreur statut Redis: ${error.message}`);
    }
  }
  
  return {
    success: true,
    notification: {
      id: notification.id,
      event_id: notification.event_id,
      notification_type: notification.notification_type,
      status: notification.status,
      recipients_count: notification.recipients_count,
      sent_count: notification.sent_count || 0,
      failed_count: notification.failed_count || 0,
      created_at: notification.created_at,
      updated_at: notification.updated_at,
      completed_at: notification.completed_at
    },
    redis_job_status: redisStatus
  };
}

async function updateNotificationStatus(notificationId, updateData, db) {
  const query = `
    UPDATE notifications 
    SET status = $1,
        sent_count = COALESCE($2, sent_count),
        failed_count = COALESCE($3, failed_count),
        error_message = $4,
        completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = $5
    RETURNING *
  `;
  
  const values = [
    updateData.status,
    updateData.sent_count,
    updateData.failed_count,
    updateData.error_message,
    notificationId
  ];
  
  const result = await db.query(query, values);
  
  if (result.rows.length > 0) {
    console.log(`[NOTIFICATION_SERVICE] Notification ${notificationId} mise à jour: ${updateData.status}`);
    return result.rows[0];
  }
  
  return null;
}

module.exports = {
  createTicketNotification,
  getNotificationStatus,
  updateNotificationStatus
};
