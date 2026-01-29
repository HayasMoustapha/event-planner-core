/**
 * ========================================
 * TESTS D'ORCHESTRATION PAYMENT ↔ CORE
 * ========================================
 * Tests d'intégration entre Payment Service et Core Service
 * @version 1.0.0
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Payment ↔ Core Integration Tests', () => {
  let authToken;
  let userId;
  let testEvent;
  let testTicketType;
  let testPurchase;

  beforeAll(async () => {
    // Créer un utilisateur de test
    const userResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'payment-test@example.com',
        password: 'Test123!',
        first_name: 'Payment',
        last_name: 'User'
      })
      .expect(201);

    userId = userResponse.body.data.id;
    authToken = userResponse.body.data.token;

    // Créer un événement de test
    const eventResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Payment Test Event',
        description: 'Event for payment testing',
        event_date: '2024-12-31T23:59:59Z',
        location: 'Test Location',
        max_attendees: 100,
        organizer_id: userId
      })
      .expect(201);

    testEvent = eventResponse.body.data;

    // Créer un type de ticket
    const ticketTypeResponse = await request(app)
      .post('/api/ticket-types')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        event_id: testEvent.id,
        name: 'VIP Ticket',
        description: 'VIP access ticket',
        type: 'vip',
        quantity: 50,
        price: 99.99,
        currency: 'EUR'
      })
      .expect(201);

    testTicketType = ticketTypeResponse.body.data;
  });

  afterAll(async () => {
    // Nettoyer les ressources de test
    if (testPurchase) {
      await request(app)
        .delete(`/api/purchases/${testPurchase.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    }

    if (testTicketType) {
      await request(app)
        .delete(`/api/ticket-types/${testTicketType.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    }

    if (testEvent) {
      await request(app)
        .delete(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    }

    await request(app)
      .delete(`/auth/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`);
  });

  describe('Payment Intent Creation', () => {
    it('should create payment intent for ticket purchase', async () => {
      const paymentIntentResponse = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticket_type_id: testTicketType.id,
          quantity: 2,
          currency: 'EUR',
          payment_method: 'credit_card'
        })
        .expect(201);

      expect(paymentIntentResponse.body.success).toBe(true);
      expect(paymentIntentResponse.body.data.intent_id).toBeDefined();
      expect(paymentIntentResponse.body.data.amount).toBe(199.98); // 99.99 * 2
      expect(paymentIntentResponse.body.data.currency).toBe('EUR');
      expect(paymentIntentResponse.body.data.status).toBe('pending');
    });

    it('should create payment intent with different currencies', async () => {
      const currencies = ['EUR', 'USD', 'GBP'];
      
      for (const currency of currencies) {
        const response = await request(app)
          .post('/api/payments/intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ticket_type_id: testTicketType.id,
            quantity: 1,
            currency: currency,
            payment_method: 'credit_card'
          })
          .expect(201);

        expect(response.body.data.currency).toBe(currency);
        expect(response.body.data.amount).toBe(99.99);
      }
    });

    it('should reject invalid payment intent data', async () => {
      const invalidData = [
        { ticket_type_id: null, quantity: 1 },
        { ticket_type_id: testTicketType.id, quantity: 0 },
        { ticket_type_id: testTicketType.id, quantity: -1 },
        { ticket_type_id: testTicketType.id, quantity: 1000 }, // Trop de tickets
        { ticket_type_id: testTicketType.id, quantity: 1, currency: 'INVALID' },
        { ticket_type_id: testTicketType.id, quantity: 1, payment_method: 'INVALID' }
      ];

      for (const data of invalidData) {
        const response = await request(app)
          .post('/api/payments/intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send(data)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should handle insufficient ticket availability', async () => {
      // Créer un type de ticket avec quantité limitée
      const limitedTicketTypeResponse = await request(app)
        .post('/api/ticket-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_id: testEvent.id,
          name: 'Limited Ticket',
          description: 'Limited quantity ticket',
          type: 'standard',
          quantity: 2,
          price: 50.00,
          currency: 'EUR'
        })
        .expect(201);

      const limitedTicketType = limitedTicketTypeResponse.body.data;

      // Essayer d'acheter plus de tickets que disponible
      const response = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticket_type_id: limitedTicketType.id,
          quantity: 5, // Plus que les 2 disponibles
          currency: 'EUR',
          payment_method: 'credit_card'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('insufficient');

      // Nettoyer
      await request(app)
        .delete(`/api/ticket-types/${limitedTicketType.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });

  describe('Payment Processing', () => {
    let paymentIntent;

    beforeEach(async () => {
      // Créer un payment intent pour chaque test
      const response = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticket_type_id: testTicketType.id,
          quantity: 1,
          currency: 'EUR',
          payment_method: 'credit_card'
        })
        .expect(201);

      paymentIntent = response.body.data;
    });

    it('should process successful payment', async () => {
      const processResponse = await request(app)
        .post(`/api/payments/${paymentIntent.intent_id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payment_method_id: 'pm_card_visa',
          card: {
            number: '4242424242424242',
            exp_month: '12',
            exp_year: '2024',
            cvc: '123'
          }
        })
        .expect(200);

      expect(processResponse.body.success).toBe(true);
      expect(processResponse.body.data.status).toBe('succeeded');
      expect(processResponse.body.data.paid_at).toBeDefined();
    });

    it('should handle payment failure', async () => {
      const processResponse = await request(app)
        .post(`/api/payments/${paymentIntent.intent_id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payment_method_id: 'pm_card_declined',
          card: {
            number: '4000000000000002',
            exp_month: '12',
            exp_year: '2024',
            cvc: '123'
          }
        })
        .expect(400);

      expect(processResponse.body.success).toBe(false);
      expect(processResponse.body.data.status).toBe('failed');
    });

    it('should handle payment cancellation', async () => {
      const cancelResponse = await request(app)
        .post(`/api/payments/${paymentIntent.intent_id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.data.status).toBe('canceled');
    });

    it('should handle payment refund', async () => {
      // D'abord traiter un paiement réussi
      const processResponse = await request(app)
        .post(`/api/payments/${paymentIntent.intent_id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payment_method_id: 'pm_card_visa',
          card: {
            number: '4242424242424242',
            exp_month: '12',
            exp_year: '2024',
            cvc: '123'
          }
        })
        .expect(200);

      // Ensuite rembourser
      const refundResponse = await request(app)
        .post(`/api/payments/${paymentIntent.intent_id}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50.00, // Remboursement partiel
          reason: 'customer_request'
        })
        .expect(200);

      expect(refundResponse.body.success).toBe(true);
      expect(refundResponse.body.data.status).toBe('succeeded');
      expect(refundResponse.body.data.amount).toBe(50.00);
    });
  });

  describe('Payment Methods', () => {
    it('should list available payment methods', async () => {
      const response = await request(app)
        .get('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const methods = response.body.data;
      expect(methods.length).toBeGreaterThan(0);
      
      // Vérifier que les méthodes essentielles sont présentes
      const methodIds = methods.map(m => m.id);
      expect(methodIds).toContain('credit_card');
      expect(methodIds).toContain('paypal');
    });

    it('should save payment method', async () => {
      const response = await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'card',
          card: {
            number: '4242424242424242',
            exp_month: '12',
            exp_year: '2024',
            cvc: '123'
          },
          billing_details: {
            name: 'Test User',
            email: 'test@example.com'
          }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.type).toBe('card');
      expect(response.body.data.last4).toBe('4242');
    });

    it('should retrieve saved payment method', async () => {
      // D'abord sauvegarder une méthode
      const saveResponse = await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'card',
          card: {
            number: '5555555555554444',
            exp_month: '12',
            exp_year: '2024',
            cvc: '123'
          },
          billing_details: {
            name: 'Test User',
            email: 'test@example.com'
          }
        })
        .expect(201);

      const methodId = saveResponse.body.data.id;

      // Récupérer la méthode
      const response = await request(app)
        .get(`/api/payments/methods/${methodId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(methodId);
      expect(response.body.data.last4).toBe('4444');
    });
  });

  describe('Purchase History', () => {
    let testPurchases = [];

    beforeEach(async () => {
      // Créer quelques achats de test
      for (let i = 0; i < 3; i++) {
        const intentResponse = await request(app)
          .post('/api/payments/intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ticket_type_id: testTicketType.id,
            quantity: 1,
            currency: 'EUR',
            payment_method: 'credit_card'
          })
          .expect(201);

        const processResponse = await request(app)
          .post(`/api/payments/${intentResponse.body.data.intent_id}/process`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            payment_method_id: 'pm_card_visa',
            card: {
              number: '4242424242424242',
              exp_month: '12',
              exp_year: '2024',
              cvc: '123'
            }
          })
          .expect(200);

        testPurchases.push(processResponse.body.data);
      }
    });

    it('should list user purchases', async () => {
      const response = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter purchases by status', async () => {
      const response = await request(app)
        .get('/api/purchases?status=succeeded')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      response.body.data.forEach(purchase => {
        expect(purchase.status).toBe('succeeded');
      });
    });

    it('should get purchase details', async () => {
      const purchaseId = testPurchases[0].id;
      
      const response = await request(app)
        .get(`/api/purchases/${purchaseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(purchaseId);
      expect(response.body.data.user_id).toBe(userId);
    });
  });

  describe('Error Handling', () => {
    it('should handle Payment Service unavailability', async () => {
      // Simuler l'indisponibilité du service de paiement
      const response = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticket_type_id: testTicketType.id,
          quantity: 1,
          currency: 'EUR',
          payment_method: 'credit_card'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Payment Service');
    });

    it('should handle invalid payment intent ID', async () => {
      const response = await request(app)
        .post('/api/payments/invalid-intent/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payment_method_id: 'pm_card_visa'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle duplicate payment attempts', async () => {
      // Créer un payment intent
      const intentResponse = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticket_type_id: testTicketType.id,
          quantity: 1,
          currency: 'EUR',
          payment_method: 'credit_card'
        })
        .expect(201);

      const paymentIntent = intentResponse.body.data;

      // Traiter le paiement
      await request(app)
        .post(`/api/payments/${paymentIntent.intent_id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payment_method_id: 'pm_card_visa',
          card: {
            number: '4242424242424242',
            exp_month: '12',
            exp_year: '2024',
            cvc: '123'
          }
        })
        .expect(200);

      // Essayer de traiter à nouveau
      const duplicateResponse = await request(app)
        .post(`/api/payments/${paymentIntent.intent_id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payment_method_id: 'pm_card_visa',
          card: {
            number: '4242424242424242',
            exp_month: '12',
            exp_year: '2024',
            cvc: '123'
          }
        })
        .expect(400);

      expect(duplicateResponse.body.success).toBe(false);
    });
  });

  describe('Security', () => {
    it('should prevent unauthorized payment access', async () => {
      const response = await request(app)
        .get('/api/purchases')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent payment with stolen card', async () => {
      const intentResponse = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticket_type_id: testTicketType.id,
          quantity: 1,
          currency: 'EUR',
          payment_method: 'credit_card'
        })
        .expect(201);

      const paymentIntent = intentResponse.body.data;

      // Utiliser une carte connue pour être volée
      const response = await request(app)
        .post(`/api/payments/${paymentIntent.intent_id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payment_method_id: 'pm_card_stolen',
          card: {
            number: '4000000000009978',
            exp_month: '12',
            exp_year: '2024',
            cvc: '123'
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('failed');
    });

    it('should validate payment amounts', async () => {
      const invalidAmounts = [
        { amount: -100, currency: 'EUR' },
        { amount: 0, currency: 'EUR' },
        { amount: 999999999, currency: 'EUR' }
      ];

      for (const { amount, currency } of invalidAmounts) {
        const response = await request(app)
          .post('/api/payments/intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ticket_type_id: testTicketType.id,
            quantity: 1,
            amount: amount,
            currency: currency,
            payment_method: 'credit_card'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });
  });
});
