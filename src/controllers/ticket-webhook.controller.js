/**
 * Controller pour recevoir les webhooks du Ticket Generator Service
 */

/**
 * Reçoit un webhook du Ticket Generator Service
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

    const { eventType, jobId, status } = req.body || {};

    if (!eventType || !jobId || !status) {
      return res.status(400).json({
        success: false,
        error: 'eventType, jobId et status sont obligatoires',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    console.log('[TICKET_WEBHOOK] Received:', eventType, 'for job:', jobId);

    const processingTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: 'Webhook received successfully',
      data: {
        jobId: jobId,
        eventType: eventType,
        status: status,
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
