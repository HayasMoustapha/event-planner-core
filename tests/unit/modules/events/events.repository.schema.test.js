/**
 * ========================================
 * TESTS REPOSITORY EVENTS BASÉS SUR SCHÉMA
 * ========================================
 * Tests CRUD automatiques avec validation stricte du schéma SQL
 * @version 1.0.0
 */

const EventsRepository = require('../../../src/modules/events/events.repository');

describe('Events Repository - Schema Based Tests', () => {
  let eventsRepository;
  let testEventData;

  beforeAll(async () => {
    eventsRepository = new EventsRepository();
  });

  beforeEach(async () => {
    // Générer des données de test valides selon le schéma
    testEventData = await global.createValidData('events', {
      // S'assurer que les IDs sont valides
      organizer_id: global.generateTestId()
    });
  });

  describe('Schema Validation', () => {
    it('should have valid schema structure', async () => {
      const schema = global.schemaFactory.schemas.get('events');
      
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('events');
      
      // Valider les colonnes essentielles
      const requiredColumns = ['id', 'title', 'description', 'event_date', 'location', 'max_attendees', 'organizer_id', 'status'];
      const schemaColumns = Object.keys(schema.columns);
      
      requiredColumns.forEach(column => {
        expect(schemaColumns).toContain(column);
        expect(schema.columns[column]).toBeDefined();
        expect(schema.columns[column].type).toBeDefined();
      });
    });

    it('should generate valid test data', async () => {
      const validation = await global.schemaValidator.validate('events', testEventData);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Valider les champs spécifiques
      expect(testEventData.title).toBeDefined();
      expect(typeof testEventData.title).toBe('string');
      expect(testEventData.title.length).toBeGreaterThan(0);
      expect(testEventData.title.length).toBeLessThanOrEqual(255);
      
      expect(testEventData.event_date).toBeDefined();
      expect(new Date(testEventData.event_date)).toBeInstanceOf(Date);
      
      expect(testEventData.max_attendees).toBeDefined();
      expect(Number.isInteger(testEventData.max_attendees)).toBe(true);
      expect(testEventData.max_attendees).toBeGreaterThan(0);
      
      expect(testEventData.organizer_id).toBeDefined();
      expect(Number.isInteger(testEventData.organizer_id)).toBe(true);
      expect(testEventData.organizer_id).toBeGreaterThan(0);
    });
  });

  describe('CRUD Operations', () => {
    let createdEvent;

    afterEach(async () => {
      // Nettoyer l'événement créé
      if (createdEvent && createdEvent.id) {
        try {
          await eventsRepository.delete(createdEvent.id);
        } catch (error) {
          // Ignorer les erreurs de nettoyage
        }
        createdEvent = null;
      }
    });

    describe('CREATE', () => {
      it('should create event with valid schema data', async () => {
        createdEvent = await eventsRepository.create(testEventData);
        
        expect(createdEvent).toBeDefined();
        expect(createdEvent.id).toBeDefined();
        expect(Number.isInteger(createdEvent.id)).toBe(true);
        expect(createdEvent.id).toBeGreaterThan(0);
        
        // Valider que l'enregistrement créé respecte le schéma
        const validation = await global.schemaValidator.validate('events', createdEvent);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        
        // Valider que les données sont préservées
        expect(createdEvent.title).toBe(testEventData.title);
        expect(createdEvent.description).toBe(testEventData.description);
        expect(createdEvent.location).toBe(testEventData.location);
        expect(createdEvent.max_attendees).toBe(testEventData.max_attendees);
        expect(createdEvent.organizer_id).toBe(testEventData.organizer_id);
      });

      it('should reject invalid schema data', async () => {
        const invalidData = await global.createInvalidData('events', {
          title: { type: 'null' }, // Violation NOT NULL
          event_date: { type: 'invalid_type', value: 'not-a-date' },
          max_attendees: { type: 'negative' },
          organizer_id: { type: 'zero' }
        });

        await expect(eventsRepository.create(invalidData)).rejects.toThrow();
      });

      it('should handle title length constraints', async () => {
        const longTitleData = await global.createValidData('events', {
          title: 'x'.repeat(300) // Dépasse la limite habituelle de 255
        });

        // Le repository devrait soit tronquer, soit rejeter
        try {
          const result = await eventsRepository.create(longTitleData);
          expect(result.title.length).toBeLessThanOrEqual(255);
        } catch (error) {
          expect(error.message).toContain('title');
        }
      });

      it('should handle date validation', async () => {
        const pastDateData = await global.createValidData('events', {
          event_date: '2020-01-01T00:00:00Z' // Date passée
        });

        // Selon la logique métier, pourrait être accepté ou rejeté
        try {
          const result = await eventsRepository.create(pastDateData);
          expect(result).toBeDefined();
        } catch (error) {
          expect(error.message).toContain('date');
        }
      });
    });

    describe('READ', () => {
      beforeEach(async () => {
        createdEvent = await eventsRepository.create(testEventData);
      });

      it('should find event by ID with valid schema', async () => {
        const foundEvent = await eventsRepository.findById(createdEvent.id);
        
        expect(foundEvent).toBeDefined();
        expect(foundEvent.id).toBe(createdEvent.id);
        
        // Valider le schéma de l'enregistrement trouvé
        const validation = await global.schemaValidator.validate('events', foundEvent);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should return null for non-existent ID', async () => {
        const foundEvent = await eventsRepository.findById(999999);
        expect(foundEvent).toBeNull();
      });

      it('should find events by organizer with valid schema', async () => {
        const events = await eventsRepository.findByOrganizer(testEventData.organizer_id);
        
        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBeGreaterThan(0);
        
        // Valider que chaque événement respecte le schéma
        for (const event of events) {
          const validation = await global.schemaValidator.validate('events', event);
          expect(validation.valid).toBe(true);
          expect(event.organizer_id).toBe(testEventData.organizer_id);
        }
      });

      it('should handle pagination correctly', async () => {
        const options = { page: 1, limit: 5 };
        const result = await eventsRepository.findByOrganizer(testEventData.organizer_id, options);
        
        expect(result.events).toBeDefined();
        expect(Array.isArray(result.events)).toBe(true);
        expect(result.pagination).toBeDefined();
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(5);
        
        // Valider le schéma des résultats
        for (const event of result.events) {
          const validation = await global.schemaValidator.validate('events', event);
          expect(validation.valid).toBe(true);
        }
      });
    });

    describe('UPDATE', () => {
      beforeEach(async () => {
        createdEvent = await eventsRepository.create(testEventData);
      });

      it('should update event with valid schema data', async () => {
        const updateData = await global.createValidData('events', {
          title: 'Updated Event Title',
          description: 'Updated description',
          max_attendees: 500
        });

        const updatedEvent = await eventsRepository.update(createdEvent.id, updateData);
        
        expect(updatedEvent).toBeDefined();
        expect(updatedEvent.id).toBe(createdEvent.id);
        
        // Valider le schéma de l'enregistrement mis à jour
        const validation = await global.schemaValidator.validate('events', updatedEvent);
        expect(validation.valid).toBe(true);
        
        // Valider que les données ont été mises à jour
        expect(updatedEvent.title).toBe(updateData.title);
        expect(updatedEvent.description).toBe(updateData.description);
        expect(updatedEvent.max_attendees).toBe(updateData.max_attendees);
      });

      it('should reject invalid update data', async () => {
        const invalidUpdate = await global.createInvalidData('events', {
          title: { type: 'null' },
          max_attendees: { type: 'negative' }
        });

        await expect(eventsRepository.update(createdEvent.id, invalidUpdate)).rejects.toThrow();
      });

      it('should return null for non-existent ID', async () => {
        const updateData = await global.createValidData('events');
        const result = await eventsRepository.update(999999, updateData);
        expect(result).toBeNull();
      });
    });

    describe('DELETE', () => {
      beforeEach(async () => {
        createdEvent = await eventsRepository.create(testEventData);
      });

      it('should delete event and return deleted record', async () => {
        const deletedEvent = await eventsRepository.delete(createdEvent.id);
        
        expect(deletedEvent).toBeDefined();
        expect(deletedEvent.id).toBe(createdEvent.id);
        
        // Valider le schéma de l'enregistrement supprimé
        const validation = await global.schemaValidator.validate('events', deletedEvent);
        expect(validation.valid).toBe(true);
        
        // Vérifier que l'événement n'existe plus
        const foundEvent = await eventsRepository.findById(createdEvent.id);
        expect(foundEvent).toBeNull();
        
        createdEvent = null; // Éviter le nettoyage en double
      });

      it('should return null for non-existent ID', async () => {
        const result = await eventsRepository.delete(999999);
        expect(result).toBeNull();
      });
    });
  });

  describe('Schema-Specific Operations', () => {
    let createdEvent;

    beforeEach(async () => {
      createdEvent = await eventsRepository.create(testEventData);
    });

    afterEach(async () => {
      if (createdEvent && createdEvent.id) {
        try {
          await eventsRepository.delete(createdEvent.id);
        } catch (error) {
          // Ignorer
        }
        createdEvent = null;
      }
    });

    it('should publish event with valid schema', async () => {
      const publishedEvent = await eventsRepository.publish(createdEvent.id);
      
      expect(publishedEvent).toBeDefined();
      expect(publishedEvent.id).toBe(createdEvent.id);
      expect(publishedEvent.status).toBe('published');
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('events', publishedEvent);
      expect(validation.valid).toBe(true);
    });

    it('should archive event with valid schema', async () => {
      const archivedEvent = await eventsRepository.archive(createdEvent.id);
      
      expect(archivedEvent).toBeDefined();
      expect(archivedEvent.id).toBe(createdEvent.id);
      expect(archivedEvent.status).toBe('archived');
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('events', archivedEvent);
      expect(validation.valid).toBe(true);
    });

    it('should get event statistics with valid schema', async () => {
      const stats = await eventsRepository.getEventStats(createdEvent.id);
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      
      // Valider que les statistiques ont des types cohérents
      if (stats.total_guests !== undefined) {
        expect(Number.isInteger(stats.total_guests)).toBe(true);
        expect(stats.total_guests).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.checked_in_guests !== undefined) {
        expect(Number.isInteger(stats.checked_in_guests)).toBe(true);
        expect(stats.checked_in_guests).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent operations', async () => {
      // Créer plusieurs événements simultanément
      const promises = Array(5).fill().map(async (_, index) => {
        const eventData = await global.createValidData('events', {
          title: `Concurrent Event ${index}`,
          organizer_id: global.generateTestId()
        });
        return eventsRepository.create(eventData);
      });

      const results = await Promise.all(promises);
      
      // Valider que tous les événements créés respectent le schéma
      for (const event of results) {
        expect(event).toBeDefined();
        expect(event.id).toBeDefined();
        
        const validation = await global.schemaValidator.validate('events', event);
        expect(validation.valid).toBe(true);
        
        // Nettoyer
        try {
          await eventsRepository.delete(event.id);
        } catch (error) {
          // Ignorer
        }
      }
    });

    it('should handle large data sets', async () => {
      // Créer un événement avec beaucoup de données
      const largeEventData = await global.createValidData('events', {
        title: 'A'.repeat(200),
        description: 'B'.repeat(1000),
        location: 'C'.repeat(500)
      });

      const event = await eventsRepository.create(largeEventData);
      
      expect(event).toBeDefined();
      
      const validation = await global.schemaValidator.validate('events', event);
      expect(validation.valid).toBe(true);
      
      // Nettoyer
      await eventsRepository.delete(event.id);
    });

    it('should handle special characters in data', async () => {
      const specialCharData = await global.createValidData('events', {
        title: 'Événement Spécial 🎉 avec émojis',
        description: '测试中文 и русский العربية',
        location: 'Paris, France - Île-de-France'
      });

      const event = await eventsRepository.create(specialCharData);
      
      expect(event).toBeDefined();
      expect(event.title).toBe(specialCharData.title);
      expect(event.description).toBe(specialCharData.description);
      expect(event.location).toBe(specialCharData.location);
      
      const validation = await global.schemaValidator.validate('events', event);
      expect(validation.valid).toBe(true);
      
      // Nettoyer
      await eventsRepository.delete(event.id);
    });
  });
});
