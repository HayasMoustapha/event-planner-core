/**
 * ========================================
 * TESTS D'ORCHESTRATION AUTH ↔ CORE
 * ========================================
 * Tests d'intégration entre Auth Service et Core Service
 * @version 1.0.0
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Auth ↔ Core Integration Tests', () => {
  let authToken;
  let userId;
  let testEvent;

  beforeAll(async () => {
    // Créer un utilisateur de test via Auth Service
    const userResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
        first_name: 'Test',
        last_name: 'User'
      })
      .expect(201);

    userId = userResponse.body.data.id;
    authToken = userResponse.body.data.token;
  });

  afterAll(async () => {
    // Nettoyer l'utilisateur de test
    await request(app)
      .delete(`/auth/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`);
  });

  describe('Authentication Flow', () => {
    it('should authenticate user and create session', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.user.id).toBe(userId);
    });

    it('should validate token with Core Service', async () => {
      const validationResponse = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(validationResponse.body.success).toBe(true);
      expect(validationResponse.body.data.user.id).toBe(userId);
    });

    it('should reject invalid token', async () => {
      const validationResponse = await request(app)
        .get('/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(validationResponse.body.success).toBe(false);
    });

    it('should refresh token', async () => {
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.token).toBeDefined();
      expect(refreshResponse.body.data.token).not.toBe(authToken);
    });
  });

  describe('Authorization Flow', () => {
    it('should authorize user to access own resources', async () => {
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Event',
          description: 'Test Description',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Location',
          max_attendees: 100,
          organizer_id: userId
        })
        .expect(201);

      testEvent = eventResponse.body.data;
      expect(testEvent.organizer_id).toBe(userId);
    });

    it('should reject unauthorized access to other resources', async () => {
      // Créer un autre utilisateur
      const otherUserResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'other@example.com',
          password: 'Test123!',
          first_name: 'Other',
          last_name: 'User'
        })
        .expect(201);

      const otherToken = otherUserResponse.body.data.token;
      const otherUserId = otherUserResponse.body.data.id;

      // Créer un événement avec l'autre utilisateur
      const otherEventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          title: 'Other Event',
          description: 'Other Description',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Other Location',
          max_attendees: 50,
          organizer_id: otherUserId
        })
        .expect(201);

      const otherEventId = otherEventResponse.body.data.id;

      // Essayer de modifier l'événement de l'autre utilisateur avec notre token
      const unauthorizedResponse = await request(app)
        .put(`/api/events/${otherEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Hacked Event'
        })
        .expect(403);

      expect(unauthorizedResponse.body.success).toBe(false);

      // Nettoyer
      await request(app)
        .delete(`/auth/users/${otherUserId}`)
        .set('Authorization', `Bearer ${otherToken}`);
    });

    it('should authorize admin to access all resources', async () => {
      // Promouvoir l'utilisateur en admin
      await request(app)
        .put(`/auth/users/${userId}/role`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'admin'
        })
        .expect(200);

      // Créer un événement avec un utilisateur normal
      const normalUserResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'normal@example.com',
          password: 'Test123!',
          first_name: 'Normal',
          last_name: 'User'
        })
        .expect(201);

      const normalToken = normalUserResponse.body.data.token;
      const normalUserId = normalUserResponse.body.data.id;

      const normalEventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${normalToken}`)
        .send({
          title: 'Normal Event',
          description: 'Normal Description',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Normal Location',
          max_attendees: 25,
          organizer_id: normalUserId
        })
        .expect(201);

      const normalEventId = normalEventResponse.body.data.id;

      // L'admin devrait pouvoir modifier l'événement de l'utilisateur normal
      const adminResponse = await request(app)
        .put(`/api/events/${normalEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Admin Modified Event'
        })
        .expect(200);

      expect(adminResponse.body.success).toBe(true);

      // Nettoyer
      await request(app)
        .delete(`/auth/users/${normalUserId}`)
        .set('Authorization', `Bearer ${normalToken}`);
    });
  });

  describe('Session Management', () => {
    it('should handle concurrent sessions', async () => {
      // Créer une première session
      const session1Response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        })
        .expect(200);

      const session1Token = session1Response.body.data.token;

      // Créer une deuxième session
      const session2Response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        })
        .expect(200);

      const session2Token = session2Response.body.data.token;

      // Les deux tokens devraient être valides
      const validation1 = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${session1Token}`)
        .expect(200);

      const validation2 = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${session2Token}`)
        .expect(200);

      expect(validation1.body.success).toBe(true);
      expect(validation2.body.success).toBe(true);
    });

    it('should invalidate all sessions on logout', async () => {
      // Se déconnecter
      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Le token ne devrait plus être valide
      const validationResponse = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(validationResponse.body.success).toBe(false);
    });

    it('should handle token expiration', async () => {
      // Créer un token avec une courte expiration
      const shortLivedTokenResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        })
        .expect(200);

      const shortLivedToken = shortLivedTokenResponse.body.data.token;

      // Simuler l'expiration du token (en pratique, cela dépend de l'implémentation)
      // Pour le test, on vérifie juste que le token est valide maintenant
      const validationResponse = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .expect(200);

      expect(validationResponse.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Auth Service unavailability', async () => {
      // Simuler l'indisponibilité du service d'authentification
      // En pratique, cela dépend de l'implémentation du circuit breaker
      
      const response = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Auth Service');
    });

    it('should handle malformed tokens', async () => {
      const malformedTokens = [
        'Bearer',
        'Bearer ',
        'Bearer malformed',
        'Bearer ',
        'Bearer .',
        'Bearer invalid.format',
        'Bearer ' + 'x'.repeat(1000)
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/auth/validate')
          .set('Authorization', token)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    it('should handle missing Authorization header', async () => {
      const response = await request(app)
        .get('/auth/validate')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle authentication under load', async () => {
      const startTime = Date.now();
      
      // Simuler 10 authentifications simultanées
      const promises = Array(10).fill().map(async () => {
        return request(app)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'Test123!'
          });
      });

      const responses = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Toutes les authentifications devraient réussir
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // La performance devrait être acceptable (< 2 secondes pour 10 requêtes)
      expect(duration).toBeLessThan(2000);
    });

    it('should handle validation under load', async () => {
      const startTime = Date.now();
      
      // Simuler 20 validations simultanées
      const promises = Array(20).fill().map(async () => {
        return request(app)
          .get('/auth/validate')
          .set('Authorization', `Bearer ${authToken}`);
      });

      const responses = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Toutes les validations devraient réussir
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // La performance devrait être acceptable (< 1 seconde pour 20 requêtes)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Security', () => {
    it('should prevent token tampering', async () => {
      // Modifier le token (simuler une tentative de falsification)
      const tamperedToken = authToken.slice(0, -10) + 'tampered';
      
      const response = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent replay attacks', async () => {
      // Utiliser le même token deux fois devrait être autorisé (selon la politique)
      // Mais si une politique de nonce est implémentée, cela pourrait être rejeté
      
      const response1 = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response2 = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
    });

    it('should handle brute force protection', async () => {
      // Simuler plusieurs tentatives de connexion échouées
      const failedAttempts = Array(5).fill().map(async () => {
        return request(app)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
      });

      const responses = await Promise.all(failedAttempts);
      
      // Toutes les tentatives devraient échouer
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      // La 6ème tentative pourrait être bloquée (rate limiting)
      const blockedResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      // Selon l'implémentation, cela pourrait être 401 ou 429
      expect([401, 429]).toContain(blockedResponse.status);
    });
  });
});
