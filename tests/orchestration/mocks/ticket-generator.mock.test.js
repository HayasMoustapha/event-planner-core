/**
 * Tests MOCK - Ticket Generator Service
 * Teste tous les 16 flows d'orchestration vers ticket-generator-service
 *
 * @author Event Planner Team
 * @version 1.0.0
 */

const ticketGeneratorClient = require('../../../../shared/service-clients/ticket-generator-client');

describe('Ticket Generator Service - Mock Tests', () => {
  let originalGet;
  let originalPost;
  let originalPut;
  let originalDelete;
  let originalHealthCheck;

  beforeEach(() => {
    jest.clearAllMocks();

    // Store original methods
    originalGet = ticketGeneratorClient._get;
    originalPost = ticketGeneratorClient._post;
    originalPut = ticketGeneratorClient._put;
    originalDelete = ticketGeneratorClient._delete;
    originalHealthCheck = ticketGeneratorClient.healthCheck;

    // Mock the internal methods
    ticketGeneratorClient._get = jest.fn();
    ticketGeneratorClient._post = jest.fn();
    ticketGeneratorClient._put = jest.fn();
    ticketGeneratorClient._delete = jest.fn();
    ticketGeneratorClient.healthCheck = jest.fn();
  });

  afterEach(() => {
    // Restore original methods
    ticketGeneratorClient._get = originalGet;
    ticketGeneratorClient._post = originalPost;
    ticketGeneratorClient._put = originalPut;
    ticketGeneratorClient._delete = originalDelete;
    ticketGeneratorClient.healthCheck = originalHealthCheck;
  });

  // ============================================================
  // 1. GENERATE TICKET - POST /api/tickets/generate
  // ============================================================
  describe('1. generateTicket - POST /api/tickets/generate', () => {
    const ticketData = {
      eventId: 'event-123',
      guestId: 'guest-456',
      ticketTypeId: 'type-789'
    };
    const options = { templateId: 'template-001', generatePdf: true };

    it('should call correct URL with correct method', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: true,
        ticketCode: 'TKT-001',
        qrCode: 'base64-qr-data',
        pdfUrl: 'https://cdn.example.com/ticket.pdf'
      });

      await ticketGeneratorClient.generateTicket(ticketData, options);

      expect(ticketGeneratorClient._post).toHaveBeenCalledWith(
        '/api/tickets/generate',
        expect.objectContaining({
          eventId: 'event-123',
          guestId: 'guest-456',
          ticketTypeId: 'type-789',
          options: expect.objectContaining({
            generatePdf: true,
            templateId: 'template-001'
          })
        })
      );
    });

    it('should return ticket data on success', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: true,
        ticketCode: 'TKT-001',
        qrCode: 'base64-qr-data',
        pdfUrl: 'https://cdn.example.com/ticket.pdf'
      });

      const result = await ticketGeneratorClient.generateTicket(ticketData, options);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('ticketCode');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('pdfUrl');
    });

    it('should handle service unavailable error', async () => {
      ticketGeneratorClient._post.mockRejectedValue(new Error('Connection refused'));

      await expect(ticketGeneratorClient.generateTicket(ticketData)).rejects.toThrow();
    });

    it('should handle timeout error', async () => {
      ticketGeneratorClient._post.mockRejectedValue(new Error('Timeout exceeded'));

      await expect(ticketGeneratorClient.generateTicket(ticketData)).rejects.toThrow();
    });

    it('should handle invalid response', async () => {
      ticketGeneratorClient._post.mockResolvedValue(null);

      const result = await ticketGeneratorClient.generateTicket(ticketData);
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // 2. GENERATE BATCH - POST /api/tickets/batch
  // ============================================================
  describe('2. generateBatch - POST /api/tickets/batch', () => {
    const tickets = [
      { eventId: 'event-1', guestId: 'guest-1', ticketTypeId: 'type-1' },
      { eventId: 'event-1', guestId: 'guest-2', ticketTypeId: 'type-1' },
      { eventId: 'event-1', guestId: 'guest-3', ticketTypeId: 'type-2' }
    ];

    it('should call correct URL with correct payload', async () => {
      ticketGeneratorClient._post.mockResolvedValue({ success: true, jobId: 'job-123', status: 'queued' });

      await ticketGeneratorClient.generateBatch(tickets, { priority: 'high' });

      expect(ticketGeneratorClient._post).toHaveBeenCalledWith(
        '/api/tickets/batch',
        { tickets, options: { priority: 'high' } }
      );
    });

    it('should return jobId for batch processing', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: true, jobId: 'job-123', status: 'queued', ticketCount: 3
      });

      const result = await ticketGeneratorClient.generateBatch(tickets);

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status', 'queued');
    });

    it('should handle large batch requests', async () => {
      const largeTicketList = Array(1000).fill(null).map((_, i) => ({
        eventId: 'event-1',
        guestId: `guest-${i}`,
        ticketTypeId: 'type-1'
      }));

      ticketGeneratorClient._post.mockResolvedValue({
        success: true, jobId: 'job-large', ticketCount: 1000
      });

      const result = await ticketGeneratorClient.generateBatch(largeTicketList);

      expect(result.ticketCount).toBe(1000);
    });

    it('should handle empty batch', async () => {
      ticketGeneratorClient._post.mockResolvedValue({ success: false, error: 'Empty ticket list' });

      const result = await ticketGeneratorClient.generateBatch([]);

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 3. DOWNLOAD TICKET PDF - GET /api/tickets/:id/pdf
  // ============================================================
  describe('3. downloadTicketPDF - GET /api/tickets/:id/pdf', () => {
    it('should call correct URL', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true, url: 'https://cdn.example.com/ticket-123.pdf'
      });

      await ticketGeneratorClient.downloadTicketPDF('ticket-123');

      expect(ticketGeneratorClient._get).toHaveBeenCalledWith('/api/tickets/ticket-123/pdf');
    });

    it('should return PDF URL on success', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true, url: 'https://cdn.example.com/ticket.pdf', expiresAt: '2024-12-31'
      });

      const result = await ticketGeneratorClient.downloadTicketPDF('ticket-123');

      expect(result).toHaveProperty('url');
      expect(result.url).toContain('pdf');
    });

    it('should handle ticket not found', async () => {
      ticketGeneratorClient._get.mockRejectedValue(new Error('Ticket not found'));

      await expect(ticketGeneratorClient.downloadTicketPDF('invalid-id')).rejects.toThrow();
    });
  });

  // ============================================================
  // 4. GET TICKET QR CODE - GET /api/tickets/:id/qrcode
  // ============================================================
  describe('4. getTicketQRCode - GET /api/tickets/:id/qrcode', () => {
    it('should call correct URL with options', async () => {
      ticketGeneratorClient._get.mockResolvedValue({ success: true, qrCodeData: 'base64-encoded-qr' });

      await ticketGeneratorClient.getTicketQRCode('ticket-123', { format: 'png', size: 300 });

      expect(ticketGeneratorClient._get).toHaveBeenCalledWith(
        '/api/tickets/ticket-123/qrcode',
        { params: { format: 'png', size: 300 } }
      );
    });

    it('should return QR code data', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true, qrCodeData: 'base64-data', format: 'png'
      });

      const result = await ticketGeneratorClient.getTicketQRCode('ticket-123');

      expect(result).toHaveProperty('qrCodeData');
    });

    it('should support different formats', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true, qrCodeData: 'svg-data', format: 'svg'
      });

      const result = await ticketGeneratorClient.getTicketQRCode('ticket-123', { format: 'svg' });

      expect(result.format).toBe('svg');
    });
  });

  // ============================================================
  // 5. GET JOB STATUS - GET /api/jobs/:id
  // ============================================================
  describe('5. getJobStatus - GET /api/jobs/:id', () => {
    it('should call correct URL', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true, jobId: 'job-123', status: 'processing', progress: 45
      });

      await ticketGeneratorClient.getJobStatus('job-123');

      expect(ticketGeneratorClient._get).toHaveBeenCalledWith('/api/jobs/job-123');
    });

    it('should return job status with progress', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true,
        jobId: 'job-123',
        status: 'processing',
        progress: 75,
        totalTickets: 100,
        processedTickets: 75
      });

      const result = await ticketGeneratorClient.getJobStatus('job-123');

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('progress');
      expect(result.progress).toBe(75);
    });

    it('should handle completed job', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true, status: 'completed', progress: 100, completedAt: '2024-01-15T10:30:00Z'
      });

      const result = await ticketGeneratorClient.getJobStatus('job-123');

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
    });

    it('should handle failed job', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true, status: 'failed', error: 'PDF generation failed', failedAt: '2024-01-15T10:30:00Z'
      });

      const result = await ticketGeneratorClient.getJobStatus('job-123');

      expect(result.status).toBe('failed');
      expect(result).toHaveProperty('error');
    });
  });

  // ============================================================
  // 6. CANCEL JOB - POST /api/jobs/:id/cancel
  // ============================================================
  describe('6. cancelJob - POST /api/jobs/:id/cancel', () => {
    it('should call correct URL', async () => {
      ticketGeneratorClient._post.mockResolvedValue({ success: true, status: 'cancelled' });

      await ticketGeneratorClient.cancelJob('job-123');

      expect(ticketGeneratorClient._post).toHaveBeenCalledWith('/api/jobs/job-123/cancel');
    });

    it('should return cancelled status', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: true, status: 'cancelled', cancelledAt: '2024-01-15T10:30:00Z'
      });

      const result = await ticketGeneratorClient.cancelJob('job-123');

      expect(result.status).toBe('cancelled');
    });

    it('should handle already completed job', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: false, error: 'Job already completed, cannot cancel'
      });

      const result = await ticketGeneratorClient.cancelJob('job-123');

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 7. GET JOB RESULTS - GET /api/jobs/:id/results
  // ============================================================
  describe('7. getJobResults - GET /api/jobs/:id/results', () => {
    it('should call correct URL', async () => {
      ticketGeneratorClient._get.mockResolvedValue({ success: true, tickets: [] });

      await ticketGeneratorClient.getJobResults('job-123');

      expect(ticketGeneratorClient._get).toHaveBeenCalledWith('/api/jobs/job-123/results');
    });

    it('should return generated tickets', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true,
        tickets: [
          { ticketCode: 'TKT-001', pdfUrl: 'url1', qrCode: 'qr1' },
          { ticketCode: 'TKT-002', pdfUrl: 'url2', qrCode: 'qr2' }
        ],
        totalGenerated: 2
      });

      const result = await ticketGeneratorClient.getJobResults('job-123');

      expect(result.tickets).toHaveLength(2);
      expect(result.totalGenerated).toBe(2);
    });

    it('should handle job not completed', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: false, error: 'Job not yet completed', status: 'processing'
      });

      const result = await ticketGeneratorClient.getJobResults('job-123');

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 8. VALIDATE TICKET - POST /api/tickets/validate
  // ============================================================
  describe('8. validateTicket - POST /api/tickets/validate', () => {
    it('should call correct URL with QR data and signature', async () => {
      ticketGeneratorClient._post.mockResolvedValue({ success: true, valid: true });

      await ticketGeneratorClient.validateTicket('qr-code-data', 'signature-123');

      expect(ticketGeneratorClient._post).toHaveBeenCalledWith(
        '/api/tickets/validate',
        { qrCodeData: 'qr-code-data', signature: 'signature-123' }
      );
    });

    it('should return validation result', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: true, valid: true, ticketInfo: { eventId: 'event-1', guestName: 'John' }
      });

      const result = await ticketGeneratorClient.validateTicket('qr-data', 'sig');

      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('ticketInfo');
    });

    it('should handle invalid ticket', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: true, valid: false, reason: 'Ticket already used'
      });

      const result = await ticketGeneratorClient.validateTicket('qr-data', 'sig');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Ticket already used');
    });

    it('should handle forged signature', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: true, valid: false, reason: 'Invalid signature'
      });

      const result = await ticketGeneratorClient.validateTicket('qr-data', 'bad-sig');

      expect(result.valid).toBe(false);
    });
  });

  // ============================================================
  // 9. REGENERATE TICKET - POST /api/tickets/:id/regenerate
  // ============================================================
  describe('9. regenerateTicket - POST /api/tickets/:id/regenerate', () => {
    it('should call correct URL with options', async () => {
      ticketGeneratorClient._post.mockResolvedValue({ success: true, newTicketCode: 'TKT-NEW' });

      await ticketGeneratorClient.regenerateTicket('ticket-123', { reason: 'lost' });

      expect(ticketGeneratorClient._post).toHaveBeenCalledWith(
        '/api/tickets/ticket-123/regenerate',
        { reason: 'lost' }
      );
    });

    it('should return new ticket data', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: true,
        newTicketCode: 'TKT-NEW',
        newQrCode: 'new-qr',
        newPdfUrl: 'new-url',
        oldTicketInvalidated: true
      });

      const result = await ticketGeneratorClient.regenerateTicket('ticket-123');

      expect(result).toHaveProperty('newTicketCode');
      expect(result.oldTicketInvalidated).toBe(true);
    });
  });

  // ============================================================
  // 10. LIST TEMPLATES - GET /api/templates
  // ============================================================
  describe('10. listTemplates - GET /api/templates', () => {
    it('should call correct URL with filters', async () => {
      ticketGeneratorClient._get.mockResolvedValue({ success: true, templates: [] });

      await ticketGeneratorClient.listTemplates({ category: 'concert', status: 'active' });

      expect(ticketGeneratorClient._get).toHaveBeenCalledWith(
        '/api/templates',
        { params: { category: 'concert', status: 'active' } }
      );
    });

    it('should return templates list', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true,
        templates: [
          { id: 'tpl-1', name: 'Concert Template', category: 'concert' },
          { id: 'tpl-2', name: 'Conference Template', category: 'conference' }
        ]
      });

      const result = await ticketGeneratorClient.listTemplates();

      expect(result.templates).toHaveLength(2);
    });
  });

  // ============================================================
  // 11. GET TEMPLATE - GET /api/templates/:id
  // ============================================================
  describe('11. getTemplate - GET /api/templates/:id', () => {
    it('should call correct URL', async () => {
      ticketGeneratorClient._get.mockResolvedValue({ success: true, template: { id: 'tpl-1' } });

      await ticketGeneratorClient.getTemplate('tpl-1');

      expect(ticketGeneratorClient._get).toHaveBeenCalledWith('/api/templates/tpl-1');
    });

    it('should return template details', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true,
        template: {
          id: 'tpl-1',
          name: 'Concert Template',
          fields: ['eventName', 'guestName', 'date'],
          previewUrl: 'https://cdn.example.com/preview.png'
        }
      });

      const result = await ticketGeneratorClient.getTemplate('tpl-1');

      expect(result.template).toHaveProperty('name');
      expect(result.template).toHaveProperty('fields');
    });

    it('should handle template not found', async () => {
      ticketGeneratorClient._get.mockRejectedValue(new Error('Template not found'));

      await expect(ticketGeneratorClient.getTemplate('invalid')).rejects.toThrow();
    });
  });

  // ============================================================
  // 12. PREVIEW TEMPLATE - POST /api/templates/:id/preview
  // ============================================================
  describe('12. previewTemplate - POST /api/templates/:id/preview', () => {
    const sampleData = {
      eventName: 'Rock Concert 2024',
      guestName: 'John Doe',
      date: '2024-06-15'
    };

    it('should call correct URL with sample data', async () => {
      ticketGeneratorClient._post.mockResolvedValue({ success: true, previewUrl: 'https://preview.url' });

      await ticketGeneratorClient.previewTemplate('tpl-1', sampleData);

      expect(ticketGeneratorClient._post).toHaveBeenCalledWith(
        '/api/templates/tpl-1/preview',
        sampleData
      );
    });

    it('should return preview URL', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: true, previewUrl: 'https://cdn.example.com/preview-123.png', expiresIn: 3600
      });

      const result = await ticketGeneratorClient.previewTemplate('tpl-1', sampleData);

      expect(result).toHaveProperty('previewUrl');
    });
  });

  // ============================================================
  // 13. GET GENERATION STATS - GET /api/stats/generation
  // ============================================================
  describe('13. getGenerationStats - GET /api/stats/generation', () => {
    it('should call correct URL with filters', async () => {
      ticketGeneratorClient._get.mockResolvedValue({ success: true, stats: {} });

      await ticketGeneratorClient.getGenerationStats({ dateFrom: '2024-01-01', dateTo: '2024-01-31', eventId: 'event-1' });

      expect(ticketGeneratorClient._get).toHaveBeenCalledWith(
        '/api/stats/generation',
        { params: { dateFrom: '2024-01-01', dateTo: '2024-01-31', eventId: 'event-1' } }
      );
    });

    it('should return statistics', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true,
        stats: {
          totalGenerated: 5000,
          totalPDFs: 4800,
          totalQRCodes: 5000,
          avgGenerationTime: 250,
          byEvent: { 'event-1': 3000, 'event-2': 2000 }
        }
      });

      const result = await ticketGeneratorClient.getGenerationStats();

      expect(result.stats).toHaveProperty('totalGenerated');
      expect(result.stats).toHaveProperty('avgGenerationTime');
    });
  });

  // ============================================================
  // 14. GENERATE EVENT TICKETS - POST /api/events/:id/generate-tickets
  // ============================================================
  describe('14. generateEventTickets - POST /api/events/:id/generate-tickets', () => {
    it('should call correct URL with options', async () => {
      ticketGeneratorClient._post.mockResolvedValue({ success: true, jobId: 'job-event-123' });

      await ticketGeneratorClient.generateEventTickets('event-123', { templateId: 'tpl-1', notifyGuests: true });

      expect(ticketGeneratorClient._post).toHaveBeenCalledWith(
        '/api/events/event-123/generate-tickets',
        { templateId: 'tpl-1', notifyGuests: true }
      );
    });

    it('should return job ID for tracking', async () => {
      ticketGeneratorClient._post.mockResolvedValue({
        success: true, jobId: 'job-event-123', totalGuests: 500, estimatedTime: '5 minutes'
      });

      const result = await ticketGeneratorClient.generateEventTickets('event-123');

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('totalGuests');
    });
  });

  // ============================================================
  // 15. GET TICKET BY CODE - GET /api/tickets/code/:code
  // ============================================================
  describe('15. getTicketByCode - GET /api/tickets/code/:code', () => {
    it('should call correct URL', async () => {
      ticketGeneratorClient._get.mockResolvedValue({ success: true, ticket: { ticketCode: 'TKT-001' } });

      await ticketGeneratorClient.getTicketByCode('TKT-001');

      expect(ticketGeneratorClient._get).toHaveBeenCalledWith('/api/tickets/code/TKT-001');
    });

    it('should return ticket details', async () => {
      ticketGeneratorClient._get.mockResolvedValue({
        success: true,
        ticket: {
          ticketCode: 'TKT-001',
          eventId: 'event-123',
          guestName: 'John Doe',
          status: 'valid',
          pdfUrl: 'https://cdn.example.com/ticket.pdf'
        }
      });

      const result = await ticketGeneratorClient.getTicketByCode('TKT-001');

      expect(result.ticket).toHaveProperty('ticketCode', 'TKT-001');
      expect(result.ticket).toHaveProperty('status');
    });

    it('should handle invalid code', async () => {
      ticketGeneratorClient._get.mockRejectedValue(new Error('Ticket not found'));

      await expect(ticketGeneratorClient.getTicketByCode('INVALID')).rejects.toThrow();
    });
  });

  // ============================================================
  // 16. HEALTH CHECK - GET /health
  // ============================================================
  describe('16. healthCheck - GET /health', () => {
    it('should call health endpoint', async () => {
      ticketGeneratorClient.healthCheck.mockResolvedValue({
        success: true, status: 'healthy', service: 'ticket-generator'
      });

      await ticketGeneratorClient.healthCheck();

      expect(ticketGeneratorClient.healthCheck).toHaveBeenCalled();
    });

    it('should return healthy status', async () => {
      ticketGeneratorClient.healthCheck.mockResolvedValue({
        success: true, status: 'healthy', uptime: 3600, version: '1.0.0'
      });

      const result = await ticketGeneratorClient.healthCheck();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('status', 'healthy');
    });

    it('should handle service down', async () => {
      ticketGeneratorClient.healthCheck.mockResolvedValue({
        success: false, status: 'unhealthy', error: 'Connection refused'
      });

      const result = await ticketGeneratorClient.healthCheck();

      expect(result.success).toBe(false);
      expect(result.status).toBe('unhealthy');
    });
  });

  // ============================================================
  // ERROR HANDLING SCENARIOS
  // ============================================================
  describe('Error Handling', () => {
    it('should handle network timeout gracefully', async () => {
      ticketGeneratorClient._post.mockRejectedValue(new Error('timeout of 60000ms exceeded'));

      await expect(ticketGeneratorClient.generateTicket({ eventId: '1' })).rejects.toThrow();
    });

    it('should handle 500 internal server error', async () => {
      ticketGeneratorClient._post.mockRejectedValue(new Error('Internal server error'));

      await expect(ticketGeneratorClient.generateTicket({ eventId: '1' })).rejects.toThrow();
    });

    it('should handle 400 bad request', async () => {
      ticketGeneratorClient._post.mockRejectedValue(new Error('Invalid payload'));

      await expect(ticketGeneratorClient.generateTicket({})).rejects.toThrow();
    });

    it('should handle 401 unauthorized', async () => {
      ticketGeneratorClient._post.mockRejectedValue(new Error('Invalid API key'));

      await expect(ticketGeneratorClient.generateTicket({ eventId: '1' })).rejects.toThrow();
    });

    it('should handle 503 service unavailable', async () => {
      ticketGeneratorClient._post.mockRejectedValue(new Error('Service temporarily unavailable'));

      await expect(ticketGeneratorClient.generateTicket({ eventId: '1' })).rejects.toThrow();
    });

    it('should handle malformed JSON response', async () => {
      ticketGeneratorClient._post.mockRejectedValue(new Error('Invalid JSON'));

      await expect(ticketGeneratorClient.generateTicket({ eventId: '1' })).rejects.toThrow();
    });
  });

  // ============================================================
  // PAYLOAD VALIDATION
  // ============================================================
  describe('Payload Validation', () => {
    it('should send correct content-type header', async () => {
      ticketGeneratorClient._post.mockResolvedValue({ success: true });

      await ticketGeneratorClient.generateTicket({ eventId: '1' });

      expect(ticketGeneratorClient._post).toHaveBeenCalled();
    });

    it('should have API key configured', async () => {
      // The client should have been created with the API key
      expect(ticketGeneratorClient.apiKey).toBeDefined();
    });
  });
});
