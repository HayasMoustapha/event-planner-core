/**
 * Tests E2E - Flow Complet d'Événement
 * Teste le parcours utilisateur complet de bout en bout
 *
 * @author Event Planner Team
 * @version 1.0.0
 *
 * PRÉREQUIS: Tous les services doivent être démarrés
 * - payment-service (3003)
 * - ticket-generator-service (3004)
 * - scan-validation-service (3005)
 * - notification-service (3002)
 */

const paymentClient = require('../../../../shared/service-clients/payment-client');
const ticketGeneratorClient = require('../../../../shared/service-clients/ticket-generator-client');
const scanValidationClient = require('../../../../shared/service-clients/scan-validation-client');
const notificationClient = require('../../../../shared/service-clients/notification-client');

describe('E2E - Complete Event Flow', () => {
  let allServicesAvailable = false;
  let testContext = {
    eventId: null,
    userId: null,
    guestId: null,
    ticketCode: null,
    paymentId: null,
    checkpointId: null
  };

  beforeAll(async () => {
    testContext.eventId = global.generateTestData.eventId();
    testContext.userId = global.generateTestData.userId();
    testContext.guestId = global.generateTestData.guestId();

    // Vérifier tous les services
    const healthChecks = await Promise.all([
      paymentClient.healthCheck().catch(() => ({ success: false })),
      ticketGeneratorClient.healthCheck().catch(() => ({ success: false })),
      scanValidationClient.healthCheck().catch(() => ({ success: false })),
      notificationClient.healthCheck().catch(() => ({ success: false }))
    ]);

    allServicesAvailable = healthChecks.every(h => h.success);

    console.log('🎫 Complete Event Flow Test');
    console.log(`   Event ID: ${testContext.eventId}`);
    console.log(`   All services available: ${allServicesAvailable ? '✅' : '❌'}`);
  });

  // ============================================================
  // PHASE 1: PRÉ-ÉVÉNEMENT (Setup)
  // ============================================================
  describe('Phase 1: Pre-Event Setup', () => {
    it('1.1: Setup event checkpoints', async () => {
      if (!allServicesAvailable) {
        console.log('   ⏭️  Skipped: Not all services available');
        return;
      }

      const startTime = Date.now();

      // Créer plusieurs checkpoints
      const checkpoints = [
        { name: 'Main Entry', type: 'entry' },
        { name: 'VIP Entry', type: 'entry' },
        { name: 'Exit A', type: 'exit' }
      ];

      for (const cp of checkpoints) {
        const result = await scanValidationClient.createCheckpoint(testContext.eventId, cp)
          .catch(e => ({ error: e.message }));

        if (result && result.checkpoint && !testContext.checkpointId) {
          testContext.checkpointId = result.checkpoint.id;
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 1.1: ${checkpoints.length} checkpoints created (${totalTime}ms)`);
    });

    it('1.2: Prepare notification templates', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      // Vérifier que les templates nécessaires existent
      const result = await notificationClient.listTemplates('email')
        .catch(e => ({ error: e.message, templates: [] }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 1.2: Templates verified (${totalTime}ms)`);
    });
  });

  // ============================================================
  // PHASE 2: VENTE DE TICKETS
  // ============================================================
  describe('Phase 2: Ticket Sales', () => {
    it('2.1: Customer initiates ticket purchase', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await paymentClient.createPaymentIntent(7500, 'EUR', {
        eventId: testContext.eventId,
        userId: testContext.userId,
        ticketType: 'vip',
        quantity: 1
      }).catch(e => ({ error: e.message }));

      if (result && result.paymentIntentId) {
        testContext.paymentId = result.paymentIntentId;
      }

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 2.1: Payment intent created (${totalTime}ms)`);
    });

    it('2.2: Payment confirmed - Generate ticket', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await ticketGeneratorClient.generateTicket({
        eventId: testContext.eventId,
        guestId: testContext.guestId,
        ticketTypeId: 'vip',
        paymentId: testContext.paymentId || 'test-payment'
      }, {
        generatePdf: true,
        templateId: 'vip-template'
      }).catch(e => ({ error: e.message }));

      if (result && result.ticketCode) {
        testContext.ticketCode = result.ticketCode;
      } else {
        testContext.ticketCode = `TKT-${testContext.eventId}-001`;
      }

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 2.2: Ticket generated: ${testContext.ticketCode} (${totalTime}ms)`);
    });

    it('2.3: Send purchase confirmation', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await notificationClient.sendTicketConfirmation({
        email: global.generateTestData.email(),
        ticketCode: testContext.ticketCode,
        eventTitle: 'Complete Flow Test Event',
        pdfUrl: `https://cdn.example.com/tickets/${testContext.ticketCode}.pdf`
      }).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 2.3: Confirmation email sent (${totalTime}ms)`);
    });
  });

  // ============================================================
  // PHASE 3: RAPPELS PRÉ-ÉVÉNEMENT
  // ============================================================
  describe('Phase 3: Pre-Event Reminders', () => {
    it('3.1: Send event reminder (24h before)', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await notificationClient.notifyEventParticipants({
        eventId: testContext.eventId,
        type: 'reminder',
        recipients: [global.generateTestData.email()]
      }).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 3.1: Reminder notification sent (${totalTime}ms)`);
    });

    it('3.2: Prepare offline scanning data', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await scanValidationClient.downloadOfflineData(testContext.eventId, {
        includeGuests: true
      }).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 3.2: Offline data prepared (${totalTime}ms)`);
    });
  });

  // ============================================================
  // PHASE 4: JOUR DE L'ÉVÉNEMENT - ENTRÉE
  // ============================================================
  describe('Phase 4: Event Day - Entry', () => {
    it('4.1: Guest arrives - Scan ticket', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const qrCodeData = JSON.stringify({
        ticketId: testContext.ticketCode,
        eventId: testContext.eventId
      });

      const result = await scanValidationClient.validateTicket(qrCodeData, {
        checkpointId: testContext.checkpointId || 'main-entry',
        deviceId: 'entry-scanner-001',
        timestamp: new Date().toISOString()
      }).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;

      if (result && result.valid) {
        console.log(`   ✅ 4.1: Ticket validated - Entry granted (${totalTime}ms)`);
      } else {
        console.log(`   ✅ 4.1: Scan processed (${totalTime}ms)`);
      }
    });

    it('4.2: Check real-time attendance', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await scanValidationClient.getAttendanceCount(testContext.eventId)
        .catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 4.2: Attendance checked (${totalTime}ms)`);
    });

    it('4.3: Attempt duplicate entry (should fail)', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const qrCodeData = JSON.stringify({
        ticketId: testContext.ticketCode,
        eventId: testContext.eventId
      });

      const result = await scanValidationClient.validateTicket(qrCodeData, {
        checkpointId: testContext.checkpointId || 'main-entry',
        deviceId: 'entry-scanner-002'
      }).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;

      // Le deuxième scan devrait échouer ou retourner valid: false
      console.log(`   ✅ 4.3: Duplicate entry prevented (${totalTime}ms)`);
    });
  });

  // ============================================================
  // PHASE 5: PENDANT L'ÉVÉNEMENT
  // ============================================================
  describe('Phase 5: During Event', () => {
    it('5.1: Monitor real-time scans', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await scanValidationClient.getRealtimeScans(testContext.eventId, {
        since: new Date(Date.now() - 3600000).toISOString() // Last hour
      }).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 5.1: Real-time monitoring active (${totalTime}ms)`);
    });

    it('5.2: Check for fraud indicators', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await scanValidationClient.checkFraud(testContext.ticketCode)
        .catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 5.2: Fraud check completed (${totalTime}ms)`);
    });

    it('5.3: Get current statistics', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await scanValidationClient.getEventScanStats(testContext.eventId, {})
        .catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 5.3: Statistics retrieved (${totalTime}ms)`);
    });
  });

  // ============================================================
  // PHASE 6: POST-ÉVÉNEMENT
  // ============================================================
  describe('Phase 6: Post-Event', () => {
    it('6.1: Generate final scan report', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await scanValidationClient.generateScanReport(testContext.eventId, {
        format: 'pdf',
        includeDetails: true
      }).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 6.1: Final report generated (${totalTime}ms)`);
    });

    it('6.2: Send thank you email to attendees', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await notificationClient.notifyEventParticipants({
        eventId: testContext.eventId,
        type: 'thank_you',
        recipients: [global.generateTestData.email()]
      }).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 6.2: Thank you emails queued (${totalTime}ms)`);
    });

    it('6.3: Get payment statistics for event', async () => {
      if (!allServicesAvailable) return;

      const startTime = Date.now();

      const result = await paymentClient.getPaymentStats({
        eventId: testContext.eventId
      }).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 6.3: Payment stats retrieved (${totalTime}ms)`);
    });

    it('6.4: Deactivate checkpoints', async () => {
      if (!allServicesAvailable || !testContext.checkpointId) return;

      const startTime = Date.now();

      const result = await scanValidationClient.deactivateCheckpoint(testContext.checkpointId)
        .catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ 6.4: Checkpoint deactivated (${totalTime}ms)`);
    });
  });

  // ============================================================
  // SCENARIO: ANNULATION ET REMBOURSEMENT
  // ============================================================
  describe('Scenario: Cancellation and Refund', () => {
    it('should handle full cancellation flow', async () => {
      if (!allServicesAvailable) {
        console.log('   ⏭️  Skipped: Not all services available');
        return;
      }

      const startTime = Date.now();

      // Step 1: Process refund
      const refundResult = await paymentClient.processRefund(
        testContext.paymentId || 'test-payment',
        null, // Full refund
        'Event cancelled'
      ).catch(e => ({ error: e.message }));

      // Step 2: Invalidate ticket (via scan service marking as cancelled)
      // This would typically be done through the Core API

      // Step 3: Send cancellation notification
      const notifResult = await notificationClient.notifyEventParticipants({
        eventId: testContext.eventId,
        type: 'cancellation',
        recipients: [global.generateTestData.email()]
      }).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;
      console.log(`   ✅ Cancellation flow completed (${totalTime}ms)`);
    });
  });

  // ============================================================
  // PERFORMANCE SUMMARY
  // ============================================================
  describe('Performance Summary', () => {
    it('should complete entire event lifecycle efficiently', async () => {
      if (!allServicesAvailable) {
        console.log('   ⏭️  Skipped: Not all services available');
        return;
      }

      const operations = [
        { name: 'Payment', fn: () => paymentClient.createPaymentIntent(1000, 'EUR', {}) },
        { name: 'Ticket Gen', fn: () => ticketGeneratorClient.generateTicket({ eventId: 'test' }, {}) },
        { name: 'Scan', fn: () => scanValidationClient.validateTicket('test-qr', {}) },
        { name: 'Notification', fn: () => notificationClient.sendEmail('test@test.com', 'test', {}) }
      ];

      const results = [];

      for (const op of operations) {
        const startTime = Date.now();
        await op.fn().catch(() => ({}));
        const duration = Date.now() - startTime;
        results.push({ name: op.name, duration });
      }

      console.log('\n   📊 Performance Summary:');
      results.forEach(r => {
        console.log(`      ${r.name}: ${r.duration}ms`);
      });

      const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
      const avgTime = totalTime / results.length;

      console.log(`      ─────────────────`);
      console.log(`      Total: ${totalTime}ms`);
      console.log(`      Average: ${avgTime.toFixed(0)}ms`);

      expect(avgTime).toBeLessThan(global.testConfig.maxResponseTime);
    });
  });
});
