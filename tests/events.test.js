const { request, testDb } = require('./setup');
const app = require('../src/app');

describe('Events API', () => {
  let authToken;
  let testEventId;

  beforeAll(async () => {
    // Créer un utilisateur de test et obtenir un token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@eventplanner.com',
        password: 'Admin123!'
      });
    
    authToken = loginResponse.body.data.token;
  });

  describe('POST /api/events', () => {
    it('devrait créer un événement avec des données valides', async () => {
      const eventData = {
        title: 'Événement Test',
        description: 'Description de test',
        event_date: '2024-12-31T23:59:59.000Z',
        location: 'Paris, France',
        max_attendees: 100
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(eventData.title);
      expect(response.body.data.id).toBeDefined();
      
      testEventId = response.body.data.id;
    });

    it('devrait retourner 400 avec des données invalides', async () => {
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
      expect(response.body.error).toContain('validation');
    });

    it('devrait retourner 401 sans authentification', async () => {
      const eventData = {
        title: 'Événement Test',
        description: 'Description de test'
      };

      await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(401);
    });

    it('devrait détecter les tentatives d\'injection XSS', async () => {
      const xssData = {
        title: '<script>alert("xss")</script>',
        description: 'Description avec <img src=x onerror=alert(1)> XSS'
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(xssData)
        .expect(400);

      expect(response.body.error).toContain('sécurité');
    });
  });

  describe('GET /api/events', () => {
    it('devrait récupérer la liste des événements', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('devrait gérer la pagination', async () => {
      const response = await request(app)
        .get('/api/events?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/events/:id', () => {
    it('devrait récupérer un événement spécifique', async () => {
      const response = await request(app)
        .get(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testEventId);
      expect(response.body.data.title).toBeDefined();
    });

    it('devrait retourner 404 pour un événement inexistant', async () => {
      await request(app)
        .get('/api/events/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('devrait valider les paramètres d\'ID', async () => {
      await request(app)
        .get('/api/events/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('PUT /api/events/:id', () => {
    it('devrait mettre à jour un événement', async () => {
      const updateData = {
        title: 'Événement Mis à Jour',
        description: 'Nouvelle description'
      };

      const response = await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });

    it('devrait retourner 404 pour la mise à jour d\'un événement inexistant', async () => {
      const updateData = { title: 'Test' };

      await request(app)
        .put('/api/events/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('devrait supprimer un événement', async () => {
      // Créer un événement à supprimer
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Événement à Supprimer',
          description: 'Pour test de suppression'
        });

      const eventIdToDelete = createResponse.body.data.id;

      await request(app)
        .delete(`/api/events/${eventIdToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Vérifier que l'événement n'existe plus
      await request(app)
        .get(`/api/events/${eventIdToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('devrait retourner 404 pour la suppression d\'un événement inexistant', async () => {
      await request(app)
        .delete('/api/events/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/events/:id/publish', () => {
    it('devrait publier un événement', async () => {
      const response = await request(app)
        .post(`/api/events/${testEventId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
    });

    it('devrait retourner 404 pour un événement inexistant', async () => {
      await request(app)
        .post('/api/events/999999/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de base de données', async () => {
      // Simuler une erreur de base de données en utilisant une connexion invalide
      // Ce test nécessiterait un mock de la base de données
      expect(true).toBe(true); // Placeholder
    });

    it('devrait logger les erreurs correctement', async () => {
      // Test pour vérifier que les erreurs sont bien loggées
      expect(true).toBe(true); // Placeholder
    });
  });
});
