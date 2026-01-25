const request = require('supertest');
const app = require('../src/app');

describe('Admin API - Core Business Logic', () => {
  let adminToken;

  beforeAll(async () => {
    // Token de test admin
    adminToken = 'mock-admin-token';
  });

  describe('GET /api/admin/stats', () => {
    it('devrait récupérer les statistiques système', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalEvents');
      expect(response.body.data).toHaveProperty('totalTickets');
    });
  });

  describe('GET /api/admin/logs', () => {
    it('devrait récupérer les logs système', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/admin/users (via Auth Service)', () => {
    it('devrait récupérer la liste des utilisateurs via Auth Service', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('devrait gérer la pagination des utilisateurs', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/admin/users/:id (via Auth Service)', () => {
    it('devrait récupérer un utilisateur spécifique via Auth Service', async () => {
      const response = await request(app)
        .get('/api/admin/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });
  });

  describe('POST /api/admin/backup', () => {
    it('devrait lancer une sauvegarde système', async () => {
      const backupData = {
        backup_type: 'full',
        include_data: true
      };

      const response = await request(app)
        .post('/api/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(backupData)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('backup_id');
    });
  });

  describe('GET /api/admin/health', () => {
    it('devrait récupérer l\'état de santé du système', async () => {
      const response = await request(app)
        .get('/api/admin/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
    });
  });

  describe('GET /api/admin/events', () => {
    it('devrait récupérer les événements (core business)', async () => {
      const response = await request(app)
        .get('/api/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/admin/logs', () => {
    it('devrait créer un log système', async () => {
      const logData = {
        action: 'test_action',
        entity_type: 'test',
        entity_id: 1,
        details: { test: true }
      };

      const response = await request(app)
        .post('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(logData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });
  });
});
