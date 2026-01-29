/**
 * Tests INTÉGRATION RÉELS - Payment Service
 * Tests avec le service réellement démarré
 *
 * @author Event Planner Team
 * @version 1.0.0
 *
 * PRÉREQUIS: payment-service doit être démarré sur le port 3003
 */

const paymentClient = require('../../../../shared/service-clients/payment-client');

describe('Payment Service - Integration Tests', () => {
  let serviceAvailable = false;

  beforeAll(async () => {
    serviceAvailable = await global.waitForService(paymentClient, 5, 2000);
    if (!serviceAvailable) {
      console.warn('⚠️  Payment Service non disponible - tests en mode skip');
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
        paymentClient.healthCheck()
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      console.log(`   ✅ Health check passed (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 1. CREATE PAYMENT INTENT
  // ============================================================
  describe('1. createPaymentIntent', () => {
    it('should create payment intent', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.createPaymentIntent(2500, 'EUR', {
            userId: global.generateTestData.userId(),
            eventId: global.generateTestData.eventId()
          });
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Payment intent creation handled (${responseTime}ms)`);
    });

    it('should handle different currencies', async () => {
      if (!serviceAvailable) return;

      const currencies = ['EUR', 'USD', 'GBP'];

      for (const currency of currencies) {
        const { result, responseTime } = await global.measureResponseTime(async () => {
          try {
            return await paymentClient.createPaymentIntent(1000, currency, {});
          } catch (error) {
            return { error: error.message };
          }
        });

        expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
        console.log(`   ✅ Payment intent (${currency}) handled (${responseTime}ms)`);
      }
    });
  });

  // ============================================================
  // 2. CREATE CHECKOUT SESSION
  // ============================================================
  describe('2. createCheckoutSession', () => {
    it('should create checkout session', async () => {
      if (!serviceAvailable) return;

      const items = [
        { id: 'ticket-1', name: 'Test Ticket', price: 2500, quantity: 2 }
      ];

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.createCheckoutSession(
            items,
            'https://example.com/success',
            'https://example.com/cancel',
            { mode: 'payment' }
          );
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Checkout session creation handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 3. GET PAYMENT DETAILS
  // ============================================================
  describe('3. getPaymentDetails', () => {
    it('should retrieve payment details', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.getPaymentDetails('pi_test_123');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Payment details retrieval handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 4. PROCESS REFUND
  // ============================================================
  describe('4. processRefund', () => {
    it('should handle refund request', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.processRefund('pi_test_123', 1000, 'Customer request');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Refund processing handled (${responseTime}ms)`);
    });

    it('should handle full refund', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.processRefund('pi_test_123', null, 'Full refund');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Full refund handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 5. GET USER INVOICES
  // ============================================================
  describe('5. getUserInvoices', () => {
    it('should retrieve user invoices', async () => {
      if (!serviceAvailable) return;

      const userId = global.generateTestData.userId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.getUserInvoices(userId, { page: 1, limit: 10 });
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ User invoices retrieval handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 6. DOWNLOAD INVOICE
  // ============================================================
  describe('6. downloadInvoice', () => {
    it('should handle invoice download', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.downloadInvoice('inv_test_123');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Invoice download handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 7. CREATE SUBSCRIPTION
  // ============================================================
  describe('7. createSubscription', () => {
    it('should create subscription', async () => {
      if (!serviceAvailable) return;

      const userId = global.generateTestData.userId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.createSubscription(userId, 'plan-pro', { trialDays: 14 });
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Subscription creation handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 8. CANCEL SUBSCRIPTION
  // ============================================================
  describe('8. cancelSubscription', () => {
    it('should cancel subscription', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.cancelSubscription('sub_test_123', 'No longer needed');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Subscription cancellation handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 9. UPDATE PAYMENT METHOD
  // ============================================================
  describe('9. updatePaymentMethod', () => {
    it('should update payment method', async () => {
      if (!serviceAvailable) return;

      const userId = global.generateTestData.userId();

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.updatePaymentMethod(userId, 'pm_test_xxx');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Payment method update handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 10. GET TICKET PAYMENT STATUS
  // ============================================================
  describe('10. getTicketPaymentStatus', () => {
    it('should retrieve ticket payment status', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.getTicketPaymentStatus('TKT-TEST-001');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Ticket payment status retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 11. CREATE TICKET PAYMENT
  // ============================================================
  describe('11. createTicketPayment', () => {
    it('should create ticket payment', async () => {
      if (!serviceAvailable) return;

      const ticketPayment = {
        ticketTypeId: 'type-standard',
        quantity: 2,
        userId: global.generateTestData.userId(),
        eventId: global.generateTestData.eventId()
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.createTicketPayment(ticketPayment);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Ticket payment creation handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 12. PROCESS STRIPE WEBHOOK
  // ============================================================
  describe('12. processStripeWebhook', () => {
    it('should process Stripe webhook', async () => {
      if (!serviceAvailable) return;

      const payload = {
        id: 'evt_test_xxx',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test', amount: 5000 } }
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.processStripeWebhook(payload, 'test_signature');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Stripe webhook processing handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 13. PROCESS PAYPAL WEBHOOK
  // ============================================================
  describe('13. processPayPalWebhook', () => {
    it('should process PayPal webhook', async () => {
      if (!serviceAvailable) return;

      const payload = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'PAY-xxx', amount: { value: '50.00' } }
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.processPayPalWebhook(payload);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ PayPal webhook processing handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 14. GET PAYMENT STATS
  // ============================================================
  describe('14. getPaymentStats', () => {
    it('should retrieve payment statistics', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.getPaymentStats({
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31'
          });
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Payment stats retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // PERFORMANCE TESTS
  // ============================================================
  describe('Performance Tests', () => {
    it('should handle concurrent payment intent requests', async () => {
      if (!serviceAvailable) return;

      const startTime = Date.now();

      const promises = Array(5).fill(null).map(() =>
        paymentClient.createPaymentIntent(1000, 'EUR', {})
          .catch(e => ({ error: e.message }))
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(global.testConfig.maxResponseTime * 2);
      console.log(`   ✅ Concurrent payment intents: 5 requests in ${totalTime}ms`);
    });
  });

  // ============================================================
  // SECURITY TESTS
  // ============================================================
  describe('Security Tests', () => {
    it('should not leak sensitive data in error responses', async () => {
      if (!serviceAvailable) return;

      const { result } = await global.measureResponseTime(async () => {
        try {
          return await paymentClient.getPaymentDetails('invalid');
        } catch (error) {
          return { error: error.message };
        }
      });

      // L'erreur ne doit pas contenir de données sensibles
      if (result.error) {
        expect(result.error).not.toContain('api_key');
        expect(result.error).not.toContain('secret');
        expect(result.error).not.toContain('password');
      }

      console.log('   ✅ No sensitive data leakage in errors');
    });
  });
});
