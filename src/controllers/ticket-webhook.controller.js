/**
 * Controller pour recevoir les webhooks du Ticket Generator Service
 * Met à jour les tables tickets et ticket_generation_jobs
 */

const unifiedTicketGenerationController = require('./unified-ticket-generation.controller');
const { ResponseFormatter } = require('../../../shared');

/**
 * Reçoit les webhooks du Ticket-Generator Service
 * Structure optimisée avec mise à jour des tables
 */
async function receiveTicketGenerationWebhook(req, res) {
  const startTime = Date.now();

  try {
    if (!req.body || !req.headers) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format'
      });
    }

    const { job_id, status, timestamp, tickets, summary, processing_time_ms } = req.body || {};

    if (!job_id || !status || !timestamp) {
      return res.status(400).json({
        success: false,
        error: 'job_id, status et timestamp sont obligatoires',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    console.log('[TICKET_WEBHOOK] Webhook reçu:', {
      job_id,
      status,
      tickets_count: tickets?.length || 0,
      summary
    });

    // Traiter le webhook avec le controller unifié
    const result = await unifiedTicketGenerationController.processGenerationWebhook(req.body);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
        details: result.error,
        code: 'PROCESSING_ERROR'
      });
    }

    const processingTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      data: {
        job_id: result.job_id,
        status: result.status,
        tickets_processed: result.tickets_processed,
        processing_time_ms: processingTime
      },
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[TICKET_WEBHOOK] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = {
  receiveTicketGenerationWebhook
};
