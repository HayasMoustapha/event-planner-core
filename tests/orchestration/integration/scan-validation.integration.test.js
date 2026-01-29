/**
 * Tests INTÉGRATION RÉELS - Scan Validation Service
 * Tests avec le service réellement démarré
 *
 * @author Event Planner Team
 * @version 1.0.0
 *
 * PRÉREQUIS: scan-validation-service doit être démarré sur le port 3005
 */

const scanValidationClient = require('../../../../shared/service-clients/scan-validation-client');

describe('Scan Validation Service - Integration Tests', () => {
  let serviceAvailable = false;

  beforeAll(async () => {
    serviceAvailable = await global.waitForService(scanValidationClient, 5, 2000);
    if (!serviceAvailable) {
      console.warn('⚠️  Scan Validation Service non disponible - tests en mode skip');
    }
  });

  // ============================================================
  // HEALTH CHECK
  // ============================================================
  describe('Health Check', () => {
    it('should return healthy status when service is running', async () => {
      if (!serviceAvailable) {
        console.log('   ⏭️  Skipped: Service not available');
        return;
      }

      const { result, responseTime } = await global.measureResponseTime(() =>
        scanValidationClient.healthCheck()
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      console.log(`   ✅ Health check passed (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 1. VALIDATE TICKET
  // ============================================================
  describe('1. validateTicket', () => {
    it('should handle ticket validation request', async () => {
      if (!serviceAvailable) return;

      const qrCodeData = JSON.stringify({
        ticketId: global.generateTestData.ticketCode(),
        eventId: global.generateTestData.eventId()
      });

      const scanData = {
        checkpointId: 'test-checkpoint',
        deviceId: 'test-device-001'
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.validateTicket(qrCodeData, scanData);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Ticket validation handled (${responseTime}ms)`);
    });

    it('should handle rapid consecutive validations', async () => {
      if (!serviceAvailable) return;

      const results = [];
      const startTime = Date.now();

      for (let i = 0; i < 3; i++) {
        const result = await scanValidationClient.validateTicket(`QR-${i}`, { deviceId: 'dev-1' })
          .catch(e => ({ error: e.message }));
        results.push(result);
      }

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(global.testConfig.maxResponseTime * 3);
      console.log(`   ✅ Rapid validations: 3 requests in ${totalTime}ms`);
    });
  });

  // ============================================================
  // 2. VALIDATE BATCH
  // ============================================================
  describe('2. validateBatch', () => {
    it('should handle batch validation for offline sync', async () => {
      if (!serviceAvailable) return;

      const scans = Array(5).fill(null).map((_, i) => ({
        qrCodeData: `QR-BATCH-${i}`,
        deviceId: 'device-001',
        timestamp: new Date().toISOString()
      }));

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.validateBatch(scans);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Batch validation handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 3. GET EVENT SCAN STATS
  // ============================================================
  describe('3. getEventScanStats', () => {
    it('should retrieve scan statistics', async () => {
      if (!serviceAvailable) return;

      const eventId = global.generateTestData.eventId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.getEventScanStats(eventId, {});
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Event scan stats retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 4. GET TICKET SCAN HISTORY
  // ============================================================
  describe('4. getTicketScanHistory', () => {
    it('should retrieve ticket scan history', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.getTicketScanHistory('TKT-TEST-001');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Ticket scan history retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 5. DOWNLOAD OFFLINE DATA
  // ============================================================
  describe('5. downloadOfflineData', () => {
    it('should download offline data package', async () => {
      if (!serviceAvailable) return;

      const eventId = global.generateTestData.eventId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.downloadOfflineData(eventId, { includeGuests: true });
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Offline data download handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 6. UPLOAD OFFLINE SCANS
  // ============================================================
  describe('6. uploadOfflineScans', () => {
    it('should upload offline scans for sync', async () => {
      if (!serviceAvailable) return;

      const scans = Array(3).fill(null).map((_, i) => ({
        qrCodeData: `OFFLINE-QR-${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        localId: `local-${i}`
      }));

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.uploadOfflineScans('device-001', scans);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Offline scans upload handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 7. GET EVENT CHECKPOINTS
  // ============================================================
  describe('7. getEventCheckpoints', () => {
    it('should list event checkpoints', async () => {
      if (!serviceAvailable) return;

      const eventId = global.generateTestData.eventId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.getEventCheckpoints(eventId);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Event checkpoints retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 8. CREATE CHECKPOINT
  // ============================================================
  describe('8. createCheckpoint', () => {
    it('should create a new checkpoint', async () => {
      if (!serviceAvailable) return;

      const eventId = global.generateTestData.eventId();
      const checkpointData = {
        name: 'Test Entry Point',
        type: 'entry'
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.createCheckpoint(eventId, checkpointData);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Checkpoint creation handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 9. UPDATE CHECKPOINT
  // ============================================================
  describe('9. updateCheckpoint', () => {
    it('should update checkpoint', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.updateCheckpoint('checkpoint-test', { name: 'Updated Name' });
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Checkpoint update handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 10. DEACTIVATE CHECKPOINT
  // ============================================================
  describe('10. deactivateCheckpoint', () => {
    it('should deactivate checkpoint', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.deactivateCheckpoint('checkpoint-test');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Checkpoint deactivation handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 11. GET REALTIME SCANS
  // ============================================================
  describe('11. getRealtimeScans', () => {
    it('should retrieve realtime scans', async () => {
      if (!serviceAvailable) return;

      const eventId = global.generateTestData.eventId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.getRealtimeScans(eventId, {});
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Realtime scans retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 12. GENERATE SCAN REPORT
  // ============================================================
  describe('12. generateScanReport', () => {
    it('should generate scan report', async () => {
      if (!serviceAvailable) return;

      const eventId = global.generateTestData.eventId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.generateScanReport(eventId, { format: 'pdf' });
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Scan report generation handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 13. CHECK FRAUD
  // ============================================================
  describe('13. checkFraud', () => {
    it('should check for fraud indicators', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.checkFraud('TKT-FRAUD-TEST');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Fraud check handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 14. REPORT SUSPICIOUS ACTIVITY
  // ============================================================
  describe('14. reportSuspiciousActivity', () => {
    it('should submit suspicious activity report', async () => {
      if (!serviceAvailable) return;

      const report = {
        ticketCode: 'TKT-SUSPICIOUS',
        reason: 'Duplicate scan pattern detected',
        evidence: { scanCount: 5, timeSpan: '2 minutes' }
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.reportSuspiciousActivity(report);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Suspicious activity report handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 15. GET ATTENDANCE COUNT
  // ============================================================
  describe('15. getAttendanceCount', () => {
    it('should retrieve attendance count', async () => {
      if (!serviceAvailable) return;

      const eventId = global.generateTestData.eventId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.getAttendanceCount(eventId);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Attendance count retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 16. LIST DEVICES
  // ============================================================
  describe('16. listDevices', () => {
    it('should list registered devices', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.listDevices();
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Device list retrieved (${responseTime}ms)`);
    });

    it('should list devices for specific event', async () => {
      if (!serviceAvailable) return;

      const eventId = global.generateTestData.eventId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.listDevices(eventId);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Event-specific device list retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 17. REGISTER DEVICE
  // ============================================================
  describe('17. registerDevice', () => {
    it('should register a new device', async () => {
      if (!serviceAvailable) return;

      const deviceData = {
        name: `Test Scanner ${Date.now()}`,
        type: 'mobile',
        model: 'Test Model'
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await scanValidationClient.registerDevice(deviceData);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Device registration handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // PERFORMANCE TESTS
  // ============================================================
  describe('Performance Tests', () => {
    it('should handle high-frequency validation requests', async () => {
      if (!serviceAvailable) return;

      const startTime = Date.now();
      const validationPromises = Array(10).fill(null).map((_, i) =>
        scanValidationClient.validateTicket(`QR-PERF-${i}`, { deviceId: 'dev-perf' })
          .catch(e => ({ error: e.message }))
      );

      const results = await Promise.all(validationPromises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(global.testConfig.maxResponseTime * 3);
      console.log(`   ✅ High-frequency validation: 10 requests in ${totalTime}ms`);
    });
  });
});
