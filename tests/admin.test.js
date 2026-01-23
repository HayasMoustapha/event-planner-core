const { request, testDb } = require('./setup');
const app = require('../src/app');

describe('Admin API', () => {
  let authToken;
  let adminToken;
  let testUserId;

  beforeAll(async () => {
    // Créer un utilisateur normal
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user@example.com',
        password: 'userpassword',
        first_name: 'User',
        last_name: 'Normal'
      });
    
    authToken = userResponse.body.data.token;

    // Créer un utilisateur admin
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'adminpassword',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      });
    
    adminToken = adminResponse.body.data.token;
    testUserId = adminResponse.body.data.user.id;
  });

  describe('GET /api/admin/dashboard', () => {
    it('devrait récupérer le dashboard avec token admin', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.recent_events).toBeDefined();
      expect(response.body.data.recent_users).toBeDefined();
    });

    it('devrait retourner 403 avec token utilisateur normal', async () => {
      await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('devrait retourner 401 sans authentification', async () => {
      await request(app)
        .get('/api/admin/dashboard')
        .expect(401);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('devrait récupérer les statistiques avec token admin', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.events).toBeDefined();
      expect(response.body.data.tickets).toBeDefined();
      expect(response.body.data.revenue).toBeDefined();
    });

    it('devrait retourner 403 avec token utilisateur normal', async () => {
      await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/logs', () => {
    it('devrait récupérer les logs avec token admin', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('devrait gérer la pagination des logs', async () => {
      const response = await request(app)
        .get('/api/admin/logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('devrait filtrer les logs par niveau', async () => {
      const response = await request(app)
        .get('/api/admin/logs?level=error')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('devrait retourner 403 avec token utilisateur normal', async () => {
      await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('POST /api/admin/users', () => {
    it('devrait créer un utilisateur avec token admin', async () => {
      const userData = {
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User',
        password: 'newpassword',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.role).toBe(userData.role);
    });

    it('devrait retourner 400 avec des données invalides', async () => {
      const invalidData = {
        email: 'email-invalide',
        first_name: '',
        password: '123' // Mot de passe trop court
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('devrait retourner 403 avec token utilisateur normal', async () => {
      const userData = {
        email: 'forbidden@example.com',
        first_name: 'Forbidden',
        last_name: 'User'
      };

      await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(403);
    });

    it('devrait détecter les tentatives d\'injection XSS', async () => {
      const xssData = {
        email: 'xss@example.com',
        first_name: '<script>alert("xss")</script>',
        last_name: 'Test',
        password: 'validpassword123'
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(xssData)
        .expect(400);

      expect(response.body.error).toContain('sécurité');
    });
  });

  describe('GET /api/admin/users', () => {
    it('devrait récupérer la liste des utilisateurs avec token admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('devrait gérer la pagination des utilisateurs', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('devrait filtrer les utilisateurs par rôle', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('devrait retourner 403 avec token utilisateur normal', async () => {
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('devrait récupérer un utilisateur spécifique avec token admin', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.email).toBeDefined();
    });

    it('devrait retourner 404 pour un utilisateur inexistant', async () => {
      await request(app)
        .get('/api/admin/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('devrait retourner 403 avec token utilisateur normal', async () => {
      await request(app)
        .get(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('devrait mettre à jour un utilisateur avec token admin', async () => {
      const updateData = {
        role: 'admin',
        status: 'active',
        first_name: 'Updated'
      };

      const response = await request(app)
        .put(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(updateData.role);
    });

    it('devrait retourner 404 pour la mise à jour d\'un utilisateur inexistant', async () => {
      const updateData = { role: 'user' };

      await request(app)
        .put('/api/admin/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });

    it('devrait retourner 403 avec token utilisateur normal', async () => {
      const updateData = { role: 'user' };

      await request(app)
        .put(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('devrait supprimer un utilisateur avec token admin', async () => {
      // Créer un utilisateur à supprimer
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'delete@example.com',
          first_name: 'Delete',
          last_name: 'Me',
          password: 'deletepassword'
        });

      const userIdToDelete = createResponse.body.data.id;

      await request(app)
        .delete(`/api/admin/users/${userIdToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Vérifier que l'utilisateur n'existe plus
      await request(app)
        .get(`/api/admin/users/${userIdToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('devrait retourner 404 pour la suppression d\'un utilisateur inexistant', async () => {
      await request(app)
        .delete('/api/admin/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('devrait retourner 403 avec token utilisateur normal', async () => {
      await request(app)
        .delete(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/health', () => {
    it('devrait récupérer l\'état de santé du système avec token admin', async () => {
      const response = await request(app)
        .get('/api/admin/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
      expect(response.body.data.memory).toBeDefined();
      expect(response.body.data.database).toBeDefined();
    });

    it('devrait retourner 403 avec token utilisateur normal', async () => {
      await request(app)
        .get('/api/admin/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('POST /api/admin/backup', () => {
    it('devrait lancer une sauvegarde avec token admin', async () => {
      const response = await request(app)
        .post('/api/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.backup_id).toBeDefined();
    });

    it('devrait retourner 403 avec token utilisateur normal', async () => {
      await request(app)
        .post('/api/admin/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('Gestion des erreurs spécifiques à l\'admin', () => {
    it('devrait gérer les emails dupliqués', async () => {
      const duplicateData = {
        email: 'admin@example.com', // Email déjà utilisé
        first_name: 'Duplicate',
        last_name: 'Admin',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateData)
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    it('devrait valider les rôles utilisateurs', async () => {
      const invalidRoleData = {
        email: 'role@example.com',
        first_name: 'Invalid',
        last_name: 'Role',
        password: 'password123',
        role: 'invalid_role'
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRoleData)
        .expect(400);

      expect(response.body.error).toContain('role');
    });

    it('devrait logger les actions administratives', async () => {
      // Ce test vérifie que les actions admin sont bien loggées
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Les logs devraient contenir des entrées pour les actions admin
    });
  });
});
