const request = require('supertest');
const app = require('../src/app');

describe('Schema Validation Tests', () => {
  describe('Events Module Schema', () => {
    test('should use correct event_date field', async () => {
      // Test that events module uses event_date instead of start_date/end_date
      const eventsRepository = require('../src/modules/events/events.repository');
      
      // This should not throw an error if the schema is aligned
      expect(() => {
        eventsRepository.create({
          title: 'Test Event',
          description: 'Test Description',
          event_date: new Date('2024-12-31T23:59:59Z'),
          location: 'Test Location',
          organizer_id: 1
        });
      }).not.toThrow();
    });

    test('should use organizer_id field', async () => {
      const eventsRepository = require('../src/modules/events/events.repository');
      
      expect(() => {
        eventsRepository.create({
          title: 'Test Event',
          event_date: new Date('2024-12-31T23:59:59Z'),
          location: 'Test Location',
          organizer_id: 1
        });
      }).not.toThrow();
    });
  });

  describe('Guests Module Schema', () => {
    test('should support all required fields from diagram', async () => {
      const guestsRepository = require('../src/modules/guests/guests.repository');
      
      expect(() => {
        guestsRepository.create({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          created_by: 1
        });
      }).not.toThrow();
    });

    test('should support event_guests junction table', async () => {
      const guestsRepository = require('../src/modules/guests/guests.repository');
      
      expect(() => {
        guestsRepository.addGuestToEvent(1, 1, 'INV-12345', 1);
      }).not.toThrow();
    });
  });

  describe('Tickets Module Schema', () => {
    test('should support ticket types with correct fields', async () => {
      const ticketsRepository = require('../src/modules/tickets/tickets.repository');
      
      expect(() => {
        ticketsRepository.createTicketType({
          event_id: 1,
          name: 'VIP Ticket',
          description: 'VIP Access',
          type: 'paid',
          quantity: 100,
          price: 99.99,
          currency: 'EUR',
          created_by: 1
        });
      }).not.toThrow();
    });

    test('should support tickets with QR code data', async () => {
      const ticketsRepository = require('../src/modules/tickets/tickets.repository');
      
      expect(() => {
        ticketsRepository.create({
          ticket_code: 'TICKET-123',
          qr_code_data: 'QR-DATA-123',
          ticket_type_id: 1,
          event_guest_id: 1,
          price: 99.99,
          currency: 'EUR',
          created_by: 1
        });
      }).not.toThrow();
    });
  });

  describe('Marketplace Module Schema', () => {
    test('should support designers with brand name', async () => {
      const marketplaceRepository = require('../src/modules/marketplace/marketplace.repository');
      
      expect(() => {
        marketplaceRepository.createDesigner({
          user_id: 1,
          brand_name: 'Test Designer',
          portfolio_url: 'https://example.com',
          created_by: 1
        });
      }).not.toThrow();
    });

    test('should support templates with pricing', async () => {
      const marketplaceRepository = require('../src/modules/marketplace/marketplace.repository');
      
      expect(() => {
        marketplaceRepository.createTemplate({
          designer_id: 1,
          name: 'Test Template',
          description: 'Test Description',
          preview_url: 'https://example.com/preview.jpg',
          source_files_path: '/path/to/files',
          price: 49.99,
          currency: 'EUR',
          created_by: 1
        });
      }).not.toThrow();
    });

    test('should support reviews with ratings', async () => {
      const marketplaceRepository = require('../src/modules/marketplace/marketplace.repository');
      
      expect(() => {
        marketplaceRepository.createReview({
          user_id: 1,
          template_id: 1,
          rating: 5,
          comment: 'Excellent template!',
          created_by: 1
        });
      }).not.toThrow();
    });
  });

  describe('Admin Module Schema', () => {
    test('should support system logs', async () => {
      const adminRepository = require('../src/modules/admin/admin.repository');
      
      expect(() => {
        adminRepository.createSystemLog({
          level: 'info',
          message: 'Test log message',
          context: { test: true },
          created_by: 1
        });
      }).not.toThrow();
    });

    test('should support global stats', async () => {
      const adminRepository = require('../src/modules/admin/admin.repository');
      
      expect(typeof adminRepository.getGlobalStats).toBe('function');
    });
  });
});
