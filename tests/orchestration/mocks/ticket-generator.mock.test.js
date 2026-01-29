/**
 * Tests MOCK - Ticket Generator Service
 * Teste tous les 16 flows d'orchestration vers ticket-generator-service
 *
 * @author Event Planner Team
 * @version 1.0.0
 */

const axios = require('axios');
const TicketGeneratorClient = require('../../../../shared/service-clients/ticket-generator-client');

// Mock axios
jest.mock('axios');

describe('Ticket Generator Service - Mock Tests', () => {
  let mockAxiosInstance;
  let client;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      defaults: { timeout: 60000 }
    };

    axios.create.mockReturnValue(mockAxiosInstance);

    // Recreate client with mocked axios
    jest.isolateModules(() => {
      const TicketGeneratorClientClass = require('../../../../shared/service-clients/ticket-generator-client').constructor;
      client = new TicketGeneratorClientClass({
        baseURL: 'http://localhost:3004',
        apiKey: 'test-api-key'
      });
    });
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
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          success: true,
          ticketCode: 'TKT-001',
          qrCode: 'base64-qr-data',
          pdfUrl: 'https://cdn.example.com/ticket.pdf'
        }
      });

      await client.generateTicket(ticketData, options);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/tickets/generate',
        expect.objectContaining({
          eventId: 'event-123',
          guestId: 'guest-456',
          ticketTypeId: 'type-789',
          options: expect.objectContaining({
            generatePdf: true,
            templateId: 'template-001'
          })
        }),
        expect.any(Object)
      );
    });

    it('should return ticket data on success', async () => {
      const mockResponse = {
        data: {
          success: true,
          ticketCode: 'TKT-001',
          qrCode: 'base64-qr-data',
          pdfUrl: 'https://cdn.example.com/ticket.pdf'
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.generateTicket(ticketData, options);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('ticketCode');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('pdfUrl');
    });

    it('should handle service unavailable error', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      });

      await expect(client.generateTicket(ticketData)).rejects.toThrow();
    });

    it('should handle timeout error', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'Timeout exceeded'
      });

      await expect(client.generateTicket(ticketData)).rejects.toThrow();
    });

    it('should handle invalid response', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: null
      });

      const result = await client.generateTicket(ticketData);
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
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, jobId: 'job-123', status: 'queued' }
      });

      await client.generateBatch(tickets, { priority: 'high' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/tickets/batch',
        { tickets, options: { priority: 'high' } },
        expect.any(Object)
      );
    });

    it('should return jobId for batch processing', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, jobId: 'job-123', status: 'queued', ticketCount: 3 }
      });

      const result = await client.generateBatch(tickets);

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status', 'queued');
    });

    it('should handle large batch requests', async () => {
      const largeTicketList = Array(1000).fill(null).map((_, i) => ({
        eventId: 'event-1',
        guestId: `guest-${i}`,
        ticketTypeId: 'type-1'
      }));

      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, jobId: 'job-large', ticketCount: 1000 }
      });

      const result = await client.generateBatch(largeTicketList);

      expect(result.ticketCount).toBe(1000);
    });

    it('should handle empty batch', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: false, error: 'Empty ticket list' }
      });

      const result = await client.generateBatch([]);

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 3. DOWNLOAD TICKET PDF - GET /api/tickets/:id/pdf
  // ============================================================
  describe('3. downloadTicketPDF - GET /api/tickets/:id/pdf', () => {
    it('should call correct URL', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, url: 'https://cdn.example.com/ticket-123.pdf' }
      });

      await client.downloadTicketPDF('ticket-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/tickets/ticket-123/pdf',
        expect.any(Object)
      );
    });

    it('should return PDF URL on success', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, url: 'https://cdn.example.com/ticket.pdf', expiresAt: '2024-12-31' }
      });

      const result = await client.downloadTicketPDF('ticket-123');

      expect(result).toHaveProperty('url');
      expect(result.url).toContain('pdf');
    });

    it('should handle ticket not found', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 404, data: { error: 'Ticket not found' } }
      });

      await expect(client.downloadTicketPDF('invalid-id')).rejects.toThrow();
    });
  });

  // ============================================================
  // 4. GET TICKET QR CODE - GET /api/tickets/:id/qrcode
  // ============================================================
  describe('4. getTicketQRCode - GET /api/tickets/:id/qrcode', () => {
    it('should call correct URL with options', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, qrCodeData: 'base64-encoded-qr' }
      });

      await client.getTicketQRCode('ticket-123', { format: 'png', size: 300 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/tickets/ticket-123/qrcode',
        { params: { format: 'png', size: 300 } }
      );
    });

    it('should return QR code data', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, qrCodeData: 'base64-data', format: 'png' }
      });

      const result = await client.getTicketQRCode('ticket-123');

      expect(result).toHaveProperty('qrCodeData');
    });

    it('should support different formats', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, qrCodeData: 'svg-data', format: 'svg' }
      });

      const result = await client.getTicketQRCode('ticket-123', { format: 'svg' });

      expect(result.format).toBe('svg');
    });
  });

  // ============================================================
  // 5. GET JOB STATUS - GET /api/jobs/:id
  // ============================================================
  describe('5. getJobStatus - GET /api/jobs/:id', () => {
    it('should call correct URL', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, jobId: 'job-123', status: 'processing', progress: 45 }
      });

      await client.getJobStatus('job-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/jobs/job-123',
        expect.any(Object)
      );
    });

    it('should return job status with progress', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          jobId: 'job-123',
          status: 'processing',
          progress: 75,
          totalTickets: 100,
          processedTickets: 75
        }
      });

      const result = await client.getJobStatus('job-123');

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('progress');
      expect(result.progress).toBe(75);
    });

    it('should handle completed job', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, status: 'completed', progress: 100, completedAt: '2024-01-15T10:30:00Z' }
      });

      const result = await client.getJobStatus('job-123');

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
    });

    it('should handle failed job', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, status: 'failed', error: 'PDF generation failed', failedAt: '2024-01-15T10:30:00Z' }
      });

      const result = await client.getJobStatus('job-123');

      expect(result.status).toBe('failed');
      expect(result).toHaveProperty('error');
    });
  });

  // ============================================================
  // 6. CANCEL JOB - POST /api/jobs/:id/cancel
  // ============================================================
  describe('6. cancelJob - POST /api/jobs/:id/cancel', () => {
    it('should call correct URL', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, status: 'cancelled' }
      });

      await client.cancelJob('job-123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/jobs/job-123/cancel',
        {},
        expect.any(Object)
      );
    });

    it('should return cancelled status', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, status: 'cancelled', cancelledAt: '2024-01-15T10:30:00Z' }
      });

      const result = await client.cancelJob('job-123');

      expect(result.status).toBe('cancelled');
    });

    it('should handle already completed job', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: false, error: 'Job already completed, cannot cancel' }
      });

      const result = await client.cancelJob('job-123');

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 7. GET JOB RESULTS - GET /api/jobs/:id/results
  // ============================================================
  describe('7. getJobResults - GET /api/jobs/:id/results', () => {
    it('should call correct URL', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, tickets: [] }
      });

      await client.getJobResults('job-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/jobs/job-123/results',
        expect.any(Object)
      );
    });

    it('should return generated tickets', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          tickets: [
            { ticketCode: 'TKT-001', pdfUrl: 'url1', qrCode: 'qr1' },
            { ticketCode: 'TKT-002', pdfUrl: 'url2', qrCode: 'qr2' }
          ],
          totalGenerated: 2
        }
      });

      const result = await client.getJobResults('job-123');

      expect(result.tickets).toHaveLength(2);
      expect(result.totalGenerated).toBe(2);
    });

    it('should handle job not completed', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: false, error: 'Job not yet completed', status: 'processing' }
      });

      const result = await client.getJobResults('job-123');

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 8. VALIDATE TICKET - POST /api/tickets/validate
  // ============================================================
  describe('8. validateTicket - POST /api/tickets/validate', () => {
    it('should call correct URL with QR data and signature', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, valid: true }
      });

      await client.validateTicket('qr-code-data', 'signature-123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/tickets/validate',
        { qrCodeData: 'qr-code-data', signature: 'signature-123' },
        expect.any(Object)
      );
    });

    it('should return validation result', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, valid: true, ticketInfo: { eventId: 'event-1', guestName: 'John' } }
      });

      const result = await client.validateTicket('qr-data', 'sig');

      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('ticketInfo');
    });

    it('should handle invalid ticket', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, valid: false, reason: 'Ticket already used' }
      });

      const result = await client.validateTicket('qr-data', 'sig');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Ticket already used');
    });

    it('should handle forged signature', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, valid: false, reason: 'Invalid signature' }
      });

      const result = await client.validateTicket('qr-data', 'bad-sig');

      expect(result.valid).toBe(false);
    });
  });

  // ============================================================
  // 9. REGENERATE TICKET - POST /api/tickets/:id/regenerate
  // ============================================================
  describe('9. regenerateTicket - POST /api/tickets/:id/regenerate', () => {
    it('should call correct URL with options', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, newTicketCode: 'TKT-NEW' }
      });

      await client.regenerateTicket('ticket-123', { reason: 'lost' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/tickets/ticket-123/regenerate',
        { reason: 'lost' },
        expect.any(Object)
      );
    });

    it('should return new ticket data', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          success: true,
          newTicketCode: 'TKT-NEW',
          newQrCode: 'new-qr',
          newPdfUrl: 'new-url',
          oldTicketInvalidated: true
        }
      });

      const result = await client.regenerateTicket('ticket-123');

      expect(result).toHaveProperty('newTicketCode');
      expect(result.oldTicketInvalidated).toBe(true);
    });
  });

  // ============================================================
  // 10. LIST TEMPLATES - GET /api/templates
  // ============================================================
  describe('10. listTemplates - GET /api/templates', () => {
    it('should call correct URL with filters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, templates: [] }
      });

      await client.listTemplates({ category: 'concert', status: 'active' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/templates',
        { params: { category: 'concert', status: 'active' } }
      );
    });

    it('should return templates list', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          templates: [
            { id: 'tpl-1', name: 'Concert Template', category: 'concert' },
            { id: 'tpl-2', name: 'Conference Template', category: 'conference' }
          ]
        }
      });

      const result = await client.listTemplates();

      expect(result.templates).toHaveLength(2);
    });
  });

  // ============================================================
  // 11. GET TEMPLATE - GET /api/templates/:id
  // ============================================================
  describe('11. getTemplate - GET /api/templates/:id', () => {
    it('should call correct URL', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, template: { id: 'tpl-1' } }
      });

      await client.getTemplate('tpl-1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/templates/tpl-1',
        expect.any(Object)
      );
    });

    it('should return template details', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          template: {
            id: 'tpl-1',
            name: 'Concert Template',
            fields: ['eventName', 'guestName', 'date'],
            previewUrl: 'https://cdn.example.com/preview.png'
          }
        }
      });

      const result = await client.getTemplate('tpl-1');

      expect(result.template).toHaveProperty('name');
      expect(result.template).toHaveProperty('fields');
    });

    it('should handle template not found', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 404, data: { error: 'Template not found' } }
      });

      await expect(client.getTemplate('invalid')).rejects.toThrow();
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
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, previewUrl: 'https://preview.url' }
      });

      await client.previewTemplate('tpl-1', sampleData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/templates/tpl-1/preview',
        sampleData,
        expect.any(Object)
      );
    });

    it('should return preview URL', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, previewUrl: 'https://cdn.example.com/preview-123.png', expiresIn: 3600 }
      });

      const result = await client.previewTemplate('tpl-1', sampleData);

      expect(result).toHaveProperty('previewUrl');
    });
  });

  // ============================================================
  // 13. GET GENERATION STATS - GET /api/stats/generation
  // ============================================================
  describe('13. getGenerationStats - GET /api/stats/generation', () => {
    it('should call correct URL with filters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, stats: {} }
      });

      await client.getGenerationStats({ dateFrom: '2024-01-01', dateTo: '2024-01-31', eventId: 'event-1' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/stats/generation',
        { params: { dateFrom: '2024-01-01', dateTo: '2024-01-31', eventId: 'event-1' } }
      );
    });

    it('should return statistics', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          stats: {
            totalGenerated: 5000,
            totalPDFs: 4800,
            totalQRCodes: 5000,
            avgGenerationTime: 250,
            byEvent: { 'event-1': 3000, 'event-2': 2000 }
          }
        }
      });

      const result = await client.getGenerationStats();

      expect(result.stats).toHaveProperty('totalGenerated');
      expect(result.stats).toHaveProperty('avgGenerationTime');
    });
  });

  // ============================================================
  // 14. GENERATE EVENT TICKETS - POST /api/events/:id/generate-tickets
  // ============================================================
  describe('14. generateEventTickets - POST /api/events/:id/generate-tickets', () => {
    it('should call correct URL with options', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, jobId: 'job-event-123' }
      });

      await client.generateEventTickets('event-123', { templateId: 'tpl-1', notifyGuests: true });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/events/event-123/generate-tickets',
        { templateId: 'tpl-1', notifyGuests: true },
        expect.any(Object)
      );
    });

    it('should return job ID for tracking', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, jobId: 'job-event-123', totalGuests: 500, estimatedTime: '5 minutes' }
      });

      const result = await client.generateEventTickets('event-123');

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('totalGuests');
    });
  });

  // ============================================================
  // 15. GET TICKET BY CODE - GET /api/tickets/code/:code
  // ============================================================
  describe('15. getTicketByCode - GET /api/tickets/code/:code', () => {
    it('should call correct URL', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, ticket: { ticketCode: 'TKT-001' } }
      });

      await client.getTicketByCode('TKT-001');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/tickets/code/TKT-001',
        expect.any(Object)
      );
    });

    it('should return ticket details', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          ticket: {
            ticketCode: 'TKT-001',
            eventId: 'event-123',
            guestName: 'John Doe',
            status: 'valid',
            pdfUrl: 'https://cdn.example.com/ticket.pdf'
          }
        }
      });

      const result = await client.getTicketByCode('TKT-001');

      expect(result.ticket).toHaveProperty('ticketCode', 'TKT-001');
      expect(result.ticket).toHaveProperty('status');
    });

    it('should handle invalid code', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 404, data: { error: 'Ticket not found' } }
      });

      await expect(client.getTicketByCode('INVALID')).rejects.toThrow();
    });
  });

  // ============================================================
  // 16. HEALTH CHECK - GET /health
  // ============================================================
  describe('16. healthCheck - GET /health', () => {
    it('should call health endpoint', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { status: 'ok', service: 'ticket-generator' }
      });

      await client.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health', expect.any(Object));
    });

    it('should return healthy status', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { status: 'ok', uptime: 3600, version: '1.0.0' }
      });

      const result = await client.healthCheck();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('status', 'healthy');
    });

    it('should handle service down', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        code: 'ECONNREFUSED'
      });

      const result = await client.healthCheck();

      expect(result.success).toBe(false);
      expect(result.status).toBe('unhealthy');
    });
  });

  // ============================================================
  // ERROR HANDLING SCENARIOS
  // ============================================================
  describe('Error Handling', () => {
    it('should handle network timeout gracefully', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 60000ms exceeded'
      });

      await expect(client.generateTicket({ eventId: '1' })).rejects.toThrow();
    });

    it('should handle 500 internal server error', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 500, data: { error: 'Internal server error' } }
      });

      await expect(client.generateTicket({ eventId: '1' })).rejects.toThrow();
    });

    it('should handle 400 bad request', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 400, data: { error: 'Invalid payload', details: ['eventId required'] } }
      });

      await expect(client.generateTicket({})).rejects.toThrow();
    });

    it('should handle 401 unauthorized', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 401, data: { error: 'Invalid API key' } }
      });

      await expect(client.generateTicket({ eventId: '1' })).rejects.toThrow();
    });

    it('should handle 503 service unavailable', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 503, data: { error: 'Service temporarily unavailable' } }
      });

      await expect(client.generateTicket({ eventId: '1' })).rejects.toThrow();
    });

    it('should handle malformed JSON response', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        message: 'Invalid JSON'
      });

      await expect(client.generateTicket({ eventId: '1' })).rejects.toThrow();
    });
  });

  // ============================================================
  // PAYLOAD VALIDATION
  // ============================================================
  describe('Payload Validation', () => {
    it('should send correct content-type header', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      await client.generateTicket({ eventId: '1' });

      // Verify axios was created with correct headers
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should include API key in headers when provided', async () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key'
          })
        })
      );
    });
  });
});
