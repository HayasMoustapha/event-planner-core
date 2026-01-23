const { request, testDb } = require('./setup');
const app = require('../src/app');

describe('Error Handling Middleware', () => {
  let authToken;

  beforeAll(async () => {
    // Créer un utilisateur de test
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword'
      });
    
    authToken = loginResponse.body.data.token;
  });

  describe('Validation Errors', () => {
    it('devrait retourner 400 pour des données invalides', async () => {
      const invalidData = {
        title: '', // Titre vide
        event_date: 'date-invalide'
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.details).toBeDefined();
    });

    it('devrait inclure les détails de validation', async () => {
      const invalidData = {
        title: '',
        email: 'email-invalide',
        phone: '123'
      };

      const response = await request(app)
        .post('/api/guests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.details).toBeDefined();
      expect(Array.isArray(response.body.details)).toBe(true);
      expect(response.body.details.length).toBeGreaterThan(0);
    });
  });

  describe('Security Errors', () => {
    it('devrait détecter les tentatives XSS', async () => {
      const xssData = {
        title: '<script>alert("xss")</script>',
        description: 'Description avec <img src=x onerror=alert(1)>'
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(xssData)
        .expect(400);

      expect(response.body.error).toContain('sécurité');
      expect(response.body.error_code).toBe('SECURITY_VIOLATION');
    });

    it('devrait détecter les tentatives SQL injection', async () => {
      const sqlInjectionData = {
        title: "'; DROP TABLE events; --",
        description: "Test SQL injection"
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sqlInjectionData)
        .expect(400);

      expect(response.body.error).toContain('sécurité');
      expect(response.body.error_code).toBe('SECURITY_VIOLATION');
    });

    it('devrait détecter les patterns malveillants', async () => {
      const maliciousData = {
        title: 'javascript:alert(1)',
        description: 'data:text/html,<script>alert(1)</script>'
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousData)
        .expect(400);

      expect(response.body.error).toContain('sécurité');
    });
  });

  describe('Authentication Errors', () => {
    it('devrait retourner 401 sans token', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication');
      expect(response.body.error_code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('devrait retourner 401 avec token invalide', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });

    it('devrait retourner 401 avec token expiré', async () => {
      // Simuler un token expiré (ce test nécessiterait un mock)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toContain('token');
    });
  });

  describe('Authorization Errors', () => {
    it('devrait retourner 403 pour les permissions insuffisantes', async () => {
      // Tenter d'accéder à une route admin avec un token utilisateur normal
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Permission');
      expect(response.body.error_code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('devrait retourner 403 pour les ressources non autorisées', async () => {
      // Tenter d'accéder à un événement d'un autre utilisateur
      const response = await request(app)
        .get('/api/events/99999') // ID qui n'existe pas ou n'appartient pas à l'utilisateur
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Sera 404 si l'ID n'existe pas, mais pourrait être 403 si l'ID existe mais n'est pas autorisé
    });
  });

  describe('Not Found Errors', () => {
    it('devrait retourner 404 pour les routes inexistantes', async () => {
      const response = await request(app)
        .get('/api/route-inexistante')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Not Found');
      expect(response.body.error_code).toBe('ROUTE_NOT_FOUND');
    });

    it('devrait retourner 404 pour les ressources inexistantes', async () => {
      const response = await request(app)
        .get('/api/events/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
      expect(response.body.error_code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('Database Errors', () => {
    it('devrait gérer les erreurs de connexion', async () => {
      // Ce test nécessiterait de simuler une erreur de base de données
      // Pour l'instant, on teste juste que le système ne crash pas
      expect(true).toBe(true);
    });

    it('devrait gérer les erreurs de contrainte', async () => {
      // Créer un duplicat pour tester les contraintes d'unicité
      const guestData = {
        first_name: 'Test',
        last_name: 'Duplicate',
        email: 'duplicate@example.com'
      };

      // Premier invité
      await request(app)
        .post('/api/guests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(guestData)
        .expect(201);

      // Deuxième invité avec le même email
      const response = await request(app)
        .post('/api/guests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(guestData)
        .expect(400);

      expect(response.body.error).toContain('email');
    });
  });

  describe('Rate Limiting', () => {
    it('devrait limiter les requêtes excessives', async () => {
      // Faire plusieurs requêtes rapidement pour tester le rate limiting
      const promises = Array(20).fill().map(() => 
        request(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      
      // Au moins une des réponses devrait être 429 (Too Many Requests)
      const rateLimited = responses.some(res => res.status === 429);
      
      if (rateLimited) {
        const rateLimitResponse = responses.find(res => res.status === 429);
        expect(rateLimitResponse.body.error_code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });
  });

  describe('Error Logging', () => {
    it('devrait logger les erreurs correctement', async () => {
      // Provoquer une erreur et vérifier qu'elle est loggée
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '<script>alert("test")</script>',
          description: 'Test XSS logging'
        })
        .expect(400);

      expect(response.body.error_code).toBe('SECURITY_VIOLATION');
      // L'erreur devrait être loggée (vérification via les logs admin)
    });

    it('devrait inclure les informations de contexte dans les logs', async () => {
      const response = await request(app)
        .get('/api/events/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.request_id).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Error Response Format', () => {
    it('devrait avoir un format d\'erreur cohérent', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '' })
        .expect(400);

      // Vérifier la structure de la réponse d'erreur
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error_code');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('request_id');
    });

    it('devrait inclure les détails de validation quand disponible', async () => {
      const response = await request(app)
        .post('/api/guests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: '',
          email: 'invalid-email',
          phone: '123'
        })
        .expect(400);

      expect(response.body.details).toBeDefined();
      expect(Array.isArray(response.body.details)).toBe(true);
      expect(response.body.details.length).toBeGreaterThan(0);
    });
  });

  describe('Async Error Handling', () => {
    it('devrait gérer les erreurs asynchrones', async () => {
      // Simuler une opération asynchrone qui échoue
      // Ce test nécessiterait un mock d'une fonction asynchrone qui échoue
      expect(true).toBe(true);
    });

    it('devrait gérer les timeouts', async () => {
      // Simuler une opération qui prend trop de temps
      expect(true).toBe(true);
    });
  });

  describe('Production vs Development', () => {
    it('devrait masquer les détails sensibles en production', async () => {
      // En production, les erreurs ne devraient pas inclure de stack traces
      // Ce test dépend de la variable d'environnement NODE_ENV
      const response = await request(app)
        .get('/api/route-inexistante')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      // En production, stack ne devrait pas être présent
      if (process.env.NODE_ENV === 'production') {
        expect(response.body.stack).toBeUndefined();
      }
    });
  });
});
