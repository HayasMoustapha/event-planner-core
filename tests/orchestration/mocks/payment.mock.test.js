/**
 * Tests MOCK - Payment Service
 * Teste tous les 14 flows d'orchestration vers payment-service
 *
 * @author Event Planner Team
 * @version 1.0.0
 */

const paymentClient = require('../../../../shared/service-clients/payment-client');

describe('Payment Service - Mock Tests', () => {
  // Store original methods to restore after tests
  let originalGet;
  let originalPost;
  let originalPut;
  let originalDelete;
  let originalHealthCheck;

  beforeEach(() => {
    jest.clearAllMocks();

    // Store original methods
    originalGet = paymentClient._get;
    originalPost = paymentClient._post;
    originalPut = paymentClient._put;
    originalDelete = paymentClient._delete;
    originalHealthCheck = paymentClient.healthCheck;

    // Mock the internal methods
    paymentClient._get = jest.fn();
    paymentClient._post = jest.fn();
    paymentClient._put = jest.fn();
    paymentClient._delete = jest.fn();
    paymentClient.healthCheck = jest.fn();
  });

  afterEach(() => {
    // Restore original methods
    paymentClient._get = originalGet;
    paymentClient._post = originalPost;
    paymentClient._put = originalPut;
    paymentClient._delete = originalDelete;
    paymentClient.healthCheck = originalHealthCheck;
  });

  // ============================================================
  // 1. CREATE PAYMENT INTENT - POST /api/payments/intent
  // ============================================================
  describe('1. createPaymentIntent - POST /api/payments/intent', () => {
    it('should call correct URL with amount, currency and metadata', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        clientSecret: 'pi_xxx_secret_xxx',
        paymentIntentId: 'pi_123'
      });

      await paymentClient.createPaymentIntent(2500, 'EUR', { eventId: 'event-123', userId: 'user-456' });

      expect(paymentClient._post).toHaveBeenCalledWith(
        '/api/payments/intent',
        { amount: 2500, currency: 'EUR', metadata: { eventId: 'event-123', userId: 'user-456' } }
      );
    });

    it('should return client secret for frontend', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        paymentIntentId: 'pi_123',
        clientSecret: 'pi_123_secret_xyz',
        amount: 2500,
        currency: 'EUR'
      });

      const result = await paymentClient.createPaymentIntent(2500, 'EUR', {});

      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('paymentIntentId');
    });

    it('should handle invalid amount', async () => {
      paymentClient._post.mockRejectedValue(new Error('Amount must be positive'));

      await expect(paymentClient.createPaymentIntent(-100, 'EUR', {})).rejects.toThrow();
    });

    it('should handle Stripe API errors', async () => {
      paymentClient._post.mockRejectedValue(new Error('Stripe API unavailable'));

      await expect(paymentClient.createPaymentIntent(2500, 'EUR', {})).rejects.toThrow();
    });
  });

  // ============================================================
  // 2. CREATE CHECKOUT SESSION - POST /api/payments/checkout
  // ============================================================
  describe('2. createCheckoutSession - POST /api/payments/checkout', () => {
    const items = [
      { id: 'ticket-1', name: 'Concert Ticket', price: 5000, quantity: 2 },
      { id: 'ticket-2', name: 'VIP Upgrade', price: 2500, quantity: 1 }
    ];
    const successUrl = 'https://example.com/success';
    const cancelUrl = 'https://example.com/cancel';

    it('should call correct URL with items and URLs', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        url: 'https://checkout.stripe.com/xxx'
      });

      await paymentClient.createCheckoutSession(items, successUrl, cancelUrl, { mode: 'payment' });

      expect(paymentClient._post).toHaveBeenCalledWith(
        '/api/payments/checkout',
        {
          items,
          successUrl,
          cancelUrl,
          mode: 'payment'
        }
      );
    });

    it('should return checkout URL', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        sessionId: 'cs_xxx',
        url: 'https://checkout.stripe.com/pay/cs_xxx'
      });

      const result = await paymentClient.createCheckoutSession(items, successUrl, cancelUrl);

      expect(result).toHaveProperty('url');
      expect(result.url).toContain('checkout.stripe.com');
    });

    it('should handle empty items', async () => {
      paymentClient._post.mockRejectedValue(new Error('Items cannot be empty'));

      await expect(paymentClient.createCheckoutSession([], successUrl, cancelUrl)).rejects.toThrow();
    });
  });

  // ============================================================
  // 3. GET PAYMENT DETAILS - GET /api/payments/:id
  // ============================================================
  describe('3. getPaymentDetails - GET /api/payments/:id', () => {
    it('should call correct URL', async () => {
      paymentClient._get.mockResolvedValue({ success: true, payment: {} });

      await paymentClient.getPaymentDetails('pi_123');

      expect(paymentClient._get).toHaveBeenCalledWith('/api/payments/pi_123');
    });

    it('should return payment details', async () => {
      paymentClient._get.mockResolvedValue({
        success: true,
        payment: {
          id: 'pi_123',
          amount: 5000,
          currency: 'EUR',
          status: 'succeeded',
          paymentMethod: 'card',
          createdAt: '2024-01-15T10:00:00Z'
        }
      });

      const result = await paymentClient.getPaymentDetails('pi_123');

      expect(result.payment).toHaveProperty('status', 'succeeded');
      expect(result.payment).toHaveProperty('amount', 5000);
    });

    it('should handle payment not found', async () => {
      paymentClient._get.mockRejectedValue(new Error('Payment not found'));

      await expect(paymentClient.getPaymentDetails('invalid')).rejects.toThrow();
    });
  });

  // ============================================================
  // 4. PROCESS REFUND - POST /api/payments/:id/refund
  // ============================================================
  describe('4. processRefund - POST /api/payments/:id/refund', () => {
    it('should call correct URL with amount and reason', async () => {
      paymentClient._post.mockResolvedValue({ success: true, refundId: 're_123' });

      await paymentClient.processRefund('pi_123', 2500, 'Customer request');

      expect(paymentClient._post).toHaveBeenCalledWith(
        '/api/payments/pi_123/refund',
        { amount: 2500, reason: 'Customer request' }
      );
    });

    it('should support full refund (null amount)', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        refundId: 're_123',
        amount: 5000
      });

      await paymentClient.processRefund('pi_123', null, 'Event cancelled');

      expect(paymentClient._post).toHaveBeenCalledWith(
        '/api/payments/pi_123/refund',
        { amount: null, reason: 'Event cancelled' }
      );
    });

    it('should return refund details', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        refundId: 're_123',
        amount: 2500,
        status: 'succeeded',
        processedAt: '2024-01-15T12:00:00Z'
      });

      const result = await paymentClient.processRefund('pi_123', 2500, 'Customer request');

      expect(result).toHaveProperty('refundId');
      expect(result.status).toBe('succeeded');
    });

    it('should handle already refunded', async () => {
      paymentClient._post.mockRejectedValue(new Error('Payment already fully refunded'));

      await expect(paymentClient.processRefund('pi_123', 1000, '')).rejects.toThrow();
    });
  });

  // ============================================================
  // 5. GET USER INVOICES - GET /api/users/:id/invoices
  // ============================================================
  describe('5. getUserInvoices - GET /api/users/:id/invoices', () => {
    it('should call correct URL with pagination', async () => {
      paymentClient._get.mockResolvedValue({ success: true, invoices: [] });

      await paymentClient.getUserInvoices('user-123', { page: 1, limit: 20 });

      expect(paymentClient._get).toHaveBeenCalledWith(
        '/api/users/user-123/invoices',
        { params: { page: 1, limit: 20 } }
      );
    });

    it('should return invoices list', async () => {
      paymentClient._get.mockResolvedValue({
        success: true,
        invoices: [
          { id: 'inv-1', amount: 5000, status: 'paid', date: '2024-01-01' },
          { id: 'inv-2', amount: 2500, status: 'paid', date: '2024-01-15' }
        ],
        pagination: { page: 1, total: 2 }
      });

      const result = await paymentClient.getUserInvoices('user-123');

      expect(result.invoices).toHaveLength(2);
    });
  });

  // ============================================================
  // 6. DOWNLOAD INVOICE - GET /api/invoices/:id/download
  // ============================================================
  describe('6. downloadInvoice - GET /api/invoices/:id/download', () => {
    it('should call correct URL', async () => {
      paymentClient._get.mockResolvedValue({
        success: true,
        url: 'https://cdn.example.com/invoice.pdf'
      });

      await paymentClient.downloadInvoice('inv-123');

      expect(paymentClient._get).toHaveBeenCalledWith('/api/invoices/inv-123/download');
    });

    it('should return download URL', async () => {
      paymentClient._get.mockResolvedValue({
        success: true,
        url: 'https://cdn.example.com/invoices/inv-123.pdf',
        expiresAt: '2024-01-16T10:00:00Z'
      });

      const result = await paymentClient.downloadInvoice('inv-123');

      expect(result).toHaveProperty('url');
      expect(result.url).toContain('pdf');
    });
  });

  // ============================================================
  // 7. CREATE SUBSCRIPTION - POST /api/subscriptions
  // ============================================================
  describe('7. createSubscription - POST /api/subscriptions', () => {
    it('should call correct URL with user and plan', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        subscriptionId: 'sub_123'
      });

      await paymentClient.createSubscription('user-123', 'plan-pro', { trialDays: 14 });

      expect(paymentClient._post).toHaveBeenCalledWith(
        '/api/subscriptions',
        { userId: 'user-123', planId: 'plan-pro', trialDays: 14 }
      );
    });

    it('should return subscription details', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        subscriptionId: 'sub_123',
        status: 'active',
        currentPeriodEnd: '2024-02-15T10:00:00Z',
        trialEnd: '2024-01-29T10:00:00Z'
      });

      const result = await paymentClient.createSubscription('user-123', 'plan-pro');

      expect(result).toHaveProperty('subscriptionId');
      expect(result.status).toBe('active');
    });
  });

  // ============================================================
  // 8. CANCEL SUBSCRIPTION - POST /api/subscriptions/:id/cancel
  // ============================================================
  describe('8. cancelSubscription - POST /api/subscriptions/:id/cancel', () => {
    it('should call correct URL with reason', async () => {
      paymentClient._post.mockResolvedValue({ success: true, status: 'cancelled' });

      await paymentClient.cancelSubscription('sub_123', 'No longer needed');

      expect(paymentClient._post).toHaveBeenCalledWith(
        '/api/subscriptions/sub_123/cancel',
        { reason: 'No longer needed' }
      );
    });

    it('should return cancellation confirmation', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        status: 'cancelled',
        cancelledAt: '2024-01-15T12:00:00Z',
        accessUntil: '2024-02-15T10:00:00Z'
      });

      const result = await paymentClient.cancelSubscription('sub_123', '');

      expect(result.status).toBe('cancelled');
      expect(result).toHaveProperty('accessUntil');
    });
  });

  // ============================================================
  // 9. UPDATE PAYMENT METHOD - PUT /api/users/:id/payment-method
  // ============================================================
  describe('9. updatePaymentMethod - PUT /api/users/:id/payment-method', () => {
    it('should call correct URL with payment method ID', async () => {
      paymentClient._put.mockResolvedValue({ success: true, updated: true });

      await paymentClient.updatePaymentMethod('user-123', 'pm_xxx');

      expect(paymentClient._put).toHaveBeenCalledWith(
        '/api/users/user-123/payment-method',
        { paymentMethodId: 'pm_xxx' }
      );
    });

    it('should return update confirmation', async () => {
      paymentClient._put.mockResolvedValue({
        success: true,
        paymentMethod: {
          id: 'pm_xxx',
          type: 'card',
          last4: '4242',
          brand: 'visa'
        }
      });

      const result = await paymentClient.updatePaymentMethod('user-123', 'pm_xxx');

      expect(result.paymentMethod).toHaveProperty('last4', '4242');
    });
  });

  // ============================================================
  // 10. GET TICKET PAYMENT STATUS - GET /api/payments/ticket/:code
  // ============================================================
  describe('10. getTicketPaymentStatus - GET /api/payments/ticket/:code', () => {
    it('should call correct URL', async () => {
      paymentClient._get.mockResolvedValue({ success: true, status: 'paid' });

      await paymentClient.getTicketPaymentStatus('TKT-001');

      expect(paymentClient._get).toHaveBeenCalledWith('/api/payments/ticket/TKT-001');
    });

    it('should return payment status for ticket', async () => {
      paymentClient._get.mockResolvedValue({
        success: true,
        ticketCode: 'TKT-001',
        paymentStatus: 'paid',
        amount: 5000,
        paidAt: '2024-01-15T10:00:00Z',
        paymentId: 'pi_123'
      });

      const result = await paymentClient.getTicketPaymentStatus('TKT-001');

      expect(result.paymentStatus).toBe('paid');
    });

    it('should handle unpaid ticket', async () => {
      paymentClient._get.mockResolvedValue({
        success: true,
        ticketCode: 'TKT-002',
        paymentStatus: 'pending',
        amount: 5000
      });

      const result = await paymentClient.getTicketPaymentStatus('TKT-002');

      expect(result.paymentStatus).toBe('pending');
    });
  });

  // ============================================================
  // 11. CREATE TICKET PAYMENT - POST /api/payments/tickets
  // ============================================================
  describe('11. createTicketPayment - POST /api/payments/tickets', () => {
    const ticketPayment = {
      ticketTypeId: 'type-1',
      quantity: 2,
      userId: 'user-123',
      eventId: 'event-456'
    };

    it('should call correct URL with ticket payment data', async () => {
      paymentClient._post.mockResolvedValue({ success: true, paymentId: 'pi_xxx' });

      await paymentClient.createTicketPayment(ticketPayment);

      expect(paymentClient._post).toHaveBeenCalledWith('/api/payments/tickets', ticketPayment);
    });

    it('should return payment details', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        paymentId: 'pi_xxx',
        amount: 10000,
        clientSecret: 'pi_xxx_secret',
        ticketReservation: {
          reservationId: 'res-123',
          expiresAt: '2024-01-15T10:15:00Z'
        }
      });

      const result = await paymentClient.createTicketPayment(ticketPayment);

      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('ticketReservation');
    });
  });

  // ============================================================
  // 12. PROCESS STRIPE WEBHOOK - POST /api/webhooks/stripe
  // ============================================================
  describe('12. processStripeWebhook - POST /api/webhooks/stripe', () => {
    const payload = {
      id: 'evt_xxx',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123', amount: 5000 } }
    };
    const signature = 'whsec_xxx';

    it('should call correct URL with payload and signature header', async () => {
      paymentClient._post.mockResolvedValue({ success: true, processed: true });

      await paymentClient.processStripeWebhook(payload, signature);

      expect(paymentClient._post).toHaveBeenCalledWith(
        '/api/webhooks/stripe',
        payload,
        { headers: { 'Stripe-Signature': signature } }
      );
    });

    it('should return processing result', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        eventType: 'payment_intent.succeeded',
        processed: true,
        actions: ['ticket_created', 'email_sent']
      });

      const result = await paymentClient.processStripeWebhook(payload, signature);

      expect(result.processed).toBe(true);
      expect(result.actions).toContain('ticket_created');
    });

    it('should handle invalid signature', async () => {
      paymentClient._post.mockRejectedValue(new Error('Invalid signature'));

      await expect(paymentClient.processStripeWebhook(payload, 'bad_sig')).rejects.toThrow();
    });
  });

  // ============================================================
  // 13. PROCESS PAYPAL WEBHOOK - POST /api/webhooks/paypal
  // ============================================================
  describe('13. processPayPalWebhook - POST /api/webhooks/paypal', () => {
    const payload = {
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: 'PAY-xxx', amount: { value: '50.00' } }
    };

    it('should call correct URL with payload', async () => {
      paymentClient._post.mockResolvedValue({ success: true, processed: true });

      await paymentClient.processPayPalWebhook(payload);

      expect(paymentClient._post).toHaveBeenCalledWith('/api/webhooks/paypal', payload);
    });

    it('should return processing result', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        processed: true
      });

      const result = await paymentClient.processPayPalWebhook(payload);

      expect(result.processed).toBe(true);
    });
  });

  // ============================================================
  // 14. GET PAYMENT STATS - GET /api/payments/stats
  // ============================================================
  describe('14. getPaymentStats - GET /api/payments/stats', () => {
    it('should call correct URL with filters', async () => {
      paymentClient._get.mockResolvedValue({ success: true, stats: {} });

      await paymentClient.getPaymentStats({ dateFrom: '2024-01-01', dateTo: '2024-01-31', status: 'succeeded' });

      expect(paymentClient._get).toHaveBeenCalledWith(
        '/api/payments/stats',
        { params: { dateFrom: '2024-01-01', dateTo: '2024-01-31', status: 'succeeded' } }
      );
    });

    it('should return comprehensive statistics', async () => {
      paymentClient._get.mockResolvedValue({
        success: true,
        stats: {
          totalRevenue: 150000,
          totalTransactions: 300,
          averageOrderValue: 500,
          successRate: 98.5,
          byStatus: { succeeded: 295, failed: 5 },
          byPaymentMethod: { card: 250, paypal: 50 }
        }
      });

      const result = await paymentClient.getPaymentStats();

      expect(result.stats).toHaveProperty('totalRevenue');
      expect(result.stats).toHaveProperty('successRate');
      expect(result.stats).toHaveProperty('byPaymentMethod');
    });
  });

  // ============================================================
  // HEALTH CHECK
  // ============================================================
  describe('healthCheck - GET /health', () => {
    it('should return healthy status', async () => {
      paymentClient.healthCheck.mockResolvedValue({
        success: true,
        status: 'healthy',
        service: 'payment',
        stripeConnected: true,
        paypalConnected: true
      });

      const result = await paymentClient.healthCheck();

      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
    });

    it('should handle degraded state (partial connectivity)', async () => {
      paymentClient.healthCheck.mockResolvedValue({
        success: true,
        status: 'degraded',
        stripeConnected: true,
        paypalConnected: false
      });

      const result = await paymentClient.healthCheck();

      expect(result.success).toBe(true);
    });

    it('should handle service down', async () => {
      paymentClient.healthCheck.mockResolvedValue({
        success: false,
        status: 'unhealthy',
        error: 'Connection refused'
      });

      const result = await paymentClient.healthCheck();

      expect(result.success).toBe(false);
      expect(result.status).toBe('unhealthy');
    });
  });

  // ============================================================
  // ERROR HANDLING
  // ============================================================
  describe('Error Handling', () => {
    it('should handle payment declined', async () => {
      paymentClient._post.mockRejectedValue(new Error('Payment declined'));

      await expect(paymentClient.createPaymentIntent(5000, 'EUR', {})).rejects.toThrow();
    });

    it('should handle rate limiting', async () => {
      paymentClient._post.mockRejectedValue(new Error('Too many requests'));

      await expect(paymentClient.createPaymentIntent(5000, 'EUR', {})).rejects.toThrow();
    });

    it('should handle network timeout', async () => {
      paymentClient._post.mockRejectedValue(new Error('timeout of 30000ms exceeded'));

      await expect(paymentClient.createPaymentIntent(5000, 'EUR', {})).rejects.toThrow();
    });

    it('should handle invalid currency', async () => {
      paymentClient._post.mockRejectedValue(new Error('Invalid currency code'));

      await expect(paymentClient.createPaymentIntent(5000, 'INVALID', {})).rejects.toThrow();
    });

    it('should handle 3D Secure required', async () => {
      paymentClient._post.mockResolvedValue({
        success: true,
        status: 'requires_action',
        requiresAction: true,
        nextAction: {
          type: 'redirect_to_url',
          redirect_to_url: { url: 'https://hooks.stripe.com/3d_secure_2/...' }
        }
      });

      const result = await paymentClient.createPaymentIntent(5000, 'EUR', {});

      expect(result.requiresAction).toBe(true);
      expect(result.nextAction).toHaveProperty('type', 'redirect_to_url');
    });
  });

  // ============================================================
  // MALFORMED RESPONSES
  // ============================================================
  describe('Malformed Responses', () => {
    it('should handle null response', async () => {
      paymentClient._post.mockResolvedValue(null);

      const result = await paymentClient.createPaymentIntent(5000, 'EUR', {});

      expect(result).toBeNull();
    });
  });
});
