/**
 * Tests MOCK - Scan Validation Service
 * Teste tous les 17 flows d'orchestration vers scan-validation-service
 *
 * @author Event Planner Team
 * @version 1.0.0
 */

const scanValidationClient = require('../../../../shared/service-clients/scan-validation-client');

describe('Scan Validation Service - Mock Tests', () => {
  // Store original methods to restore after tests
  let originalGet;
  let originalPost;
  let originalPut;
  let originalDelete;
  let originalHealthCheck;

  beforeEach(() => {
    jest.clearAllMocks();

    // Store original methods
    originalGet = scanValidationClient._get;
    originalPost = scanValidationClient._post;
    originalPut = scanValidationClient._put;
    originalDelete = scanValidationClient._delete;
    originalHealthCheck = scanValidationClient.healthCheck;

    // Mock the internal methods
    scanValidationClient._get = jest.fn();
    scanValidationClient._post = jest.fn();
    scanValidationClient._put = jest.fn();
    scanValidationClient._delete = jest.fn();
    scanValidationClient.healthCheck = jest.fn();
  });

  afterEach(() => {
    // Restore original methods
    scanValidationClient._get = originalGet;
    scanValidationClient._post = originalPost;
    scanValidationClient._put = originalPut;
    scanValidationClient._delete = originalDelete;
    scanValidationClient.healthCheck = originalHealthCheck;
  });

  // ============================================================
  // 1. VALIDATE TICKET - POST /api/scans/validate
  // ============================================================
  describe('1. validateTicket - POST /api/scans/validate', () => {
    const qrCodeData = 'QR-DATA-123';
    const scanData = {
      checkpointId: 'checkpoint-1',
      deviceId: 'device-001',
      latitude: 48.8566,
      longitude: 2.3522
    };

    it('should call correct URL with correct payload', async () => {
      scanValidationClient._post.mockResolvedValue({ success: true, valid: true });

      await scanValidationClient.validateTicket(qrCodeData, scanData);

      expect(scanValidationClient._post).toHaveBeenCalledWith(
        '/api/scans/validate',
        {
          qrCodeData: 'QR-DATA-123',
          checkpointId: 'checkpoint-1',
          deviceId: 'device-001',
          latitude: 48.8566,
          longitude: 2.3522
        }
      );
    });

    it('should return valid ticket result', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        valid: true,
        ticket: {
          ticketCode: 'TKT-001',
          guestName: 'John Doe',
          eventId: 'event-123'
        },
        scanId: 'scan-001'
      });

      const result = await scanValidationClient.validateTicket(qrCodeData, scanData);

      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('ticket');
      expect(result).toHaveProperty('scanId');
    });

    it('should handle already scanned ticket', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        valid: false,
        reason: 'Ticket already scanned',
        previousScan: { timestamp: '2024-01-15T10:00:00Z', checkpoint: 'main-entry' }
      });

      const result = await scanValidationClient.validateTicket(qrCodeData, scanData);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Ticket already scanned');
      expect(result).toHaveProperty('previousScan');
    });

    it('should handle invalid QR code', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        valid: false,
        reason: 'Invalid QR code format'
      });

      const result = await scanValidationClient.validateTicket('INVALID-QR', scanData);

      expect(result.valid).toBe(false);
    });

    it('should handle expired ticket', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        valid: false,
        reason: 'Ticket expired',
        expiredAt: '2024-01-14T23:59:59Z'
      });

      const result = await scanValidationClient.validateTicket(qrCodeData, scanData);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Ticket expired');
    });

    it('should handle service timeout', async () => {
      scanValidationClient._post.mockRejectedValue(new Error('timeout'));

      await expect(scanValidationClient.validateTicket(qrCodeData, scanData)).rejects.toThrow();
    });
  });

  // ============================================================
  // 2. VALIDATE BATCH - POST /api/scans/batch
  // ============================================================
  describe('2. validateBatch - POST /api/scans/batch', () => {
    const scans = [
      { qrCodeData: 'QR-1', deviceId: 'dev-1', timestamp: '2024-01-15T10:00:00Z' },
      { qrCodeData: 'QR-2', deviceId: 'dev-1', timestamp: '2024-01-15T10:01:00Z' },
      { qrCodeData: 'QR-3', deviceId: 'dev-1', timestamp: '2024-01-15T10:02:00Z' }
    ];

    it('should call correct URL with batch data', async () => {
      scanValidationClient._post.mockResolvedValue({ success: true, results: [] });

      await scanValidationClient.validateBatch(scans);

      expect(scanValidationClient._post).toHaveBeenCalledWith(
        '/api/scans/batch',
        { scans }
      );
    });

    it('should return validation results for each scan', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        results: [
          { qrCodeData: 'QR-1', valid: true, ticketCode: 'TKT-1' },
          { qrCodeData: 'QR-2', valid: true, ticketCode: 'TKT-2' },
          { qrCodeData: 'QR-3', valid: false, reason: 'Already scanned' }
        ],
        summary: { total: 3, valid: 2, invalid: 1 }
      });

      const result = await scanValidationClient.validateBatch(scans);

      expect(result.results).toHaveLength(3);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(1);
    });

    it('should handle large batch for offline sync', async () => {
      const largeScans = Array(500).fill(null).map((_, i) => ({
        qrCodeData: `QR-${i}`,
        deviceId: 'dev-1',
        timestamp: new Date().toISOString()
      }));

      scanValidationClient._post.mockResolvedValue({
        success: true,
        results: largeScans.map(s => ({ ...s, valid: true }))
      });

      const result = await scanValidationClient.validateBatch(largeScans);

      expect(result.results).toHaveLength(500);
    });
  });

  // ============================================================
  // 3. GET EVENT SCAN STATS - GET /api/events/:id/stats
  // ============================================================
  describe('3. getEventScanStats - GET /api/events/:id/stats', () => {
    it('should call correct URL with filters', async () => {
      scanValidationClient._get.mockResolvedValue({ success: true, stats: {} });

      await scanValidationClient.getEventScanStats('event-123', { dateFrom: '2024-01-15', checkpointId: 'main' });

      expect(scanValidationClient._get).toHaveBeenCalledWith(
        '/api/events/event-123/stats',
        { params: { dateFrom: '2024-01-15', checkpointId: 'main' } }
      );
    });

    it('should return comprehensive statistics', async () => {
      scanValidationClient._get.mockResolvedValue({
        success: true,
        stats: {
          totalScans: 1500,
          validScans: 1450,
          invalidScans: 50,
          uniqueTickets: 1400,
          duplicateAttempts: 100,
          byCheckpoint: {
            'main-entry': { total: 1000, valid: 980 },
            'vip-entry': { total: 500, valid: 470 }
          },
          peakTime: '19:30',
          avgScanTime: 1.2
        }
      });

      const result = await scanValidationClient.getEventScanStats('event-123');

      expect(result.stats).toHaveProperty('totalScans');
      expect(result.stats).toHaveProperty('byCheckpoint');
      expect(result.stats).toHaveProperty('peakTime');
    });
  });

  // ============================================================
  // 4. GET TICKET SCAN HISTORY - GET /api/tickets/:code/scans
  // ============================================================
  describe('4. getTicketScanHistory - GET /api/tickets/:code/scans', () => {
    it('should call correct URL', async () => {
      scanValidationClient._get.mockResolvedValue({ success: true, scans: [] });

      await scanValidationClient.getTicketScanHistory('TKT-001');

      expect(scanValidationClient._get).toHaveBeenCalledWith('/api/tickets/TKT-001/scans');
    });

    it('should return scan history', async () => {
      scanValidationClient._get.mockResolvedValue({
        success: true,
        ticketCode: 'TKT-001',
        scans: [
          { timestamp: '2024-01-15T18:00:00Z', checkpoint: 'main-entry', valid: true },
          { timestamp: '2024-01-15T18:05:00Z', checkpoint: 'vip-zone', valid: true },
          { timestamp: '2024-01-15T18:30:00Z', checkpoint: 'main-entry', valid: false, reason: 'Re-entry not allowed' }
        ]
      });

      const result = await scanValidationClient.getTicketScanHistory('TKT-001');

      expect(result.scans).toHaveLength(3);
      expect(result.scans[2].valid).toBe(false);
    });
  });

  // ============================================================
  // 5. DOWNLOAD OFFLINE DATA - GET /api/events/:id/offline-data
  // ============================================================
  describe('5. downloadOfflineData - GET /api/events/:id/offline-data', () => {
    it('should call correct URL with options', async () => {
      scanValidationClient._get.mockResolvedValue({ success: true, data: {} });

      await scanValidationClient.downloadOfflineData('event-123', { includeGuests: true, includeStats: false });

      expect(scanValidationClient._get).toHaveBeenCalledWith(
        '/api/events/event-123/offline-data',
        { params: { includeGuests: true, includeStats: false } }
      );
    });

    it('should return offline package', async () => {
      scanValidationClient._get.mockResolvedValue({
        success: true,
        eventId: 'event-123',
        generatedAt: '2024-01-15T10:00:00Z',
        expiresAt: '2024-01-16T10:00:00Z',
        tickets: [
          { ticketCode: 'TKT-001', qrHash: 'hash1', status: 'valid' },
          { ticketCode: 'TKT-002', qrHash: 'hash2', status: 'valid' }
        ],
        checkpoints: [
          { id: 'cp-1', name: 'Main Entry' },
          { id: 'cp-2', name: 'VIP Entry' }
        ],
        encryptionKey: 'base64-key'
      });

      const result = await scanValidationClient.downloadOfflineData('event-123');

      expect(result).toHaveProperty('tickets');
      expect(result).toHaveProperty('checkpoints');
      expect(result).toHaveProperty('expiresAt');
    });
  });

  // ============================================================
  // 6. UPLOAD OFFLINE SCANS - POST /api/sync/upload
  // ============================================================
  describe('6. uploadOfflineScans - POST /api/sync/upload', () => {
    const offlineScans = [
      { qrCodeData: 'QR-1', timestamp: '2024-01-15T18:00:00Z', localId: 'local-1' },
      { qrCodeData: 'QR-2', timestamp: '2024-01-15T18:01:00Z', localId: 'local-2' }
    ];

    it('should call correct URL with device ID and scans', async () => {
      scanValidationClient._post.mockResolvedValue({ success: true, synced: 2 });

      await scanValidationClient.uploadOfflineScans('device-001', offlineScans);

      expect(scanValidationClient._post).toHaveBeenCalledWith(
        '/api/sync/upload',
        { deviceId: 'device-001', scans: offlineScans }
      );
    });

    it('should return sync results', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        synced: 2,
        conflicts: 0,
        results: [
          { localId: 'local-1', serverScanId: 'scan-001', status: 'synced' },
          { localId: 'local-2', serverScanId: 'scan-002', status: 'synced' }
        ]
      });

      const result = await scanValidationClient.uploadOfflineScans('device-001', offlineScans);

      expect(result.synced).toBe(2);
      expect(result.conflicts).toBe(0);
    });

    it('should handle conflicts', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        synced: 1,
        conflicts: 1,
        results: [
          { localId: 'local-1', status: 'synced' },
          { localId: 'local-2', status: 'conflict', reason: 'Already scanned by another device' }
        ]
      });

      const result = await scanValidationClient.uploadOfflineScans('device-001', offlineScans);

      expect(result.conflicts).toBe(1);
    });
  });

  // ============================================================
  // 7. GET EVENT CHECKPOINTS - GET /api/events/:id/checkpoints
  // ============================================================
  describe('7. getEventCheckpoints - GET /api/events/:id/checkpoints', () => {
    it('should call correct URL', async () => {
      scanValidationClient._get.mockResolvedValue({ success: true, checkpoints: [] });

      await scanValidationClient.getEventCheckpoints('event-123');

      expect(scanValidationClient._get).toHaveBeenCalledWith('/api/events/event-123/checkpoints');
    });

    it('should return checkpoints list', async () => {
      scanValidationClient._get.mockResolvedValue({
        success: true,
        checkpoints: [
          { id: 'cp-1', name: 'Main Entry', type: 'entry', active: true },
          { id: 'cp-2', name: 'VIP Entry', type: 'entry', active: true },
          { id: 'cp-3', name: 'Exit A', type: 'exit', active: true }
        ]
      });

      const result = await scanValidationClient.getEventCheckpoints('event-123');

      expect(result.checkpoints).toHaveLength(3);
    });
  });

  // ============================================================
  // 8. CREATE CHECKPOINT - POST /api/events/:id/checkpoints
  // ============================================================
  describe('8. createCheckpoint - POST /api/events/:id/checkpoints', () => {
    const checkpointData = {
      name: 'New Checkpoint',
      type: 'entry',
      location: { lat: 48.8566, lng: 2.3522 }
    };

    it('should call correct URL with checkpoint data', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        checkpoint: { id: 'cp-new' }
      });

      await scanValidationClient.createCheckpoint('event-123', checkpointData);

      expect(scanValidationClient._post).toHaveBeenCalledWith(
        '/api/events/event-123/checkpoints',
        checkpointData
      );
    });

    it('should return created checkpoint', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        checkpoint: {
          id: 'cp-new',
          name: 'New Checkpoint',
          type: 'entry',
          active: true,
          createdAt: '2024-01-15T10:00:00Z'
        }
      });

      const result = await scanValidationClient.createCheckpoint('event-123', checkpointData);

      expect(result.checkpoint).toHaveProperty('id');
      expect(result.checkpoint.name).toBe('New Checkpoint');
    });
  });

  // ============================================================
  // 9. UPDATE CHECKPOINT - PUT /api/checkpoints/:id
  // ============================================================
  describe('9. updateCheckpoint - PUT /api/checkpoints/:id', () => {
    it('should call correct URL with update data', async () => {
      scanValidationClient._put.mockResolvedValue({ success: true, checkpoint: {} });

      await scanValidationClient.updateCheckpoint('cp-1', { name: 'Updated Name', active: false });

      expect(scanValidationClient._put).toHaveBeenCalledWith(
        '/api/checkpoints/cp-1',
        { name: 'Updated Name', active: false }
      );
    });

    it('should return updated checkpoint', async () => {
      scanValidationClient._put.mockResolvedValue({
        success: true,
        checkpoint: {
          id: 'cp-1',
          name: 'Updated Name',
          active: false,
          updatedAt: '2024-01-15T11:00:00Z'
        }
      });

      const result = await scanValidationClient.updateCheckpoint('cp-1', { name: 'Updated Name' });

      expect(result.checkpoint.name).toBe('Updated Name');
    });
  });

  // ============================================================
  // 10. DEACTIVATE CHECKPOINT - POST /api/checkpoints/:id/deactivate
  // ============================================================
  describe('10. deactivateCheckpoint - POST /api/checkpoints/:id/deactivate', () => {
    it('should call correct URL', async () => {
      scanValidationClient._post.mockResolvedValue({ success: true, deactivated: true });

      await scanValidationClient.deactivateCheckpoint('cp-1');

      expect(scanValidationClient._post).toHaveBeenCalledWith('/api/checkpoints/cp-1/deactivate');
    });

    it('should return deactivation confirmation', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        checkpoint: { id: 'cp-1', active: false },
        deactivatedAt: '2024-01-15T12:00:00Z'
      });

      const result = await scanValidationClient.deactivateCheckpoint('cp-1');

      expect(result.checkpoint.active).toBe(false);
    });
  });

  // ============================================================
  // 11. GET REALTIME SCANS - GET /api/events/:id/scans/realtime
  // ============================================================
  describe('11. getRealtimeScans - GET /api/events/:id/scans/realtime', () => {
    it('should call correct URL with filters', async () => {
      scanValidationClient._get.mockResolvedValue({ success: true, scans: [] });

      await scanValidationClient.getRealtimeScans('event-123', { since: '2024-01-15T18:00:00Z', checkpointId: 'cp-1' });

      expect(scanValidationClient._get).toHaveBeenCalledWith(
        '/api/events/event-123/scans/realtime',
        { params: { since: '2024-01-15T18:00:00Z', checkpointId: 'cp-1' } }
      );
    });

    it('should return recent scans', async () => {
      scanValidationClient._get.mockResolvedValue({
        success: true,
        scans: [
          { scanId: 'scan-1', timestamp: '2024-01-15T18:30:00Z', valid: true },
          { scanId: 'scan-2', timestamp: '2024-01-15T18:30:05Z', valid: true }
        ],
        lastTimestamp: '2024-01-15T18:30:05Z'
      });

      const result = await scanValidationClient.getRealtimeScans('event-123');

      expect(result.scans).toHaveLength(2);
      expect(result).toHaveProperty('lastTimestamp');
    });
  });

  // ============================================================
  // 12. GENERATE SCAN REPORT - POST /api/events/:id/reports/scans
  // ============================================================
  describe('12. generateScanReport - POST /api/events/:id/reports/scans', () => {
    it('should call correct URL with options', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        reportUrl: 'https://cdn.example.com/report.pdf'
      });

      await scanValidationClient.generateScanReport('event-123', { format: 'pdf', includeDetails: true });

      expect(scanValidationClient._post).toHaveBeenCalledWith(
        '/api/events/event-123/reports/scans',
        { format: 'pdf', includeDetails: true }
      );
    });

    it('should return report URL', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        reportId: 'report-123',
        reportUrl: 'https://cdn.example.com/report.pdf',
        expiresAt: '2024-01-16T10:00:00Z'
      });

      const result = await scanValidationClient.generateScanReport('event-123');

      expect(result).toHaveProperty('reportUrl');
    });

    it('should support different formats', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        reportUrl: 'https://cdn.example.com/report.csv'
      });

      const result = await scanValidationClient.generateScanReport('event-123', { format: 'csv' });

      expect(result.reportUrl).toContain('csv');
    });
  });

  // ============================================================
  // 13. CHECK FRAUD - GET /api/anti-fraud/check/:code
  // ============================================================
  describe('13. checkFraud - GET /api/anti-fraud/check/:code', () => {
    it('should call correct URL', async () => {
      scanValidationClient._get.mockResolvedValue({ success: true, riskScore: 0 });

      await scanValidationClient.checkFraud('TKT-001');

      expect(scanValidationClient._get).toHaveBeenCalledWith('/api/anti-fraud/check/TKT-001');
    });

    it('should return fraud assessment', async () => {
      scanValidationClient._get.mockResolvedValue({
        success: true,
        ticketCode: 'TKT-001',
        riskScore: 85,
        suspiciousActivity: true,
        flags: [
          { type: 'multiple_devices', description: 'Scanned from 5 different devices' },
          { type: 'unusual_location', description: 'Scan location 500km from event' }
        ],
        recommendation: 'manual_review'
      });

      const result = await scanValidationClient.checkFraud('TKT-001');

      expect(result.riskScore).toBe(85);
      expect(result.suspiciousActivity).toBe(true);
      expect(result.flags).toHaveLength(2);
    });

    it('should return clean for legitimate ticket', async () => {
      scanValidationClient._get.mockResolvedValue({
        success: true,
        ticketCode: 'TKT-002',
        riskScore: 5,
        suspiciousActivity: false,
        flags: [],
        recommendation: 'allow'
      });

      const result = await scanValidationClient.checkFraud('TKT-002');

      expect(result.riskScore).toBe(5);
      expect(result.suspiciousActivity).toBe(false);
    });
  });

  // ============================================================
  // 14. REPORT SUSPICIOUS ACTIVITY - POST /api/anti-fraud/report
  // ============================================================
  describe('14. reportSuspiciousActivity - POST /api/anti-fraud/report', () => {
    const report = {
      ticketCode: 'TKT-001',
      reason: 'Suspected duplicate ticket',
      evidence: { photos: ['photo1.jpg'], notes: 'Physical ticket looks different' }
    };

    it('should call correct URL with report data', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        reportId: 'fraud-report-123'
      });

      await scanValidationClient.reportSuspiciousActivity(report);

      expect(scanValidationClient._post).toHaveBeenCalledWith('/api/anti-fraud/report', report);
    });

    it('should return report confirmation', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        reportId: 'fraud-report-123',
        status: 'submitted',
        ticketBlocked: true,
        reviewPriority: 'high'
      });

      const result = await scanValidationClient.reportSuspiciousActivity(report);

      expect(result).toHaveProperty('reportId');
      expect(result.ticketBlocked).toBe(true);
    });
  });

  // ============================================================
  // 15. GET ATTENDANCE COUNT - GET /api/events/:id/attendance
  // ============================================================
  describe('15. getAttendanceCount - GET /api/events/:id/attendance', () => {
    it('should call correct URL', async () => {
      scanValidationClient._get.mockResolvedValue({ success: true, presentCount: 0 });

      await scanValidationClient.getAttendanceCount('event-123');

      expect(scanValidationClient._get).toHaveBeenCalledWith('/api/events/event-123/attendance');
    });

    it('should return attendance data', async () => {
      scanValidationClient._get.mockResolvedValue({
        success: true,
        eventId: 'event-123',
        presentCount: 850,
        totalExpected: 1000,
        attendanceRate: 85,
        byTicketType: {
          'standard': { present: 700, expected: 800 },
          'vip': { present: 150, expected: 200 }
        },
        lastUpdated: '2024-01-15T19:00:00Z'
      });

      const result = await scanValidationClient.getAttendanceCount('event-123');

      expect(result.presentCount).toBe(850);
      expect(result.totalExpected).toBe(1000);
      expect(result.attendanceRate).toBe(85);
    });
  });

  // ============================================================
  // 16. LIST DEVICES - GET /api/devices
  // ============================================================
  describe('16. listDevices - GET /api/devices', () => {
    it('should call correct URL without event filter', async () => {
      scanValidationClient._get.mockResolvedValue({ success: true, devices: [] });

      await scanValidationClient.listDevices();

      expect(scanValidationClient._get).toHaveBeenCalledWith('/api/devices');
    });

    it('should call event-specific URL when eventId provided', async () => {
      scanValidationClient._get.mockResolvedValue({ success: true, devices: [] });

      await scanValidationClient.listDevices('event-123');

      expect(scanValidationClient._get).toHaveBeenCalledWith('/api/events/event-123/devices');
    });

    it('should return devices list', async () => {
      scanValidationClient._get.mockResolvedValue({
        success: true,
        devices: [
          { id: 'dev-1', name: 'Scanner 1', type: 'mobile', lastActive: '2024-01-15T18:00:00Z' },
          { id: 'dev-2', name: 'Scanner 2', type: 'scanner', lastActive: '2024-01-15T18:05:00Z' }
        ]
      });

      const result = await scanValidationClient.listDevices();

      expect(result.devices).toHaveLength(2);
    });
  });

  // ============================================================
  // 17. REGISTER DEVICE - POST /api/devices
  // ============================================================
  describe('17. registerDevice - POST /api/devices', () => {
    const deviceData = {
      name: 'New Scanner',
      type: 'mobile',
      model: 'iPhone 15',
      os: 'iOS 17'
    };

    it('should call correct URL with device data', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        device: { id: 'dev-new' }
      });

      await scanValidationClient.registerDevice(deviceData);

      expect(scanValidationClient._post).toHaveBeenCalledWith('/api/devices', deviceData);
    });

    it('should return registered device with credentials', async () => {
      scanValidationClient._post.mockResolvedValue({
        success: true,
        device: {
          id: 'dev-new',
          name: 'New Scanner',
          type: 'mobile',
          apiKey: 'device-api-key-xyz',
          registeredAt: '2024-01-15T10:00:00Z'
        }
      });

      const result = await scanValidationClient.registerDevice(deviceData);

      expect(result.device).toHaveProperty('id');
      expect(result.device).toHaveProperty('apiKey');
    });
  });

  // ============================================================
  // HEALTH CHECK
  // ============================================================
  describe('healthCheck - GET /health', () => {
    it('should return healthy status', async () => {
      scanValidationClient.healthCheck.mockResolvedValue({
        success: true,
        status: 'healthy',
        service: 'scan-validation'
      });

      const result = await scanValidationClient.healthCheck();

      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
    });

    it('should handle service down', async () => {
      scanValidationClient.healthCheck.mockResolvedValue({
        success: false,
        status: 'unhealthy',
        error: 'Connection refused'
      });

      const result = await scanValidationClient.healthCheck();

      expect(result.success).toBe(false);
      expect(result.status).toBe('unhealthy');
    });
  });

  // ============================================================
  // ERROR HANDLING
  // ============================================================
  describe('Error Handling', () => {
    it('should handle network timeout', async () => {
      scanValidationClient._post.mockRejectedValue(new Error('timeout'));

      await expect(scanValidationClient.validateTicket('QR', {})).rejects.toThrow();
    });

    it('should handle 500 server error', async () => {
      scanValidationClient._post.mockRejectedValue(new Error('Internal error'));

      await expect(scanValidationClient.validateTicket('QR', {})).rejects.toThrow();
    });

    it('should handle malformed response', async () => {
      scanValidationClient._post.mockResolvedValue(null);

      const result = await scanValidationClient.validateTicket('QR', {});
      expect(result).toBeNull();
    });
  });
});
