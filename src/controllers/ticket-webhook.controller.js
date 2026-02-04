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
function normalizeWebhookPayload(body = {}) {
  // Supporter les deux formats:
  // 1) Legacy: { job_id, status, timestamp, tickets, summary }
  // 2) Nouveau: { eventType, jobId, status, timestamp, data: { tickets, summary } }
  const normalized = {
    job_id: body.job_id || body.jobId,
    status: body.status,
    timestamp: body.timestamp,
    tickets: body.tickets || body.data?.tickets || [],
    summary: body.summary || body.data?.summary,
    processing_time_ms: body.processing_time_ms || body.data?.processingTime || body.data?.processing_time_ms
  };

  // Normaliser les tickets vers snake_case attendu par le core
  if (Array.isArray(normalized.tickets)) {
    normalized.tickets = normalized.tickets.map((ticket) => ({
      ticket_id: ticket.ticket_id ?? ticket.ticketId ?? ticket.id,
      ticket_code: ticket.ticket_code ?? ticket.ticketCode,
      qr_code_data: ticket.qr_code_data ?? ticket.qrCodeData ?? ticket.qrCode,
      file_url: ticket.file_url ?? ticket.fileUrl,
      file_path: ticket.file_path ?? ticket.filePath,
      pdf_file: ticket.pdf_file ?? ticket.filePath ?? ticket.fileUrl,
      generated_at: ticket.generated_at ?? ticket.generatedAt,
      success: ticket.success ?? (ticket.status === 'completed')
    }));
  }

  return normalized;
}

async function receiveTicketGenerationWebhook(req, res) {
  const startTime = Date.now();

  try {
    if (!req.body || !req.headers) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format'
      });
    }

    const normalizedPayload = normalizeWebhookPayload(req.body || {});
    const { job_id, status, timestamp, tickets, summary, processing_time_ms } = normalizedPayload;

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
    const result = await unifiedTicketGenerationController.processGenerationWebhook(normalizedPayload);

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
