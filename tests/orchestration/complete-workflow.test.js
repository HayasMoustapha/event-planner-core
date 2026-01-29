/**
 * ========================================
 * TESTS WORKFLOW COMPLET END-TO-END
 * ========================================
 * Tests E2E complets : création événement → vente tickets → scan validation
 * @version 1.0.0
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Complete Workflow E2E Tests', () => {
  let authToken;
  let userId;
  let organizerToken;
  let guestToken;
  let testEvent;
  let testTicketType;
  let testGuest;
  let testTicket;
  let testPurchase;

  beforeAll(async () => {
    // Créer un organisateur
    const organizerResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'organizer@example.com',
        password: 'Test123!',
        first_name: 'Event',
        last_name: 'Organizer'
      })
      .expect(201);

    userId = organizerResponse.body.data.id;
    organizerToken = organizerResponse.body.data.token;

    // Promouvoir en organisateur
    await request(app)
      .put(`/auth/users/${userId}/role`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        role: 'organizer'
      })
      .expect(200);

    // Créer un invité
    const guestResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'guest@example.com',
        password: 'Test123!',
        first_name: 'Event',
        last_name: 'Guest'
      })
      .expect(201);

    guestToken = guestResponse.body.data.token;
  });

  afterAll(async () => {
    // Nettoyer toutes les ressources
    if (testPurchase) {
      await request(app)
        .delete(`/api/purchases/${testPurchase.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);
    }

    if (testTicket) {
      await request(app)
        .delete(`/api/tickets/${testTicket.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);
    }

    if (testGuest) {
      await request(app)
        .delete(`/api/guests/${testGuest.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);
    }

    if (testTicketType) {
      await request(app)
        .delete(`/api/ticket-types/${testTicketType.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);
    }

    if (testEvent) {
      await request(app)
        .delete(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);
    }

    await request(app)
      .delete(`/auth/users/${userId}`)
      .set('Authorization', `Bearer ${organizerToken}`);
  });

  describe('Complete Event Lifecycle', () => {
    it('should complete full event workflow', async () => {
      // 1. Créer l'événement
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Complete Workflow Event',
          description: 'End-to-end test event',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Venue',
          max_attendees: 100,
          organizer_id: userId
        })
        .expect(201);

      testEvent = eventResponse.body.data;
      expect(testEvent.status).toBe('draft');
      expect(testEvent.title).toBe('Complete Workflow Event');

      // 2. Créer des types de tickets
      const vipTicketTypeResponse = await request(app)
        .post('/api/ticket-types')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          event_id: testEvent.id,
          name: 'VIP Ticket',
          description: 'VIP access with benefits',
          type: 'vip',
          quantity: 20,
          price: 199.99,
          currency: 'EUR'
        })
        .expect(201);

      const standardTicketTypeResponse = await request(app)
        .post('/api/ticket-types')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          event_id: testEvent.id,
          name: 'Standard Ticket',
          description: 'Standard access',
          type: 'standard',
          quantity: 50,
          price: 49.99,
          currency: 'EUR'
        })
        .expect(201);

      const vipTicketType = vipTicketTypeResponse.body.data;
      const standardTicketType = standardTicketTypeResponse.body.data;

      // 3. Ajouter des invités
      const guests = [];
      for (let i = 0; i < 5; i++) {
        const guestResponse = await request(app)
          .post('/api/guests')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({
            first_name: `Guest${i + 1}`,
            last_name: `Test${i + 1}`,
            email: `guest${i + 1}@example.com`,
            event_id: testEvent.id
          })
          .expect(201);

        guests.push(guestResponse.body.data);
      }

      testGuest = guests[0];

      // 4. Publier l'événement
      const publishResponse = await request(app)
        .post(`/api/events/${testEvent.id}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(publishResponse.body.data.status).toBe('published');

      // 5. Acheter des tickets
      const purchases = [];
      
      // Acheter un ticket VIP
      const vipPurchaseResponse = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          ticket_type_id: vipTicketType.id,
          quantity: 1,
          currency: 'EUR',
          payment_method: 'credit_card'
        })
        .expect(201);

      purchases.push(vipPurchaseResponse.body.data);

      // Acheter un ticket standard
      const standardPurchaseResponse = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          ticket_type_id: standardTicketType.id,
          quantity: 1,
          currency: 'EUR',
          payment_method: 'credit_card'
        })
        .expect(201);

      purchases.push(standardPurchaseResponse.body.data);

      // 6. Traiter les paiements
      const processedPurchases = [];
      
      for (const purchase of purchases) {
        const processResponse = await request(app)
          .post(`/api/purchases/${purchase.id}/process`)
          .set('Authorization', `Bearer ${guestToken}`)
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

        processedPurchases.push(processResponse.body.data);
      }

      // 7. Créer les tickets
      const tickets = [];
      
      for (const purchase of processedPurchases) {
        const ticketResponse = await request(app)
          .post('/api/tickets')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({
            ticket_code: `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            ticket_type_id: purchase.ticket_type_id,
            event_guest_id: testGuest.id,
            price: purchase.amount,
            currency: purchase.currency
          })
          .expect(201);

        tickets.push(ticketResponse.body.data);
      }

      testTicket = tickets[0];

      // 8. Valider les tickets
      const validatedTickets = [];
      
      for (const ticket of tickets) {
        const validateResponse = await request(app)
          .post(`/api/tickets/${ticket.id}/validate`)
          .set('Authorization', `Bearer ${organizerToken}`)
          .expect(200);

        validatedTickets.push(validateResponse.body.data);
      }

      // 9. Check-in l'invité
      const checkInResponse = await request(app)
        .post(`/api/guests/${testGuest.id}/checkin`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(checkInResponse.body.data.checked_in).toBe(true);

      // 10. Scanner le ticket
      const scanResponse = await request(app)
        .post('/api/tickets/scan')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          ticket_code: testTicket.ticket_code,
          event_id: testEvent.id
        })
        .expect(200);

      expect(scanResponse.body.data.valid).toBe(true);
      expect(scanResponse.body.data.used).toBe(true);

      // 11. Vérifier les statistiques
      const eventStatsResponse = await request(app)
        .get(`/api/events/${testEvent.id}/stats`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      const stats = eventStatsResponse.body.data;
      expect(stats.total_guests).toBe(5);
      expect(stats.checked_in_guests).toBe(1);
      expect(stats.total_tickets).toBe(2);
      expect(stats.used_tickets).toBe(1);

      // 12. Nettoyer
      for (const purchase of processedPurchases) {
        await request(app)
          .delete(`/api/purchases/${purchase.id}`)
          .set('Authorization', `Bearer ${guestToken}`);
      }

      for (const ticket of tickets) {
        await request(app)
          .delete(`/api/tickets/${ticket.id}`)
          .set('Authorization', `Bearer ${organizerToken}`);
      }

      for (const guest of guests) {
        await request(app)
          .delete(`/api/guests/${guest.id}`)
          .set('Authorization', `Bearer ${organizerToken}`);
      }

      await request(app)
        .delete(`/api/ticket-types/${vipTicketType.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      await request(app)
        .delete(`/api/ticket-types/${standardTicketType.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      // L'événement sera nettoyé dans le afterAll
    });
  });

  describe('Marketplace Integration', () => {
    let designerUser;
    let designerToken;
    let designer;
    let template;
    let templatePurchase;

    beforeAll(async () => {
      // Créer un designer
      const designerResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'designer@example.com',
          password: 'Test123!',
          first_name: 'Template',
          last_name: 'Designer'
        })
        .expect(201);

      designerUser = designerResponse.body.data;
      designerToken = designerResponse.body.data.token;

      // Promouvoir en designer
      await request(app)
        .put(`/auth/users/${designerUser.id}/role`)
        .set('Authorization', `Bearer ${designerToken}`)
        .send({
          role: 'designer'
        })
        .expect(200);

      // Créer un profil designer
      const designerProfileResponse = await request(app)
        .post('/api/marketplace/designers')
        .set('Authorization', `Bearer ${designerToken}`)
        .send({
          user_id: designerUser.id,
          brand_name: 'Creative Designer',
          bio: 'Professional event template designer',
          specialties: ['wedding', 'corporate', 'birthday'],
          email: 'designer@example.com',
          portfolio_url: 'https://portfolio.example.com'
        })
        .expect(201);

      designer = designerProfileResponse.body.data;
    });

    afterAll(async () => {
      // Nettoyer les ressources marketplace
      if (templatePurchase) {
        await request(app)
          .delete(`/api/marketplace/purchases/${templatePurchase.id}`)
          .set('Authorization', `Bearer ${guestToken}`);
      }

      if (template) {
        await request(app)
          .delete(`/api/marketplace/templates/${template.id}`)
          .set('Authorization', `Bearer ${designerToken}`);
      }

      if (designer) {
        await request(app)
          .delete(`/api/marketplace/designers/${designer.id}`)
          .set('Authorization', `Bearer ${designerToken}`);
      }

      await request(app)
        .delete(`/auth/users/${designerUser.id}`)
        .set('Authorization', `Bearer ${designerToken}`);
    });

    it('should complete marketplace workflow', async () => {
      // 1. Créer un template
      const templateResponse = await request(app)
        .post('/api/marketplace/templates')
        .set('Authorization', `Bearer ${designerToken}`)
        .send({
          designer_id: designer.id,
          name: 'Elegant Wedding Template',
          description: 'Beautiful wedding invitation template',
          category: 'wedding',
          price: 29.99,
          currency: 'EUR',
          preview_url: 'https://preview.example.com/template1.jpg',
          download_url: 'https://download.example.com/template1.zip'
        })
        .expect(201);

      template = templateResponse.body.data;
      expect(template.designer_id).toBe(designer.id);
      expect(template.category).toBe('wedding');

      // 2. Acheter le template
      const purchaseResponse = await request(app)
        .post('/api/marketplace/purchases')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          user_id: userId,
          template_id: template.id,
          payment_method: 'credit_card'
        })
        .expect(201);

      templatePurchase = purchaseResponse.body.data;
      expect(templatePurchase.user_id).toBe(userId);
      expect(templatePurchase.template_id).toBe(template.id);

      // 3. Traiter le paiement
      const processResponse = await request(app)
        .post(`/api/marketplace/purchases/${templatePurchase.id}/process`)
        .set('Authorization', `Bearer ${guestToken}`)
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

      expect(processResponse.body.data.status).toBe('succeeded');

      // 4. Vérifier les statistiques du designer
      const designerStatsResponse = await request(app)
        .get(`/api/marketplace/designers/${designer.id}/stats`)
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      const designerStats = designerStatsResponse.body.data;
      expect(designerStats.total_templates).toBe(1);
      expect(designerStats.total_sales).toBe(1);
      expect(designerStats.total_revenue).toBe(29.99);

      // 5. Vérifier les statistiques du template
      const templateStatsResponse = await request(app)
        .get(`/api/marketplace/templates/${template.id}/stats`)
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      const templateStats = templateStatsResponse.body.data;
      expect(templateStats.total_purchases).toBe(1);
      expect(templateStats.total_revenue).toBe(29.99);
    });
  });

  describe('System Integration', () => {
    it('should handle system-wide operations', async () => {
      // 1. Créer un backup système
      const backupResponse = await request(app)
        .post('/api/system/backups')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          type: 'full',
          include_data: true,
          created_by: userId
        })
        .expect(201);

      const backup = backupResponse.body.data;
      expect(backup.type).toBe('full');
      expect(backup.status).toBe('started');

      // 2. Vérifier les logs système
      const logsResponse = await request(app)
        .get('/api/system/logs')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(logsResponse.body.success).toBe(true);
      expect(Array.isArray(logsResponse.body.data)).toBe(true);

      // 3. Vérifier les métriques système
      const metricsResponse = await request(app)
        .get('/api/system/metrics')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data).toBeDefined();
      expect(typeof metricsResponse.body.data.uptime).toBe('number');
      expect(typeof metricsResponse.body.data.memory_usage).toBe('number');
      expect(typeof metricsResponse.body.data.cpu_usage).toBe('number');

      // 4. Vérifier le health check
      const healthResponse = await request(app)
        .get('/api/health')
        .expect(200);

      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.data.status).toBe('healthy');
      expect(healthResponse.body.data.services).toBeDefined();
    });
  });

  describe('Error Handling in Workflow', () => {
    it('should handle partial workflow failures gracefully', async () => {
      // 1. Créer un événement
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Error Test Event',
          description: 'Event for error testing',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Location',
          max_attendees: 10,
          organizer_id: userId
        })
        .expect(201);

      const testEvent = eventResponse.body.data;

      // 2. Essayer d'acheter un ticket avec quantité insuffisante
      const ticketTypeResponse = await request(app)
        .post('/api/ticket-types')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          event_id: testEvent.id,
          name: 'Limited Ticket',
          description: 'Limited quantity ticket',
          type: 'standard',
          quantity: 2,
          price: 25.00,
          currency: 'EUR'
        })
        .expect(201);

      const ticketType = ticketTypeResponse.body.data;

      // Essayer d'acheter plus de tickets que disponible
      const purchaseResponse = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          ticket_type_id: ticketType.id,
          quantity: 5, // Plus que les 2 disponibles
          currency: 'EUR',
          payment_method: 'credit_card'
        })
        .expect(400);

      expect(purchaseResponse.body.success).toBe(false);
      expect(purchaseResponse.body.error).toContain('insufficient');

      // 3. Nettoyer
      await request(app)
        .delete(`/api/ticket-types/${ticketType.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      await request(app)
        .delete(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);
    });

    it('should handle concurrent operations', async () => {
      // Créer un événement
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Concurrent Test Event',
          description: 'Event for concurrent testing',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Location',
          max_attendees: 50,
          organizer_id: userId
        })
        .expect(201);

      const testEvent = eventResponse.body.data;

      // Opérations concurrentes
      const promises = [
        // Créer des types de tickets
        request(app)
          .post('/api/ticket-types')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({
            event_id: testEvent.id,
            name: 'Concurrent Ticket 1',
            description: 'First concurrent ticket',
            type: 'standard',
            quantity: 10,
            price: 25.00,
            currency: 'EUR'
          }),

        request(app)
          .post('/api/ticket-types')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({
            event_id: testEvent.id,
            name: 'Concurrent Ticket 2',
            description: 'Second concurrent ticket',
            type: 'vip',
            quantity: 5,
            price: 75.00,
            currency: 'EUR'
          }),

        // Ajouter des invités
        request(app)
          .post('/api/guests')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({
            first_name: 'Concurrent',
            last_name: 'Guest 1',
            email: 'concurrent1@example.com',
            event_id: testEvent.id
          }),

        request(app)
          .post('/api/guests')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({
            first_name: 'Concurrent',
            last_name: 'Guest 2',
            email: 'concurrent2@example.com',
            event_id: testEvent.id
          })
      ];

      const responses = await Promise.all(promises);

      // Toutes les opérations devraient réussir
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Nettoyer
      const ticketTypes = responses.slice(0, 2).map(r => r.body.data);
      const guests = responses.slice(2, 4).map(r => r.body.data);

      for (const ticketType of ticketTypes) {
        await request(app)
          .delete(`/api/ticket-types/${ticketType.id}`)
          .set('Authorization', `Bearer ${organizerToken}`);
      }

      for (const guest of guests) {
        await request(app)
          .delete(`/api/guests/${guest.id}`)
          .set('Authorization', `Bearer ${organizerToken}`);
      }

      await request(app)
        .delete(`/api/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${organizerToken}`);
    });
  });
});
