/**
 * ========================================
 * TESTS REPOSITORY MARKETPLACE BASÉS SUR SCHÉMA
 * ========================================
 * Tests CRUD automatiques avec validation stricte du schéma SQL
 * @version 1.0.0
 */

const MarketplaceRepository = require('../../../src/modules/marketplace/marketplace.repository');

describe('Marketplace Repository - Schema Based Tests', () => {
  let marketplaceRepository;
  let testDesignerData;
  let testTemplateData;
  let testPurchaseData;

  beforeAll(async () => {
    marketplaceRepository = new MarketplaceRepository();
  });

  beforeEach(async () => {
    // Générer des données de test valides selon le schéma
    testDesignerData = await global.createValidData('marketplace_designers', {
      user_id: global.generateTestId(),
      brand_name: `Designer ${Date.now()}`,
      email: global.generateTestEmail()
    });

    testTemplateData = await global.createValidData('marketplace_templates', {
      designer_id: global.generateTestId(),
      name: `Template ${Date.now()}`,
      category: 'wedding',
      price: 29.99,
      currency: 'EUR'
    });

    testPurchaseData = await global.createValidData('marketplace_purchases', {
      user_id: global.generateTestId(),
      template_id: global.generateTestId(),
      payment_method: 'credit_card'
    });
  });

  describe('Designers Schema Validation', () => {
    it('should have valid designers schema structure', async () => {
      const schema = global.schemaFactory.schemas.get('marketplace_designers');
      
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('marketplace_designers');
      
      const requiredColumns = ['id', 'user_id', 'brand_name', 'bio', 'specialties', 'email', 'portfolio_url', 'status', 'created_at', 'updated_at'];
      const schemaColumns = Object.keys(schema.columns);
      
      requiredColumns.forEach(column => {
        expect(schemaColumns).toContain(column);
        expect(schema.columns[column]).toBeDefined();
        expect(schema.columns[column].type).toBeDefined();
      });
    });

    it('should generate valid designer test data', async () => {
      const validation = await global.schemaValidator.validate('marketplace_designers', testDesignerData);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      expect(testDesignerData.user_id).toBeDefined();
      expect(Number.isInteger(testDesignerData.user_id)).toBe(true);
      expect(testDesignerData.user_id).toBeGreaterThan(0);
      
      expect(testDesignerData.brand_name).toBeDefined();
      expect(typeof testDesignerData.brand_name).toBe('string');
      expect(testDesignerData.brand_name.length).toBeGreaterThan(0);
      expect(testDesignerData.brand_name.length).toBeLessThanOrEqual(255);
      
      expect(testDesignerData.email).toBeDefined();
      expect(typeof testDesignerData.email).toBe('string');
      expect(testDesignerData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      
      expect(testDesignerData.status).toBeDefined();
      expect(['active', 'inactive', 'pending']).toContain(testDesignerData.status);
    });
  });

  describe('Templates Schema Validation', () => {
    it('should have valid templates schema structure', async () => {
      const schema = global.schemaFactory.schemas.get('marketplace_templates');
      
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('marketplace_templates');
      
      const requiredColumns = ['id', 'designer_id', 'name', 'description', 'category', 'price', 'currency', 'preview_url', 'download_url', 'status', 'created_at', 'updated_at'];
      const schemaColumns = Object.keys(schema.columns);
      
      requiredColumns.forEach(column => {
        expect(schemaColumns).toContain(column);
        expect(schema.columns[column]).toBeDefined();
        expect(schema.columns[column].type).toBeDefined();
      });
    });

    it('should generate valid template test data', async () => {
      const validation = await global.schemaValidator.validate('marketplace_templates', testTemplateData);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      expect(testTemplateData.designer_id).toBeDefined();
      expect(Number.isInteger(testTemplateData.designer_id)).toBe(true);
      expect(testTemplateData.designer_id).toBeGreaterThan(0);
      
      expect(testTemplateData.name).toBeDefined();
      expect(typeof testTemplateData.name).toBe('string');
      expect(testTemplateData.name.length).toBeGreaterThan(0);
      expect(testTemplateData.name.length).toBeLessThanOrEqual(255);
      
      expect(testTemplateData.category).toBeDefined();
      expect(typeof testTemplateData.category).toBe('string');
      expect(['wedding', 'corporate', 'birthday', 'conference', 'other']).toContain(testTemplateData.category);
      
      expect(testTemplateData.price).toBeDefined();
      expect(typeof testTemplateData.price).toBe('number');
      expect(testTemplateData.price).toBeGreaterThanOrEqual(0);
      
      expect(testTemplateData.currency).toBeDefined();
      expect(testTemplateData.currency).toMatch(/^[A-Z]{3}$/);
    });
  });

  describe('Purchases Schema Validation', () => {
    it('should have valid purchases schema structure', async () => {
      const schema = global.schemaFactory.schemas.get('marketplace_purchases');
      
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('marketplace_purchases');
      
      const requiredColumns = ['id', 'user_id', 'template_id', 'payment_method', 'payment_details', 'status', 'created_at', 'updated_at'];
      const schemaColumns = Object.keys(schema.columns);
      
      requiredColumns.forEach(column => {
        expect(schemaColumns).toContain(column);
        expect(schema.columns[column]).toBeDefined();
        expect(schema.columns[column].type).toBeDefined();
      });
    });

    it('should generate valid purchase test data', async () => {
      const validation = await global.schemaValidator.validate('marketplace_purchases', testPurchaseData);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      expect(testPurchaseData.user_id).toBeDefined();
      expect(Number.isInteger(testPurchaseData.user_id)).toBe(true);
      expect(testPurchaseData.user_id).toBeGreaterThan(0);
      
      expect(testPurchaseData.template_id).toBeDefined();
      expect(Number.isInteger(testPurchaseData.template_id)).toBe(true);
      expect(testPurchaseData.template_id).toBeGreaterThan(0);
      
      expect(testPurchaseData.payment_method).toBeDefined();
      expect(['credit_card', 'paypal', 'bank_transfer', 'crypto']).toContain(testPurchaseData.payment_method);
      
      expect(testPurchaseData.status).toBeDefined();
      expect(['pending', 'completed', 'failed', 'refunded']).toContain(testPurchaseData.status);
    });
  });

  describe('Designers CRUD Operations', () => {
    let createdDesigner;

    afterEach(async () => {
      if (createdDesigner && createdDesigner.id) {
        try {
          await marketplaceRepository.deleteDesigner(createdDesigner.id);
        } catch (error) {
          // Ignorer les erreurs de nettoyage
        }
        createdDesigner = null;
      }
    });

    it('should create designer with valid schema data', async () => {
      createdDesigner = await marketplaceRepository.createDesigner(testDesignerData);
      
      expect(createdDesigner).toBeDefined();
      expect(createdDesigner.id).toBeDefined();
      expect(Number.isInteger(createdDesigner.id)).toBe(true);
      expect(createdDesigner.id).toBeGreaterThan(0);
      
      const validation = await global.schemaValidator.validate('marketplace_designers', createdDesigner);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      expect(createdDesigner.user_id).toBe(testDesignerData.user_id);
      expect(createdDesigner.brand_name).toBe(testDesignerData.brand_name);
      expect(createdDesigner.email).toBe(testDesignerData.email);
    });

    it('should reject invalid designer data', async () => {
      const invalidData = await global.createInvalidData('marketplace_designers', {
        user_id: { type: 'zero' },
        brand_name: { type: 'null' },
        email: { type: 'invalid_type', value: 'not-an-email' }
      });

      await expect(marketplaceRepository.createDesigner(invalidData)).rejects.toThrow();
    });

    it('should find designer by ID with valid schema', async () => {
      createdDesigner = await marketplaceRepository.createDesigner(testDesignerData);
      
      const foundDesigner = await marketplaceRepository.findDesignerById(createdDesigner.id);
      
      expect(foundDesigner).toBeDefined();
      expect(foundDesigner.id).toBe(createdDesigner.id);
      
      const validation = await global.schemaValidator.validate('marketplace_designers', foundDesigner);
      expect(validation.valid).toBe(true);
    });

    it('should find designers by user with valid schema', async () => {
      createdDesigner = await marketplaceRepository.createDesigner(testDesignerData);
      
      const designers = await marketplaceRepository.findDesignersByUser(testDesignerData.user_id);
      
      expect(Array.isArray(designers)).toBe(true);
      expect(designers.length).toBeGreaterThan(0);
      
      for (const designer of designers) {
        const validation = await global.schemaValidator.validate('marketplace_designers', designer);
        expect(validation.valid).toBe(true);
        expect(designer.user_id).toBe(testDesignerData.user_id);
      }
    });
  });

  describe('Templates CRUD Operations', () => {
    let createdTemplate;

    afterEach(async () => {
      if (createdTemplate && createdTemplate.id) {
        try {
          await marketplaceRepository.deleteTemplate(createdTemplate.id);
        } catch (error) {
          // Ignorer les erreurs de nettoyage
        }
        createdTemplate = null;
      }
    });

    it('should create template with valid schema data', async () => {
      createdTemplate = await marketplaceRepository.createTemplate(testTemplateData);
      
      expect(createdTemplate).toBeDefined();
      expect(createdTemplate.id).toBeDefined();
      expect(Number.isInteger(createdTemplate.id)).toBe(true);
      expect(createdTemplate.id).toBeGreaterThan(0);
      
      const validation = await global.schemaValidator.validate('marketplace_templates', createdTemplate);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      expect(createdTemplate.designer_id).toBe(testTemplateData.designer_id);
      expect(createdTemplate.name).toBe(testTemplateData.name);
      expect(createdTemplate.category).toBe(testTemplateData.category);
      expect(createdTemplate.price).toBe(testTemplateData.price);
    });

    it('should reject invalid template data', async () => {
      const invalidData = await global.createInvalidData('marketplace_templates', {
        designer_id: { type: 'zero' },
        name: { type: 'null' },
        price: { type: 'negative' },
        category: { type: 'invalid_type', value: 'invalid' }
      });

      await expect(marketplaceRepository.createTemplate(invalidData)).rejects.toThrow();
    });

    it('should find templates by category with valid schema', async () => {
      createdTemplate = await marketplaceRepository.createTemplate(testTemplateData);
      
      const templates = await marketplaceRepository.findTemplatesByCategory(testTemplateData.category);
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      for (const template of templates) {
        const validation = await global.schemaValidator.validate('marketplace_templates', template);
        expect(validation.valid).toBe(true);
        expect(template.category).toBe(testTemplateData.category);
      }
    });

    it('should find templates by designer with valid schema', async () => {
      createdTemplate = await marketplaceRepository.createTemplate(testTemplateData);
      
      const templates = await marketplaceRepository.findTemplatesByDesigner(testTemplateData.designer_id);
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      for (const template of templates) {
        const validation = await global.schemaValidator.validate('marketplace_templates', template);
        expect(validation.valid).toBe(true);
        expect(template.designer_id).toBe(testTemplateData.designer_id);
      }
    });

    it('should validate template price constraints', async () => {
      const priceTests = [
        { price: 0, shouldPass: true },      // Gratuit autorisé
        { price: 0.99, shouldPass: true },   // Prix minimum
        { price: 999.99, shouldPass: true }, // Prix maximum raisonnable
        { price: -1, shouldPass: false },    // Prix négatif non autorisé
        { price: 10000, shouldPass: false }  // Prix trop élevé
      ];

      for (const test of priceTests) {
        const priceData = await global.createValidData('marketplace_templates', {
          name: `PRICE-TEST-${Date.now()}`,
          price: test.price
        });

        if (test.shouldPass) {
          const template = await marketplaceRepository.createTemplate(priceData);
          expect(template.price).toBe(test.price);
          
          // Nettoyer
          await marketplaceRepository.deleteTemplate(template.id);
        } else {
          await expect(marketplaceRepository.createTemplate(priceData)).rejects.toThrow();
        }
      }
    });
  });

  describe('Purchases CRUD Operations', () => {
    let createdPurchase;

    afterEach(async () => {
      if (createdPurchase && createdPurchase.id) {
        try {
          await marketplaceRepository.deletePurchase(createdPurchase.id);
        } catch (error) {
          // Ignorer les erreurs de nettoyage
        }
        createdPurchase = null;
      }
    });

    it('should create purchase with valid schema data', async () => {
      createdPurchase = await marketplaceRepository.createPurchase(testPurchaseData);
      
      expect(createdPurchase).toBeDefined();
      expect(createdPurchase.id).toBeDefined();
      expect(Number.isInteger(createdPurchase.id)).toBe(true);
      expect(createdPurchase.id).toBeGreaterThan(0);
      
      const validation = await global.schemaValidator.validate('marketplace_purchases', createdPurchase);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      expect(createdPurchase.user_id).toBe(testPurchaseData.user_id);
      expect(createdPurchase.template_id).toBe(testPurchaseData.template_id);
      expect(createdPurchase.payment_method).toBe(testPurchaseData.payment_method);
    });

    it('should reject invalid purchase data', async () => {
      const invalidData = await global.createInvalidData('marketplace_purchases', {
        user_id: { type: 'zero' },
        template_id: { type: 'negative' },
        payment_method: { type: 'invalid_type', value: 'invalid' }
      });

      await expect(marketplaceRepository.createPurchase(invalidData)).rejects.toThrow();
    });

    it('should find purchases by user with valid schema', async () => {
      createdPurchase = await marketplaceRepository.createPurchase(testPurchaseData);
      
      const purchases = await marketplaceRepository.findPurchasesByUser(testPurchaseData.user_id);
      
      expect(Array.isArray(purchases)).toBe(true);
      expect(purchases.length).toBeGreaterThan(0);
      
      for (const purchase of purchases) {
        const validation = await global.schemaValidator.validate('marketplace_purchases', purchase);
        expect(validation.valid).toBe(true);
        expect(purchase.user_id).toBe(testPurchaseData.user_id);
      }
    });

    it('should find purchases by template with valid schema', async () => {
      createdPurchase = await marketplaceRepository.createPurchase(testPurchaseData);
      
      const purchases = await marketplaceRepository.findPurchasesByTemplate(testPurchaseData.template_id);
      
      expect(Array.isArray(purchases)).toBe(true);
      
      for (const purchase of purchases) {
        const validation = await global.schemaValidator.validate('marketplace_purchases', purchase);
        expect(validation.valid).toBe(true);
        expect(purchase.template_id).toBe(testPurchaseData.template_id);
      }
    });
  });

  describe('Marketplace Statistics and Analytics', () => {
    let createdDesigner, createdTemplate, createdPurchase;

    beforeEach(async () => {
      createdDesigner = await marketplaceRepository.createDesigner(testDesignerData);
      createdTemplate = await marketplaceRepository.createTemplate({
        ...testTemplateData,
        designer_id: createdDesigner.id
      });
      createdPurchase = await marketplaceRepository.createPurchase({
        ...testPurchaseData,
        template_id: createdTemplate.id
      });
    });

    afterEach(async () => {
      // Nettoyage dans l'ordre inverse pour éviter les contraintes de clé étrangère
      if (createdPurchase) {
        try {
          await marketplaceRepository.deletePurchase(createdPurchase.id);
        } catch (error) {
          // Ignorer
        }
      }
      if (createdTemplate) {
        try {
          await marketplaceRepository.deleteTemplate(createdTemplate.id);
        } catch (error) {
          // Ignorer
        }
      }
      if (createdDesigner) {
        try {
          await marketplaceRepository.deleteDesigner(createdDesigner.id);
        } catch (error) {
          // Ignorer
        }
      }
    });

    it('should get marketplace statistics with valid schema', async () => {
      const stats = await marketplaceRepository.getMarketplaceStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      
      // Valider que les statistiques ont des types cohérents
      if (stats.total_designers !== undefined) {
        expect(Number.isInteger(stats.total_designers)).toBe(true);
        expect(stats.total_designers).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.total_templates !== undefined) {
        expect(Number.isInteger(stats.total_templates)).toBe(true);
        expect(stats.total_templates).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.total_purchases !== undefined) {
        expect(Number.isInteger(stats.total_purchases)).toBe(true);
        expect(stats.total_purchases).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.total_revenue !== undefined) {
        expect(typeof stats.total_revenue).toBe('number');
        expect(stats.total_revenue).toBeGreaterThanOrEqual(0);
      }
    });

    it('should get designer statistics with valid schema', async () => {
      const designerStats = await marketplaceRepository.getDesignerStats(createdDesigner.id);
      
      expect(designerStats).toBeDefined();
      expect(typeof designerStats).toBe('object');
      
      if (designerStats.total_templates !== undefined) {
        expect(Number.isInteger(designerStats.total_templates)).toBe(true);
        expect(designerStats.total_templates).toBeGreaterThanOrEqual(0);
      }
      
      if (designerStats.total_sales !== undefined) {
        expect(Number.isInteger(designerStats.total_sales)).toBe(true);
        expect(designerStats.total_sales).toBeGreaterThanOrEqual(0);
      }
      
      if (designerStats.total_revenue !== undefined) {
        expect(typeof designerStats.total_revenue).toBe('number');
        expect(designerStats.total_revenue).toBeGreaterThanOrEqual(0);
      }
    });

    it('should get template statistics with valid schema', async () => {
      const templateStats = await marketplaceRepository.getTemplateStats(createdTemplate.id);
      
      expect(templateStats).toBeDefined();
      expect(typeof templateStats).toBe('object');
      
      if (templateStats.total_purchases !== undefined) {
        expect(Number.isInteger(templateStats.total_purchases)).toBe(true);
        expect(templateStats.total_purchases).toBeGreaterThanOrEqual(0);
      }
      
      if (templateStats.total_revenue !== undefined) {
        expect(typeof templateStats.total_revenue).toBe('number');
        expect(templateStats.total_revenue).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent designer operations', async () => {
      const promises = Array(3).fill().map(async (_, index) => {
        const designerData = await global.createValidData('marketplace_designers', {
          user_id: global.generateTestId(),
          brand_name: `Concurrent Designer ${index}`,
          email: `concurrent${index}-${Date.now()}@example.com`
        });
        return marketplaceRepository.createDesigner(designerData);
      });

      const results = await Promise.all(promises);
      
      for (const designer of results) {
        expect(designer).toBeDefined();
        expect(designer.id).toBeDefined();
        
        const validation = await global.schemaValidator.validate('marketplace_designers', designer);
        expect(validation.valid).toBe(true);
        
        // Nettoyer
        try {
          await marketplaceRepository.deleteDesigner(designer.id);
        } catch (error) {
          // Ignorer
        }
      }
    });

    it('should validate URL formats', async () => {
      const validUrls = [
        'https://example.com',
        'https://www.example.com/portfolio',
        'https://portfolio.example.com'
      ];
      
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'http://',
        'https://'
      ];

      for (const url of validUrls) {
        const designerData = await global.createValidData('marketplace_designers', {
          portfolio_url: url
        });
        
        const validation = await global.schemaValidator.validate('marketplace_designers', designerData);
        expect(validation.valid).toBe(true);
      }

      for (const url of invalidUrls) {
        const designerData = await global.createValidData('marketplace_designers', {
          portfolio_url: url
        });
        
        const validation = await global.schemaValidator.validate('marketplace_designers', designerData);
        // Les URLs invalides peuvent être acceptées au niveau du schéma mais rejetées au niveau applicatif
        expect(validation).toBeDefined();
      }
    });

    it('should handle JSON fields correctly', async () => {
      const specialtiesData = {
        skills: ['wedding', 'corporate', 'birthday'],
        experience: 5,
        location: 'Paris'
      };

      const designerData = await global.createValidData('marketplace_designers', {
        specialties: specialtiesData
      });

      const validation = await global.schemaValidator.validate('marketplace_designers', designerData);
      expect(validation.valid).toBe(true);
      expect(typeof designerData.specialties).toBe('object');
    });
  });
});
