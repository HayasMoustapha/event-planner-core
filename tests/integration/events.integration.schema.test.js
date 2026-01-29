/**
 * ========================================
 * TESTS INTÉGRATION EVENTS BASÉS SUR SCHÉMA
 * ========================================
 * Tests API REST avec validation stricte du schéma SQL
 * @version 1.0.0
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Events Integration - Schema Based Tests', () => {
  let authToken;
  let testEventData;
  let createdEventId;

  beforeAll(async () => {
    // Créer un token d'authentification valide
    // En pratique, cela viendrait du service d'authentification
    authToken = 'mock-jwt-token-for-testing';
  });

  beforeEach(async () => {
    // Générer des données de test valides selon le schéma
    testEventData = await global.createValidData('events', {
      organizer_id: 1 // ID d'organisateur fixe pour les tests
    });
  });

  afterEach(async () => {
    // Nettoyer l'événement créé
    if (createdEventId) {
      try {
        await request(app)
          .delete(`/api/events/${createdEventId}`)
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        // Ignorer les erreurs de nettoyage
      }
      createdEventId = null;
    }
  });

  describe('POST /api/events - Schema Validation', () => {
    it('should create event with schema-valid data', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();

      // Valider que la réponse respecte le schéma
      const validation = await global.schemaValidator.validate('events', response.body.data);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Valider les champs spécifiques
      expect(response.body.data.title).toBe(testEventData.title);
      expect(response.body.data.description).toBe(testEventData.description);
      expect(response.body.data.location).toBe(testEventData.location);
      expect(response.body.data.max_attendees).toBe(testEventData.max_attendees);
      expect(response.body.data.organizer_id).toBe(testEventData.organizer_id);

      createdEventId = response.body.data.id;
    });

    it('should reject schema-invalid data', async () => {
      const invalidData = await global.createInvalidData('events', {
        title: { type: 'null' }, // Violation NOT NULL
        event_date: { type: 'invalid_type', value: 'not-a-date' },
        max_attendees: { type: 'negative' },
        organizer_id: { type: 'zero' }
      });

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.details).toBeDefined();
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should validate title constraints', async () => {
      const invalidTitleData = await global.createValidData('events', {
        title: '' // Titre vide
      });

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTitleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('title');
    });

    it('should validate date format', async () => {
      const invalidDateData = await global.createValidData('events', {
        event_date: 'invalid-date-format'
      });

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('event_date');
    });

    it('should validate max_attendees constraints', async () => {
      const invalidCapacityData = await global.createValidData('events', {
        max_attendees: 0 // Zéro non autorisé
      });

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCapacityData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('max_attendees');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/events')
        .send(testEventData)
        .expect(401);
    });

    it('should handle special characters correctly', async () => {
      const specialCharData = await global.createValidData('events', {
        title: 'Événement Spécial 🎉 Test',
        description: 'Description avec caractères spéciaux: àéîöû ñ ç € £ ¥',
        location: 'Paris, Île-de-France'
      });

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(specialCharData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(specialCharData.title);
      expect(response.body.data.description).toBe(specialCharData.description);
      expect(response.body.data.location).toBe(specialCharData.location);

      // Valider le schéma
      const validation = await global.schemaValidator.validate('events', response.body.data);
      expect(validation.valid).toBe(true);

      createdEventId = response.body.data.id;
    });
  });

  describe('GET /api/events - Schema Validation', () => {
    beforeEach(async () => {
      // Créer un événement pour les tests GET
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEventData);
      
      createdEventId = response.body.data.id;
    });

    it('should return events list with valid schema', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Valider que chaque événement respecte le schéma
      for (const event of response.body.data) {
        const validation = await global.schemaValidator.validate('events', event);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it('should support pagination with valid schema', async () => {
      const response = await request(app)
        .get('/api/events?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.total).toBeDefined();
      expect(response.body.pagination.totalPages).toBeDefined();

      // Valider le schéma des événements paginés
      for (const event of response.body.data) {
        const validation = await global.schemaValidator.validate('events', event);
        expect(validation.valid).toBe(true);
      }
    });

    it('should filter by organizer with valid schema', async () => {
      const response = await request(app)
        .get(`/api/events?organizer_id=${testEventData.organizer_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Valider que tous les événements ont le bon organizer_id
      for (const event of response.body.data) {
        expect(event.organizer_id).toBe(testEventData.organizer_id);
        
        const validation = await global.schemaValidator.validate('events', event);
        expect(validation.valid).toBe(true);
      }
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/events')
        .expect(401);
    });
  });

  describe('GET /api/events/:id - Schema Validation', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEventData);
      
      createdEventId = response.body.data.id;
    });

    it('should return specific event with valid schema', async () => {
      const response = await request(app)
        .get(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(createdEventId);

      // Valider le schéma complet
      const validation = await global.schemaValidator.validate('events', response.body.data);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Valider les champs requis
      expect(response.body.data.title).toBeDefined();
      expect(response.body.data.description).toBeDefined();
      expect(response.body.data.event_date).toBeDefined();
      expect(response.body.data.location).toBeDefined();
      expect(response.body.data.max_attendees).toBeDefined();
      expect(response.body.data.organizer_id).toBeDefined();
      expect(response.body.data.status).toBeDefined();
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should validate ID parameter', async () => {
      const response = await request(app)
        .get('/api/events/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('ID');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/events/${createdEventId}`)
        .expect(401);
    });
  });

  describe('PUT /api/events/:id - Schema Validation', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEventData);
      
      createdEventId = response.body.data.id;
    });

    it('should update event with valid schema data', async () => {
      const updateData = await global.createValidData('events', {
        title: 'Updated Event Title',
        description: 'Updated description',
        max_attendees: 500
      });

      const response = await request(app)
        .put(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdEventId);

      // Valider le schéma de la réponse mise à jour
      const validation = await global.schemaValidator.validate('events', response.body.data);
      expect(validation.valid).toBe(true);

      // Valider que les données ont été mises à jour
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.max_attendees).toBe(updateData.max_attendees);
    });

    it('should reject invalid update data', async () => {
      const invalidUpdate = await global.createInvalidData('events', {
        title: { type: 'null' },
        max_attendees: { type: 'negative' }
      });

      const response = await request(app)
        .put(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent event', async () => {
      const updateData = await global.createValidData('events');
      
      const response = await request(app)
        .put('/api/events/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/events/${createdEventId}`)
        .send({ title: 'Test' })
        .expect(401);
    });
  });

  describe('DELETE /api/events/:id - Schema Validation', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEventData);
      
      createdEventId = response.body.data.id;
    });

    it('should delete event and return valid schema', async () => {
      const response = await request(app)
        .delete(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(createdEventId);

      // Valider le schéma de l'enregistrement supprimé
      const validation = await global.schemaValidator.validate('events', response.body.data);
      expect(validation.valid).toBe(true);

      // Vérifier que l'événement n'existe plus
      await request(app)
        .get(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      createdEventId = null; // Éviter le nettoyage en double
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .delete('/api/events/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/events/${createdEventId}`)
        .expect(401);
    });
  });

  describe('POST /api/events/:id/publish - Schema Validation', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEventData);
      
      createdEventId = response.body.data.id;
    });

    it('should publish event with valid schema response', async () => {
      const response = await request(app)
        .post(`/api/events/${createdEventId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(createdEventId);
      expect(response.body.data.status).toBe('published');

      // Valider le schéma
      const validation = await global.schemaValidator.validate('events', response.body.data);
      expect(validation.valid).toBe(true);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .post('/api/events/999999/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/events/${createdEventId}/publish`)
        .expect(401);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle extremely large data', async () => {
      const largeData = await global.createValidData('events', {
        title: 'A'.repeat(1000),
        description: 'B'.repeat(10000)
      });

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeData)
        .expect(400); // Devrait être rejeté pour la taille

      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(5).fill().map(async (_, index) => {
        const eventData = await global.createValidData('events', {
          title: `Concurrent Event ${index}`,
          organizer_id: 1
        });

        return request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send(eventData);
      });

      const responses = await Promise.all(promises);
      
      // Valider que toutes les réponses respectent le schéma
      for (const response of responses) {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        
        const validation = await global.schemaValidator.validate('events', response.body.data);
        expect(validation.valid).toBe(true);
        
        // Nettoyer
        try {
          await request(app)
            .delete(`/api/events/${response.body.data.id}`)
            .set('Authorization', `Bearer ${authToken}`);
        } catch (error) {
          // Ignorer
        }
      }
    });
  });
});
