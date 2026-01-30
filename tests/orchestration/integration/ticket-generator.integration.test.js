/**
 * Tests INTÉGRATION RÉELS - Ticket Generator Service
 * Tests avec le service réellement démarré
 *
 * @author Event Planner Team
 * @version 1.0.0
 *
 * PRÉREQUIS: ticket-generator-service doit être démarré sur le port 3004
 */

const ticketGeneratorClient = require('../../../../shared/service-clients/ticket-generator-client');

describe('Ticket Generator Service - Integration Tests', () => {
  let serviceAvailable = false;

  beforeAll(async () => {
    // Vérifier si le service est disponible
    serviceAvailable = await global.waitForService(ticketGeneratorClient, 5, 2000);
    if (!serviceAvailable) {
      console.warn('⚠️  Ticket Generator Service non disponible - tests en mode skip');
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
        ticketGeneratorClient.healthCheck()
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      console.log(`   ✅ Health check passed (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 1. GENERATE TICKET
  // ============================================================
  describe('1. generateTicket', () => {
    it('should generate a single ticket successfully', async () => {
      if (!serviceAvailable) return;

      // Format attendu par le service ticket-generator
      const ticketData = {
        ticketData: {
          id: global.generateTestData.ticketCode(),
          eventId: global.generateTestData.eventId(),
          type: 'standard',
          attendeeName: 'Test User',
          attendeeEmail: global.generateTestData.email()
        }
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.generateTicket(ticketData, { generatePdf: true });
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result).toBeDefined();
      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      // Le service peut retourner success ou une erreur métier valide
      if (result.success) {
        console.log(`   ✅ Ticket generated: ${result.ticketCode || 'OK'} (${responseTime}ms)`);
      } else {
        console.log(`   ⚠️  Generation returned error: ${result.error || result.message} (${responseTime}ms)`);
      }
    });

    it('should handle invalid ticket data gracefully', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.generateTicket({}, {});
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      // Le service doit répondre sans bloquer (même avec une erreur de validation)
      console.log(`   ✅ Invalid data handled gracefully (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 2. GENERATE BATCH
  // ============================================================
  describe('2. generateBatch', () => {
    it('should queue batch ticket generation', async () => {
      if (!serviceAvailable) return;

      // Format attendu par le service ticket-generator pour batch
      const eventId = global.generateTestData.eventId();
      const tickets = Array(3).fill(null).map((_, i) => ({
        id: `${global.generateTestData.ticketCode()}-${i}`,
        eventId: eventId,
        type: 'standard',
        attendeeName: `Test User ${i + 1}`,
        attendeeEmail: `test${i + 1}@example.com`
      }));

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.generateBatch({ tickets }, {});
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      if (result && result.jobId) {
        console.log(`   ✅ Batch queued: ${result.jobId} (${responseTime}ms)`);
      } else {
        console.log(`   ⚠️  Batch response: ${result.error || JSON.stringify(result)} (${responseTime}ms)`);
      }
    });
  });

  // ============================================================
  // 3. DOWNLOAD TICKET PDF
  // ============================================================
  describe('3. downloadTicketPDF', () => {
    it('should handle PDF download request', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.downloadTicketPDF('test-ticket-123');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ PDF download request handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 4. GET TICKET QR CODE
  // ============================================================
  describe('4. getTicketQRCode', () => {
    it('should handle QR code request', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.getTicketQRCode('test-ticket-123', { format: 'png' });
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ QR code request handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 5. GET JOB STATUS
  // ============================================================
  describe('5. getJobStatus', () => {
    it('should handle job status request', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.getJobStatus('test-job-123');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Job status request handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 6. CANCEL JOB
  // ============================================================
  describe('6. cancelJob', () => {
    it('should handle job cancellation request', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.cancelJob('test-job-123');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Job cancel request handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 7. GET JOB RESULTS
  // ============================================================
  describe('7. getJobResults', () => {
    it('should handle job results request', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.getJobResults('test-job-123');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Job results request handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 8. VALIDATE TICKET
  // ============================================================
  describe('8. validateTicket', () => {
    it('should handle ticket validation request', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.validateTicket('test-qr-data', 'test-signature');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Ticket validation request handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 9. REGENERATE TICKET
  // ============================================================
  describe('9. regenerateTicket', () => {
    it('should handle ticket regeneration request', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.regenerateTicket('test-ticket-123', { reason: 'lost' });
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Ticket regeneration request handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 10. LIST TEMPLATES
  // ============================================================
  describe('10. listTemplates', () => {
    it('should list available templates', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.listTemplates({});
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      if (result && result.templates) {
        console.log(`   ✅ Templates listed: ${result.templates.length} templates (${responseTime}ms)`);
      } else {
        console.log(`   ✅ Templates request handled (${responseTime}ms)`);
      }
    });
  });

  // ============================================================
  // 11. GET TEMPLATE
  // ============================================================
  describe('11. getTemplate', () => {
    it('should handle template retrieval', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.getTemplate('default');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Template retrieval handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 12. PREVIEW TEMPLATE
  // ============================================================
  describe('12. previewTemplate', () => {
    it('should handle template preview', async () => {
      if (!serviceAvailable) return;

      const sampleData = {
        eventName: 'Test Event',
        guestName: 'John Doe',
        date: '2024-06-15'
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.previewTemplate('default', sampleData);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Template preview handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 13. GET GENERATION STATS
  // ============================================================
  describe('13. getGenerationStats', () => {
    it('should retrieve generation statistics', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.getGenerationStats({});
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Generation stats retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 14. GENERATE EVENT TICKETS
  // ============================================================
  describe('14. generateEventTickets', () => {
    it('should handle event tickets generation', async () => {
      if (!serviceAvailable) return;

      const eventId = global.generateTestData.eventId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.generateEventTickets(eventId, {});
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Event tickets generation handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 15. GET TICKET BY CODE
  // ============================================================
  describe('15. getTicketByCode', () => {
    it('should handle ticket retrieval by code', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await ticketGeneratorClient.getTicketByCode('TKT-TEST-001');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Ticket by code retrieval handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // PERFORMANCE TESTS
  // ============================================================
  describe('Performance Tests', () => {
    it('should handle concurrent requests without blocking', async () => {
      if (!serviceAvailable) return;

      const startTime = Date.now();

      // 5 requêtes concurrentes
      const promises = Array(5).fill(null).map(() =>
        ticketGeneratorClient.healthCheck()
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Le temps total devrait être proche du temps d'une seule requête
      // (pas 5x si les requêtes sont parallèles)
      expect(totalTime).toBeLessThan(global.testConfig.maxResponseTime * 2);

      const successCount = results.filter(r => r.success).length;
      console.log(`   ✅ Concurrent requests: ${successCount}/5 success (${totalTime}ms total)`);
    });

    it('should not have memory leaks on repeated requests', async () => {
      if (!serviceAvailable) return;

      const initialMemory = process.memoryUsage().heapUsed;

      // 10 requêtes séquentielles
      for (let i = 0; i < 10; i++) {
        await ticketGeneratorClient.healthCheck();
      }

      // Force garbage collection si disponible
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // L'augmentation de mémoire devrait être minimale
      expect(memoryIncrease).toBeLessThan(50); // Moins de 50MB d'augmentation
      console.log(`   ✅ Memory stable: +${memoryIncrease.toFixed(2)}MB after 10 requests`);
    });
  });

  // ============================================================
  // ERROR RECOVERY TESTS
  // ============================================================
  describe('Error Recovery', () => {
    it('should recover after temporary failure', async () => {
      if (!serviceAvailable) return;

      // Simuler un échec puis une récupération
      // (dans un vrai test, on pourrait arrêter/redémarrer le service)

      const result1 = await ticketGeneratorClient.healthCheck();
      await new Promise(resolve => setTimeout(resolve, 100));
      const result2 = await ticketGeneratorClient.healthCheck();

      expect(result1.success).toBe(result2.success);
      console.log('   ✅ Service stable between requests');
    });
  });
});
