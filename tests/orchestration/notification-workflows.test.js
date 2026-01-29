/**
 * ========================================
 * TESTS D'ORCHESTRATION NOTIFICATION WORKFLOWS
 * ========================================
 * Tests d'intégration des workflows de notification
 * @version 1.0.0
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Notification Workflows Tests', () => {
  let authToken;
  let userId;
  let testEvent;
  let testGuest;

  beforeAll(async () => {
    // Créer un utilisateur de test
    const userResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'notification-test@example.com',
        password: 'Test123!',
        first_name: 'Notification',
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
        title: 'Notification Test Event',
        description: 'Event for notification testing',
        event_date: '2024-12-31T23:59:59Z',
        location: 'Test Location',
        max_attendees: 100,
        organizer_id: userId
      })
      .expect(201);

    testEvent = eventResponse.body.data;

    // Créer un invité de test
    const guestResponse = await request(app)
      .post('/api/guests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        first_name: 'Test',
        last_name: 'Guest',
        email: 'guest@example.com',
        event_id: testEvent.id
      })
      .expect(201);

    testGuest = guestResponse.body.data;
  });

  afterAll(async () => {
    // Nettoyer les ressources de test
    if (testGuest) {
      await request(app)
        .delete(`/api/guests/${testGuest.id}`)
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

  describe('Event Creation Notifications', () => {
    it('should send notification when event is created', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Event for Notifications',
          description: 'Test event notifications',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Location',
          max_attendees: 50,
          organizer_id: userId
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();

      // Vérifier que la notification a été envoyée
      const notificationResponse = await request(app)
        .get(`/api/notifications/event/${response.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(notificationResponse.body.success).toBe(true);
      expect(Array.isArray(notificationResponse.body.data)).toBe(true);
      
      const notifications = notificationResponse.body.data;
      expect(notifications.length).toBeGreaterThan(0);
      
      // Vérifier le type de notification
      const eventCreatedNotifications = notifications.filter(n => 
        n.type === 'event_created' && n.event_id === response.body.data.id
      );
      expect(eventCreatedNotifications.length).toBeGreaterThan(0);

      // Nettoyer
      await request(app)
        .delete(`/api/events/${response.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should send notification when event is published', async () => {
      // Publier l'événement de test
      const publishResponse = await request(app)
        .post(`/api/events/${testEvent.id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(publishResponse.body.success).toBe(true);

      // Vérifier la notification
      const notificationResponse = await request(app)
        .get(`/api/notifications/event/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      const publishedNotifications = notifications.filter(n => 
        n.type === 'event_published' && n.event_id === testEvent.id
      );
      expect(publishedNotifications.length).toBeGreaterThan(0);
    });

    it('should send notification when event is cancelled', async () => {
      // Créer un événement temporaire pour le test
      const tempEventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Temp Event',
          description: 'Temporary event',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Temp Location',
          max_attendees: 10,
          organizer_id: userId
        })
        .expect(201);

      const tempEvent = tempEventResponse.body.data;

      // Annuler l'événement
      const cancelResponse = await request(app)
        .post(`/api/events/${tempEvent.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);

      // Vérifier la notification
      const notificationResponse = await request(app)
        .get(`/api/notifications/event/${tempEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      const cancelledNotifications = notifications.filter(n => 
        n.type === 'event_cancelled' && n.event_id === tempEvent.id
      );
      expect(cancelledNotifications.length).toBeGreaterThan(0);

      // Nettoyer
      await request(app)
        .delete(`/api/events/${tempEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });

  describe('Guest Management Notifications', () => {
    it('should send notification when guest is added', async () => {
      const response = await request(app)
        .post('/api/guests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'New',
          last_name: 'Guest',
          email: 'newguest@example.com',
          event_id: testEvent.id
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Vérifier la notification
      const notificationResponse = await request(app)
        .get(`/api/notifications/guest/${response.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      const addedNotifications = notifications.filter(n => 
        n.type === 'guest_added' && n.guest_id === response.body.data.id
      );
      expect(addedNotifications.length).toBeGreaterThan(0);

      // Nettoyer
      await request(app)
        .delete(`/api/guests/${response.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should send notification when guest checks in', async () => {
      const checkInResponse = await request(app)
        .post(`/api/guests/${testGuest.id}/checkin`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(checkInResponse.body.success).toBe(true);
      expect(checkInResponse.body.data.checked_in).toBe(true);

      // Vérifier la notification
      const notificationResponse = await request(app)
        .get(`/api/notifications/guest/${testGuest.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      const checkInNotifications = notifications.filter(n => 
        n.type === 'guest_checked_in' && n.guest_id === testGuest.id
      );
      expect(checkInNotifications.length).toBeGreaterThan(0);
    });

    it('should send notification when guest is removed', async () => {
      // Créer un invité temporaire
      const tempGuestResponse = await request(app)
        .post('/api/guests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'Temp',
          last_name: 'Guest',
          email: 'temp@example.com',
          event_id: testEvent.id
        })
        .expect(201);

      const tempGuest = tempGuestResponse.body.data;

      // Supprimer l'invité
      const deleteResponse = await request(app)
        .delete(`/api/guests/${tempGuest.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Vérifier la notification
      const notificationResponse = await request(app)
        .get(`/api/notifications/guest/${tempGuest.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      const removedNotifications = notifications.filter(n => 
        n.type === 'guest_removed' && n.guest_id === tempGuest.id
      );
      expect(removedNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('Ticket Notifications', () => {
    let testTicketType;
    let testTicket;

    beforeEach(async () => {
      // Créer un type de ticket
      const ticketTypeResponse = await request(app)
        .post('/api/ticket-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_id: testEvent.id,
          name: 'Test Ticket Type',
          description: 'Test ticket type for notifications',
          type: 'standard',
          quantity: 10,
          price: 25.00,
          currency: 'EUR'
        })
        .expect(201);

      testTicketType = ticketTypeResponse.body.data;

      // Créer un ticket
      const ticketResponse = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticket_code: `TICKET-${Date.now()}`,
          ticket_type_id: testTicketType.id,
          event_guest_id: testGuest.id,
          price: 25.00,
          currency: 'EUR'
        })
        .expect(201);

      testTicket = ticketResponse.body.data;
    });

    afterEach(async () => {
      // Nettoyer le ticket
      if (testTicket) {
        await request(app)
          .delete(`/api/tickets/${testTicket.id}`)
          .set('Authorization', `Bearer ${authToken}`);
      }

      // Nettoyer le type de ticket
      if (testTicketType) {
        await request(app)
          .delete(`/api/ticket-types/${testTicketType.id}`)
          .set('Authorization', `Bearer ${authToken}`);
      }
    });

    it('should send notification when ticket is created', async () => {
      // Vérifier la notification
      const notificationResponse = await request(app)
        .get(`/api/notifications/ticket/${testTicket.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      const createdNotifications = notifications.filter(n => 
        n.type === 'ticket_created' && n.ticket_id === testTicket.id
      );
      expect(createdNotifications.length).toBeGreaterThan(0);
    });

    it('should send notification when ticket is validated', async () => {
      const validateResponse = await request(app)
        .post(`/api/tickets/${testTicket.id}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(validateResponse.body.success).toBe(true);

      // Vérifier la notification
      const notificationResponse = await request(app)
        .get(`/api/notifications/ticket/${testTicket.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      const validatedNotifications = notifications.filter(n => 
        n.type === 'ticket_validated' && n.ticket_id === testTicket.id
      );
      expect(validatedNotifications.length).toBeGreaterThan(0);
    });

    it('should send notification when ticket is used', async () => {
      const useResponse = await request(app)
        .post(`/api/tickets/${testTicket.id}/use`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(useResponse.body.success).toBe(true);
      expect(useResponse.body.data.status).toBe('used');

      // Vérifier la notification
      const notificationResponse = await request(app)
        .get(`/api/notifications/ticket/${testTicket.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      const usedNotifications = notifications.filter(n => 
        n.type === 'ticket_used' && n.ticket_id === testTicket.id
      );
      expect(usedNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('System Notifications', () => {
    it('should send notification for system maintenance', async () => {
      const response = await request(app)
        .post('/api/system/notifications/maintenance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Scheduled Maintenance',
          message: 'System will be under maintenance from 2AM to 4AM UTC',
          type: 'maintenance',
          scheduled_at: '2024-12-31T02:00:00Z',
          duration_minutes: 120
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Vérifier que la notification système a été créée
      const notificationResponse = await request(app)
        .get('/api/system/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      const maintenanceNotifications = notifications.filter(n => 
        n.type === 'maintenance' && n.title === 'Scheduled Maintenance'
      );
      expect(maintenanceNotifications.length).toBeGreaterThan(0);
    });

    it('should send notification for system alerts', async () => {
      const response = await request(app)
        .post('/api/system/notifications/alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'High CPU Usage Alert',
          message: 'CPU usage exceeded 90% threshold',
          type: 'alert',
          severity: 'high',
          metric: 'cpu_usage',
          value: 92.5,
          threshold: 90
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Vérifier l'alerte système
      const notificationResponse = await request(app)
        .get('/api/system/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      const alertNotifications = notifications.filter(n => 
        n.type === 'alert' && n.severity === 'high'
      );
      expect(alertNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('Notification Preferences', () => {
    it('should update user notification preferences', async () => {
      const response = await request(app)
        .put(`/api/users/${userId}/notifications/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email_notifications: true,
          sms_notifications: false,
          push_notifications: true,
          event_created: true,
          event_published: true,
          event_cancelled: true,
          guest_added: true,
          guest_checked_in: false,
          ticket_created: true,
          ticket_validated: true,
          ticket_used: true,
          system_maintenance: true,
          system_alerts: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email_notifications).toBe(true);
      expect(response.body.data.sms_notifications).toBe(false);
    });

    it('should retrieve user notification preferences', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}/notifications/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.email_notifications).toBe('boolean');
      expect(typeof response.body.data.sms_notifications).toBe('boolean');
    });

    it('should respect notification preferences', async () => {
      // Désactiver les notifications par email
      await request(app)
        .put(`/api/users/${userId}/notifications/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email_notifications: false,
          sms_notifications: true,
          push_notifications: true
        })
        .expect(200);

      // Créer un événement
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Event Preferences',
          description: 'Test event for preferences',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Location',
          max_attendees: 50,
          organizer_id: userId
        })
        .expect(201);

      // Vérifier que les notifications respectent les préférences
      const notificationResponse = await request(app)
        .get(`/api/notifications/event/${eventResponse.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      
      // Les notifications devraient être créées mais avec les bons canaux
      notifications.forEach(notification => {
        expect(notification.channels).toBeDefined();
        expect(notification.channels.email).toBe(false); // Désactivé
        expect(notification.channels.sms).toBe(true);  // Activé
        expect(notification.channels.push).toBe(true); // Activé
      });

      // Nettoyer
      await request(app)
        .delete(`/api/events/${eventResponse.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });

  describe('Notification Delivery', () => {
    it('should deliver email notifications', async () => {
      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipient_id: userId,
          type: 'email',
          subject: 'Test Email Notification',
          message: 'This is a test email notification',
          template: 'test_notification',
          data: {
            user_name: 'Test User',
            action_url: 'https://example.com'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery_status).toBe('sent');
    });

    it('should deliver SMS notifications', async () => {
      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipient_id: userId,
          type: 'sms',
          message: 'This is a test SMS notification',
          template: 'test_sms'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery_status).toBe('sent');
    });

    it('should handle failed notification delivery', async () => {
      // Utiliser un email invalide pour simuler un échec
      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipient_id: userId,
          type: 'email',
          subject: 'Test Failed Notification',
          message: 'This notification should fail',
          template: 'test_notification',
          force_failure: true // Simuler un échec
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('delivery');
    });
  });

  describe('Notification History', () => {
    it('should list user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter notifications by type', async () => {
      const response = await request(app)
        .get('/api/notifications?type=event_created')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      response.body.data.forEach(notification => {
        expect(notification.type).toBe('event_created');
      });
    });

    it('should filter notifications by status', async () => {
      const response = await request(app)
        .get('/api/notifications?status=sent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      response.body.data.forEach(notification => {
        expect(notification.delivery_status).toBe('sent');
      });
    });

    it('should paginate notifications', async () => {
      const response = await request(app)
        .get('/api/notifications?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });
});
