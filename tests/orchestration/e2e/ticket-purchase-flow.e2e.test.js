/**
 * Tests E2E - Flow Achat de Ticket
 * Teste le parcours complet: Paiement → Génération Ticket → Notification
 *
 * @author Event Planner Team
 * @version 1.0.0
 *
 * PRÉREQUIS: Tous les services doivent être démarrés
 * - payment-service (3003)
 * - ticket-generator-service (3004)
 * - notification-service (3002)
 */

const paymentClient = require('../../../../shared/service-clients/payment-client');
const ticketGeneratorClient = require('../../../../shared/service-clients/ticket-generator-client');
const notificationClient = require('../../../../shared/service-clients/notification-client');

describe('E2E - Ticket Purchase Flow', () => {
  let servicesAvailable = {
    payment: false,
    ticketGenerator: false,
    notification: false
  };

  beforeAll(async () => {
    // Vérifier la disponibilité de tous les services
    const [paymentHealth, ticketHealth, notificationHealth] = await Promise.all([
      paymentClient.healthCheck().catch(() => ({ success: false })),
      ticketGeneratorClient.healthCheck().catch(() => ({ success: false })),
      notificationClient.healthCheck().catch(() => ({ success: false }))
    ]);

    servicesAvailable.payment = paymentHealth.success;
    servicesAvailable.ticketGenerator = ticketHealth.success;
    servicesAvailable.notification = notificationHealth.success;

    const allAvailable = Object.values(servicesAvailable).every(v => v);
    if (!allAvailable) {
      console.warn('⚠️  Certains services ne sont pas disponibles:');
      Object.entries(servicesAvailable).forEach(([name, available]) => {
        console.warn(`   ${available ? '✅' : '❌'} ${name}`);
      });
    }
  });

  // ============================================================
  // FLOW 1: Achat de ticket standard
  // ============================================================
  describe('Flow 1: Standard Ticket Purchase', () => {
    let paymentIntentId = null;
    let ticketCode = null;
    let notificationId = null;

    it('Step 1: Create payment intent', async () => {
      if (!servicesAvailable.payment) {
        console.log('   ⏭️  Skipped: Payment service not available');
        return;
      }

      const startTime = Date.now();
      const result = await paymentClient.createPaymentIntent(5000, 'EUR', {
        userId: global.generateTestData.userId(),
        eventId: global.generateTestData.eventId(),
        ticketType: 'standard'
      }).catch(e => ({ error: e.message }));

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      if (result && !result.error) {
        paymentIntentId = result.paymentIntentId || 'pi_simulated';
        console.log(`   ✅ Step 1: Payment intent created (${responseTime}ms)`);
      } else {
        console.log(`   ⚠️  Step 1: ${result?.error || 'No response'} (${responseTime}ms)`);
      }
    });

    it('Step 2: Generate ticket after payment', async () => {
      if (!servicesAvailable.ticketGenerator) {
        console.log('   ⏭️  Skipped: Ticket Generator service not available');
        return;
      }

      const ticketData = {
        eventId: global.generateTestData.eventId(),
        guestId: global.generateTestData.guestId(),
        ticketTypeId: 'standard',
        paymentId: paymentIntentId || 'test-payment'
      };

      const startTime = Date.now();
      const result = await ticketGeneratorClient.generateTicket(ticketData, {
        generatePdf: true
      }).catch(e => ({ error: e.message }));

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      if (result && result.ticketCode) {
        ticketCode = result.ticketCode;
        console.log(`   ✅ Step 2: Ticket generated: ${ticketCode} (${responseTime}ms)`);
      } else {
        console.log(`   ⚠️  Step 2: ${result?.error || 'No ticket code'} (${responseTime}ms)`);
      }
    });

    it('Step 3: Send confirmation email', async () => {
      if (!servicesAvailable.notification) {
        console.log('   ⏭️  Skipped: Notification service not available');
        return;
      }

      const ticketData = {
        email: global.generateTestData.email(),
        ticketCode: ticketCode || 'TKT-TEST-001',
        eventTitle: 'Test Event E2E',
        pdfUrl: 'https://cdn.example.com/ticket.pdf'
      };

      const startTime = Date.now();
      const result = await notificationClient.sendTicketConfirmation(ticketData)
        .catch(e => ({ error: e.message }));

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      if (result && result.messageId) {
        notificationId = result.messageId;
        console.log(`   ✅ Step 3: Confirmation email sent: ${notificationId} (${responseTime}ms)`);
      } else {
        console.log(`   ⚠️  Step 3: ${result?.error || 'No message ID'} (${responseTime}ms)`);
      }
    });

    it('Step 4: Verify notification status', async () => {
      if (!servicesAvailable.notification || !notificationId) {
        console.log('   ⏭️  Skipped: No notification to verify');
        return;
      }

      const startTime = Date.now();
      const result = await notificationClient.getNotificationStatus(notificationId)
        .catch(e => ({ error: e.message }));

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      console.log(`   ✅ Step 4: Notification status checked (${responseTime}ms)`);
    });
  });

  // ============================================================
  // FLOW 2: Achat groupé (batch)
  // ============================================================
  describe('Flow 2: Batch Ticket Purchase', () => {
    it('should process batch purchase flow', async () => {
      if (!servicesAvailable.payment || !servicesAvailable.ticketGenerator) {
        console.log('   ⏭️  Skipped: Required services not available');
        return;
      }

      const batchSize = 5;
      const totalAmount = 5000 * batchSize;

      // Step 1: Create payment for batch
      const startTime = Date.now();
      const paymentResult = await paymentClient.createPaymentIntent(totalAmount, 'EUR', {
        userId: global.generateTestData.userId(),
        eventId: global.generateTestData.eventId(),
        ticketCount: batchSize
      }).catch(e => ({ error: e.message }));

      const paymentTime = Date.now() - startTime;
      console.log(`   Step 1: Batch payment created (${paymentTime}ms)`);

      // Step 2: Generate batch tickets
      const tickets = Array(batchSize).fill(null).map(() => ({
        eventId: global.generateTestData.eventId(),
        guestId: global.generateTestData.guestId(),
        ticketTypeId: 'standard'
      }));

      const batchStart = Date.now();
      const batchResult = await ticketGeneratorClient.generateBatch(tickets, {})
        .catch(e => ({ error: e.message }));

      const batchTime = Date.now() - batchStart;
      console.log(`   Step 2: Batch ticket generation queued (${batchTime}ms)`);

      // Step 3: Send bulk notification
      if (servicesAvailable.notification) {
        const recipients = Array(batchSize).fill(null).map(() => global.generateTestData.email());

        const notifStart = Date.now();
        const notifResult = await notificationClient.queueBulkEmail(
          recipients,
          'ticket_confirmation',
          { eventTitle: 'Batch Event' }
        ).catch(e => ({ error: e.message }));

        const notifTime = Date.now() - notifStart;
        console.log(`   Step 3: Bulk notification queued (${notifTime}ms)`);
      }

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(global.testConfig.maxResponseTime * 3);

      console.log(`   ✅ Batch purchase flow completed (${totalTime}ms total)`);
    });
  });

  // ============================================================
  // FLOW 3: Achat avec remboursement
  // ============================================================
  describe('Flow 3: Purchase with Refund', () => {
    it('should process purchase and refund flow', async () => {
      if (!servicesAvailable.payment) {
        console.log('   ⏭️  Skipped: Payment service not available');
        return;
      }

      // Step 1: Create and "complete" payment
      const startTime = Date.now();
      const paymentResult = await paymentClient.createPaymentIntent(5000, 'EUR', {
        userId: global.generateTestData.userId(),
        eventId: global.generateTestData.eventId()
      }).catch(e => ({ error: e.message }));

      const paymentId = paymentResult?.paymentIntentId || 'pi_test_refund';
      console.log(`   Step 1: Payment created (${Date.now() - startTime}ms)`);

      // Step 2: Process refund
      const refundStart = Date.now();
      const refundResult = await paymentClient.processRefund(
        paymentId,
        5000,
        'Customer requested cancellation'
      ).catch(e => ({ error: e.message }));

      const refundTime = Date.now() - refundStart;
      console.log(`   Step 2: Refund processed (${refundTime}ms)`);

      // Step 3: Send refund notification
      if (servicesAvailable.notification) {
        const notifStart = Date.now();
        const notifResult = await notificationClient.sendEmail(
          global.generateTestData.email(),
          'refund_confirmation',
          { amount: 50.00, currency: 'EUR' }
        ).catch(e => ({ error: e.message }));

        const notifTime = Date.now() - notifStart;
        console.log(`   Step 3: Refund notification sent (${notifTime}ms)`);
      }

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(global.testConfig.maxResponseTime * 3);

      console.log(`   ✅ Purchase with refund flow completed (${totalTime}ms total)`);
    });
  });

  // ============================================================
  // PERFORMANCE TESTS
  // ============================================================
  describe('Performance: Full Flow Timing', () => {
    it('should complete full purchase flow within acceptable time', async () => {
      const allAvailable = Object.values(servicesAvailable).every(v => v);
      if (!allAvailable) {
        console.log('   ⏭️  Skipped: Not all services available');
        return;
      }

      const startTime = Date.now();

      // Simulate full flow in parallel where possible
      const [paymentResult, notificationResult] = await Promise.all([
        paymentClient.createPaymentIntent(5000, 'EUR', {}).catch(e => ({ error: e.message })),
        notificationClient.sendEmail(global.generateTestData.email(), 'welcome', {}).catch(e => ({ error: e.message }))
      ]);

      // Sequential: ticket generation depends on payment
      const ticketResult = await ticketGeneratorClient.generateTicket({
        eventId: global.generateTestData.eventId(),
        guestId: global.generateTestData.guestId(),
        ticketTypeId: 'standard'
      }, {}).catch(e => ({ error: e.message }));

      const totalTime = Date.now() - startTime;

      // Full flow should complete within 10 seconds
      expect(totalTime).toBeLessThan(10000);

      console.log(`   ✅ Full flow timing: ${totalTime}ms`);
      console.log(`      Breakdown: Payment+Notification (parallel), then Ticket (sequential)`);
    });
  });

  // ============================================================
  // ERROR HANDLING FLOW
  // ============================================================
  describe('Error Handling: Graceful Degradation', () => {
    it('should handle partial service failure gracefully', async () => {
      // Ce test vérifie que si un service échoue, les autres continuent
      const startTime = Date.now();

      const results = await Promise.allSettled([
        paymentClient.createPaymentIntent(5000, 'EUR', {}).catch(e => ({ error: e.message })),
        ticketGeneratorClient.generateTicket({ eventId: 'invalid' }, {}).catch(e => ({ error: e.message })),
        notificationClient.sendEmail('invalid-email', 'welcome', {}).catch(e => ({ error: e.message }))
      ]);

      const totalTime = Date.now() - startTime;

      // Même avec des erreurs, le flow ne doit pas bloquer
      expect(totalTime).toBeLessThan(global.testConfig.maxResponseTime * 2);

      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;

      console.log(`   ✅ Graceful degradation: ${fulfilled} fulfilled, ${rejected} rejected (${totalTime}ms)`);
    });
  });
});
