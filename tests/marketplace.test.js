const { request, testDb } = require('./setup');
const app = require('../src/app');

describe('Marketplace API', () => {
  let authToken;
  let testDesignerId;
  let testTemplateId;

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

  describe('POST /api/marketplace/designers', () => {
    it('devrait créer un designer avec des données valides', async () => {
      const designerData = {
        name: 'Designer Test',
        bio: 'Biographie du designer',
        specialties: ['web design', 'print', 'branding'],
        email: 'designer@example.com',
        portfolio_url: 'https://portfolio.example.com'
      };

      const response = await request(app)
        .post('/api/marketplace/designers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(designerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(designerData.name);
      expect(response.body.data.email).toBe(designerData.email);
      expect(response.body.data.id).toBeDefined();
      
      testDesignerId = response.body.data.id;
    });

    it('devrait retourner 400 avec des données invalides', async () => {
      const invalidData = {
        name: '', // Nom vide
        email: 'email-invalide'
      };

      const response = await request(app)
        .post('/api/marketplace/designers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('devrait retourner 401 sans authentification', async () => {
      const designerData = {
        name: 'Test Designer',
        bio: 'Test bio'
      };

      await request(app)
        .post('/api/marketplace/designers')
        .send(designerData)
        .expect(401);
    });

    it('devrait détecter les tentatives d\'injection XSS', async () => {
      const xssData = {
        name: '<script>alert("xss")</script>',
        bio: 'Biographie avec <img src=x onerror=alert(1)> XSS',
        email: 'xss@example.com'
      };

      const response = await request(app)
        .post('/api/marketplace/designers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(xssData)
        .expect(400);

      expect(response.body.error).toContain('sécurité');
    });

    it('devrait valider le format de l\'email', async () => {
      const invalidEmailData = {
        name: 'Test Designer',
        email: 'email-invalide'
      };

      const response = await request(app)
        .post('/api/marketplace/designers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.error).toContain('email');
    });
  });

  describe('GET /api/marketplace/designers', () => {
    it('devrait récupérer la liste des designers', async () => {
      const response = await request(app)
        .get('/api/marketplace/designers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('devrait filtrer les designers par spécialité', async () => {
      const response = await request(app)
        .get('/api/marketplace/designers?specialty=web design')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('devrait gérer la pagination', async () => {
      const response = await request(app)
        .get('/api/marketplace/designers?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/marketplace/designers/:id', () => {
    it('devrait récupérer un designer spécifique', async () => {
      const response = await request(app)
        .get(`/api/marketplace/designers/${testDesignerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testDesignerId);
      expect(response.body.data.name).toBeDefined();
    });

    it('devrait retourner 404 pour un designer inexistant', async () => {
      await request(app)
        .get('/api/marketplace/designers/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('devrait valider les paramètres d\'ID', async () => {
      await request(app)
        .get('/api/marketplace/designers/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /api/marketplace/templates', () => {
    it('devrait créer un template avec des données valides', async () => {
      const templateData = {
        name: 'Template Test',
        description: 'Description du template',
        price: 50,
        category: 'invitation',
        designer_id: testDesignerId,
        preview_url: 'https://preview.example.com/template.png',
        download_url: 'https://download.example.com/template.zip'
      };

      const response = await request(app)
        .post('/api/marketplace/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(templateData.name);
      expect(response.body.data.price).toBe(templateData.price);
      expect(response.body.data.id).toBeDefined();
      
      testTemplateId = response.body.data.id;
    });

    it('devrait retourner 400 avec des données invalides', async () => {
      const invalidData = {
        name: '', // Nom vide
        price: -10 // Prix négatif
      };

      const response = await request(app)
        .post('/api/marketplace/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('devrait valider les prix positifs', async () => {
      const invalidPriceData = {
        name: 'Template Test',
        price: -50,
        category: 'invitation'
      };

      const response = await request(app)
        .post('/api/marketplace/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPriceData)
        .expect(400);

      expect(response.body.error).toContain('price');
    });
  });

  describe('GET /api/marketplace/templates', () => {
    it('devrait récupérer la liste des templates', async () => {
      const response = await request(app)
        .get('/api/marketplace/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('devrait filtrer les templates par catégorie', async () => {
      const response = await request(app)
        .get('/api/marketplace/templates?category=invitation')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('devrait filtrer les templates par designer', async () => {
      const response = await request(app)
        .get(`/api/marketplace/templates?designer_id=${testDesignerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('devrait gérer la pagination', async () => {
      const response = await request(app)
        .get('/api/marketplace/templates?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/marketplace/templates/:id', () => {
    it('devrait récupérer un template spécifique', async () => {
      const response = await request(app)
        .get(`/api/marketplace/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testTemplateId);
      expect(response.body.data.name).toBeDefined();
    });

    it('devrait retourner 404 pour un template inexistant', async () => {
      await request(app)
        .get('/api/marketplace/templates/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/marketplace/purchases', () => {
    it('devrait créer un achat avec des données valides', async () => {
      const purchaseData = {
        template_id: testTemplateId,
        payment_method: 'credit_card',
        payment_details: {
          card_number: '****-****-****-1234',
          expiry_date: '12/25'
        }
      };

      const response = await request(app)
        .post('/api/marketplace/purchases')
        .set('Authorization', `Bearer ${authToken}`)
        .send(purchaseData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template_id).toBe(testTemplateId);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.id).toBeDefined();
    });

    it('devrait retourner 400 avec des données invalides', async () => {
      const invalidData = {
        template_id: null, // ID invalide
        payment_method: ''
      };

      const response = await request(app)
        .post('/api/marketplace/purchases')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('devrait retourner 404 pour un template inexistant', async () => {
      const purchaseData = {
        template_id: 999999,
        payment_method: 'credit_card'
      };

      await request(app)
        .post('/api/marketplace/purchases')
        .set('Authorization', `Bearer ${authToken}`)
        .send(purchaseData)
        .expect(404);
    });
  });

  describe('GET /api/marketplace/purchases', () => {
    it('devrait récupérer la liste des achats', async () => {
      const response = await request(app)
        .get('/api/marketplace/purchases')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('devrait filtrer les achats par utilisateur', async () => {
      const response = await request(app)
        .get('/api/marketplace/purchases?user_id=current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/marketplace/stats', () => {
    it('devrait récupérer les statistiques du marketplace', async () => {
      const response = await request(app)
        .get('/api/marketplace/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_designers).toBeDefined();
      expect(response.body.data.total_templates).toBeDefined();
      expect(response.body.data.total_revenue).toBeDefined();
      expect(response.body.data.total_purchases).toBeDefined();
    });
  });

  describe('Gestion des erreurs spécifiques au marketplace', () => {
    it('devrait gérer les emails dupliqués pour les designers', async () => {
      const duplicateEmailData = {
        name: 'Autre Designer',
        email: 'designer@example.com', // Email déjà utilisé
        bio: 'Autre bio'
      };

      const response = await request(app)
        .post('/api/marketplace/designers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateEmailData)
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    it('devrait valider les URLs des templates', async () => {
      const invalidUrlData = {
        name: 'Template Test',
        price: 50,
        category: 'invitation',
        preview_url: 'url-invalide',
        download_url: 'aussi-invalide'
      };

      const response = await request(app)
        .post('/api/marketplace/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUrlData)
        .expect(400);

      expect(response.body.error).toContain('url');
    });

    it('devrait valider les catégories de templates', async () => {
      const invalidCategoryData = {
        name: 'Template Test',
        price: 50,
        category: 'catégorie-invalide'
      };

      const response = await request(app)
        .post('/api/marketplace/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCategoryData)
        .expect(400);

      expect(response.body.error).toContain('category');
    });
  });
});
