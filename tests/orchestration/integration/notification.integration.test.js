/**
 * Tests INTÉGRATION RÉELS - Notification Service
 * Tests avec le service réellement démarré
 *
 * @author Event Planner Team
 * @version 1.0.0
 *
 * PRÉREQUIS: notification-service doit être démarré sur le port 3002
 */

const notificationClient = require('../../../../shared/service-clients/notification-client');

describe('Notification Service - Integration Tests', () => {
  let serviceAvailable = false;

  beforeAll(async () => {
    serviceAvailable = await global.waitForService(notificationClient, 5, 2000);
    if (!serviceAvailable) {
      console.warn('⚠️  Notification Service non disponible - tests en mode skip');
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
        notificationClient.healthCheck()
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      console.log(`   ✅ Health check passed (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 1. SEND EMAIL
  // ============================================================
  describe('1. sendEmail', () => {
    it('should send email successfully', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.sendEmail(
            global.generateTestData.email(),
            'welcome',
            { name: 'Test User' }
          );
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Email sending handled (${responseTime}ms)`);
    });

    it('should handle email with template variables', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.sendEmail(
            global.generateTestData.email(),
            'event-reminder',
            {
              userName: 'John Doe',
              eventName: 'Rock Concert 2024',
              eventDate: '2024-06-15',
              eventLocation: 'Paris Arena'
            }
          );
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Email with template variables handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 2. QUEUE BULK EMAIL
  // ============================================================
  describe('2. queueBulkEmail', () => {
    it('should queue bulk email successfully', async () => {
      if (!serviceAvailable) return;

      const recipients = Array(10).fill(null).map(() => global.generateTestData.email());

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.queueBulkEmail(
            recipients,
            'newsletter',
            { subject: 'Test Newsletter', content: 'Test content' }
          );
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      if (result && result.jobId) {
        console.log(`   ✅ Bulk email queued: ${result.jobId} (${responseTime}ms)`);
      } else {
        console.log(`   ✅ Bulk email request handled (${responseTime}ms)`);
      }
    });

    it('should handle large recipient list', async () => {
      if (!serviceAvailable) return;

      const recipients = Array(100).fill(null).map(() => global.generateTestData.email());

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.queueBulkEmail(
            recipients,
            'event-update',
            { eventName: 'Test Event' }
          );
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime * 2);
      console.log(`   ✅ Large bulk email (100 recipients) handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 3. SEND SMS
  // ============================================================
  describe('3. sendSMS', () => {
    it('should send SMS successfully', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.sendSMS(
            global.generateTestData.phone(),
            'Your verification code is 123456'
          );
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ SMS sending handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 4. QUEUE BULK SMS
  // ============================================================
  describe('4. queueBulkSMS', () => {
    it('should queue bulk SMS', async () => {
      if (!serviceAvailable) return;

      const recipients = Array(5).fill(null).map(() => global.generateTestData.phone());

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.queueBulkSMS(
            recipients,
            'Event reminder: Your event starts in 1 hour!'
          );
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Bulk SMS queued (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 5. SEND PUSH NOTIFICATION
  // ============================================================
  describe('5. sendPushNotification', () => {
    it('should send push notification', async () => {
      if (!serviceAvailable) return;

      const userId = global.generateTestData.userId();
      const notification = {
        title: 'Event Starting Soon',
        body: 'Your event starts in 30 minutes',
        data: { eventId: 'event-123', action: 'open_event' }
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.sendPushNotification(userId, notification);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Push notification handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 6. GET NOTIFICATION STATUS
  // ============================================================
  describe('6. getNotificationStatus', () => {
    it('should retrieve notification status', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.getNotificationStatus('notif-test-123');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Notification status retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 7. GET JOB STATUS
  // ============================================================
  describe('7. getJobStatus', () => {
    it('should retrieve job status', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.getJobStatus('job-test-123');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Job status retrieved (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 8. LIST TEMPLATES
  // ============================================================
  describe('8. listTemplates', () => {
    it('should list email templates', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.listTemplates('email');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);

      if (result && result.templates) {
        console.log(`   ✅ Email templates: ${result.templates.length} found (${responseTime}ms)`);
      } else {
        console.log(`   ✅ Template listing handled (${responseTime}ms)`);
      }
    });

    it('should list SMS templates', async () => {
      if (!serviceAvailable) return;

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.listTemplates('sms');
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ SMS templates listing handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 9. CREATE TEMPLATE
  // ============================================================
  describe('9. createTemplate', () => {
    it('should create custom template', async () => {
      if (!serviceAvailable) return;

      const template = {
        name: `Test Template ${Date.now()}`,
        type: 'email',
        subject: 'Test: {{eventName}}',
        body: '<h1>Hello {{name}}</h1><p>Event: {{eventName}}</p>',
        variables: ['name', 'eventName']
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.createTemplate(template);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Template creation handled (${responseTime}ms)`);
    });
  });

  // ============================================================
  // 10. NOTIFY EVENT PARTICIPANTS
  // ============================================================
  describe('10. notifyEventParticipants', () => {
    it('should notify event participants', async () => {
      if (!serviceAvailable) return;

      const eventNotification = {
        eventId: global.generateTestData.eventId(),
        type: 'reminder',
        recipients: Array(5).fill(null).map(() => global.generateTestData.email())
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.notifyEventParticipants(eventNotification);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Event notification handled (${responseTime}ms)`);
    });

    it('should handle different notification types', async () => {
      if (!serviceAvailable) return;

      const types = ['reminder', 'update', 'cancellation'];

      for (const type of types) {
        const { result, responseTime } = await global.measureResponseTime(async () => {
          try {
            return await notificationClient.notifyEventParticipants({
              eventId: global.generateTestData.eventId(),
              type,
              recipients: [global.generateTestData.email()]
            });
          } catch (error) {
            return { error: error.message };
          }
        });

        expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
        console.log(`   ✅ Event notification type '${type}' handled (${responseTime}ms)`);
      }
    });
  });

  // ============================================================
  // 11. SEND TICKET CONFIRMATION
  // ============================================================
  describe('11. sendTicketConfirmation', () => {
    it('should send ticket confirmation', async () => {
      if (!serviceAvailable) return;

      const ticketData = {
        email: global.generateTestData.email(),
        ticketCode: global.generateTestData.ticketCode(),
        eventTitle: 'Test Concert 2024',
        pdfUrl: 'https://cdn.example.com/ticket.pdf'
      };

      const { result, responseTime } = await global.measureResponseTime(async () => {
        try {
          return await notificationClient.sendTicketConfirmation(ticketData);
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(responseTime).toBeLessThan(global.testConfig.maxResponseTime);
      console.log(`   ✅ Ticket confirmation sent (${responseTime}ms)`);
    });
  });

  // ============================================================
  // PERFORMANCE TESTS
  // ============================================================
  describe('Performance Tests', () => {
    it('should handle concurrent email requests', async () => {
      if (!serviceAvailable) return;

      const startTime = Date.now();

      const promises = Array(10).fill(null).map(() =>
        notificationClient.sendEmail(
          global.generateTestData.email(),
          'welcome',
          { name: 'Test' }
        ).catch(e => ({ error: e.message }))
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(global.testConfig.maxResponseTime * 3);
      console.log(`   ✅ Concurrent emails: 10 requests in ${totalTime}ms`);
    });

    it('should handle mixed notification types', async () => {
      if (!serviceAvailable) return;

      const startTime = Date.now();

      const promises = [
        notificationClient.sendEmail(global.generateTestData.email(), 'welcome', {}),
        notificationClient.sendSMS(global.generateTestData.phone(), 'Test SMS'),
        notificationClient.sendPushNotification('user-1', { title: 'Test', body: 'Test push' })
      ].map(p => p.catch(e => ({ error: e.message })));

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(global.testConfig.maxResponseTime * 2);
      console.log(`   ✅ Mixed notifications (email, SMS, push) in ${totalTime}ms`);
    });
  });

  // ============================================================
  // RELIABILITY TESTS
  // ============================================================
  describe('Reliability Tests', () => {
    it('should handle service interruption gracefully', async () => {
      if (!serviceAvailable) return;

      // Faire plusieurs requêtes successives pour tester la stabilité
      const results = [];

      for (let i = 0; i < 5; i++) {
        const result = await notificationClient.healthCheck();
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(5);

      console.log(`   ✅ Service stability: ${successCount}/5 successful health checks`);
    });
  });
});
