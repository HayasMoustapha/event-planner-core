/**
 * ========================================
 * HELPER DE TESTS BASÉS SUR SCHÉMA
 * ========================================
 * Helpers pour tests CRUD et validation automatique
 * @version 1.0.0
 */

const request = require('supertest');

class SchemaTestHelper {
  constructor(factory, validator) {
    this.factory = factory;
    this.validator = validator;
    this.createdRecords = new Map(); // Pour le nettoyage
  }

  /**
   * Crée des données valides pour une table
   */
  async createValidData(tableName, overrides = {}) {
    const data = await this.factory.generate(tableName, overrides);
    const validation = await this.validator.validate(tableName, data);
    
    if (!validation.valid) {
      throw new Error(`Generated invalid data for ${tableName}: ${validation.errors.join(', ')}`);
    }
    
    return data;
  }

  /**
   * Crée des données invalides pour tester la validation
   */
  async createInvalidData(tableName, invalidFields = {}) {
    // D'abord générer des données valides
    const validData = await this.createValidData(tableName);
    
    // Appliquer les invalidations demandées
    const invalidData = { ...validData };
    
    for (const [fieldName, invalidation] of Object.entries(invalidFields)) {
      if (invalidation.type === 'null') {
        invalidData[fieldName] = null;
      } else if (invalidation.type === 'undefined') {
        delete invalidData[fieldName];
      } else if (invalidation.type === 'empty') {
        invalidData[fieldName] = '';
      } else if (invalidation.type === 'too_long') {
        invalidData[fieldName] = 'x'.repeat(invalidation.length || 1000);
      } else if (invalidation.type === 'invalid_type') {
        invalidData[fieldName] = invalidation.value;
      } else if (invalidation.type === 'negative') {
        invalidData[fieldName] = -1;
      } else if (invalidation.type === 'zero') {
        invalidData[fieldName] = 0;
      }
    }
    
    return invalidData;
  }

  /**
   * Test CRUD complet pour un repository
   */
  async testRepositoryCRUD(repository, tableName) {
    describe(`${repository.constructor.name} CRUD Tests`, () => {
      let testData;
      let createdRecord;
      let updatedRecord;

      beforeEach(async () => {
        testData = await this.createValidData(tableName);
      });

      afterEach(async () => {
        // Nettoyer les enregistrements créés
        if (createdRecord && createdRecord.id) {
          try {
            await repository.delete(createdRecord.id);
          } catch (error) {
            // Ignorer les erreurs de nettoyage
          }
        }
      });

      describe('CREATE', () => {
        it('should create valid record', async () => {
          createdRecord = await repository.create(testData);
          
          expect(createdRecord).toBeDefined();
          expect(createdRecord.id).toBeDefined();
          
          // Valider que les données retournées correspondent au schéma
          const validation = await this.validator.validate(tableName, createdRecord);
          expect(validation.valid).toBe(true);
          
          // Valider que les données importantes sont préservées
          Object.keys(testData).forEach(key => {
            if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
              expect(createdRecord[key]).toEqual(testData[key]);
            }
          });
        });

        it('should reject invalid data', async () => {
          const invalidData = await this.createInvalidData(tableName, {
            title: { type: 'null' }, // Assumer qu'il y a un champ title
            email: { type: 'invalid_type', value: 'invalid-email' }
          });

          await expect(repository.create(invalidData)).rejects.toThrow();
        });
      });

      describe('READ', () => {
        beforeEach(async () => {
          createdRecord = await repository.create(testData);
        });

        it('should find record by ID', async () => {
          const found = await repository.findById(createdRecord.id);
          
          expect(found).toBeDefined();
          expect(found.id).toBe(createdRecord.id);
          
          const validation = await this.validator.validate(tableName, found);
          expect(validation.valid).toBe(true);
        });

        it('should return null for non-existent ID', async () => {
          const found = await repository.findById(999999);
          expect(found).toBeNull();
        });

        it('should find multiple records', async () => {
          // Créer quelques enregistrements supplémentaires
          const additionalRecords = [];
          for (let i = 0; i < 3; i++) {
            const record = await repository.create(await this.createValidData(tableName));
            additionalRecords.push(record);
          }

          try {
            const allRecords = await repository.findAll();
            expect(Array.isArray(allRecords)).toBe(true);
            expect(allRecords.length).toBeGreaterThanOrEqual(4); // 3 + 1 principal

            // Valider que tous les enregistrements respectent le schéma
            for (const record of allRecords) {
              const validation = await this.validator.validate(tableName, record);
              expect(validation.valid).toBe(true);
            }
          } finally {
            // Nettoyer les enregistrements supplémentaires
            for (const record of additionalRecords) {
              try {
                await repository.delete(record.id);
              } catch (error) {
                // Ignorer
              }
            }
          }
        });
      });

      describe('UPDATE', () => {
        beforeEach(async () => {
          createdRecord = await repository.create(testData);
        });

        it('should update record', async () => {
          const updateData = await this.createValidData(tableName, {
            id: createdRecord.id
          });
          
          updatedRecord = await repository.update(createdRecord.id, updateData);
          
          expect(updatedRecord).toBeDefined();
          expect(updatedRecord.id).toBe(createdRecord.id);
          
          // Valider le schéma
          const validation = await this.validator.validate(tableName, updatedRecord);
          expect(validation.valid).toBe(true);
          
          // Valider que les données ont été mises à jour
          Object.keys(updateData).forEach(key => {
            if (key !== 'id' && key !== 'updated_at') {
              expect(updatedRecord[key]).toEqual(updateData[key]);
            }
          });
        });

        it('should reject invalid update data', async () => {
          const invalidUpdate = await this.createInvalidData(tableName, {
            email: { type: 'invalid_type', value: 'still-invalid-email' }
          });

          await expect(repository.update(createdRecord.id, invalidUpdate)).rejects.toThrow();
        });

        it('should return null for non-existent ID', async () => {
          const updateData = await this.createValidData(tableName);
          const result = await repository.update(999999, updateData);
          expect(result).toBeNull();
        });
      });

      describe('DELETE', () => {
        beforeEach(async () => {
          createdRecord = await repository.create(testData);
        });

        it('should delete record', async () => {
          const deleteResult = await repository.delete(createdRecord.id);
          
          expect(deleteResult).toBeDefined();
          
          // Vérifier que l'enregistrement n'existe plus
          const found = await repository.findById(createdRecord.id);
          expect(found).toBeNull();
        });

        it('should return null for non-existent ID', async () => {
          const result = await repository.delete(999999);
          expect(result).toBeNull();
        });
      });
    });
  }

  /**
   * Test API REST complet pour un endpoint
   */
  async testAPIEndpoints(app, tableName, basePath, authToken) {
    describe(`${tableName} API Tests`, () => {
      let testData;
      let createdRecord;
      let createdId;

      beforeEach(async () => {
        testData = await this.createValidData(tableName);
      });

      afterEach(async () => {
        // Nettoyage si nécessaire
        if (createdId && authToken) {
          try {
            await request(app)
              .delete(`${basePath}/${createdId}`)
              .set('Authorization', `Bearer ${authToken}`);
          } catch (error) {
            // Ignorer les erreurs de nettoyage
          }
        }
      });

      describe('POST /', () => {
        it('should create record with valid data', async () => {
          const response = await request(app)
            .post(basePath)
            .set('Authorization', `Bearer ${authToken}`)
            .send(testData)
            .expect(201);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
          expect(response.body.data.id).toBeDefined();

          // Valider la réponse contre le schéma
          const validation = await this.validator.validate(tableName, response.body.data);
          expect(validation.valid).toBe(true);

          createdId = response.body.data.id;
          createdRecord = response.body.data;
        });

        it('should reject invalid data', async () => {
          const invalidData = await this.createInvalidData(tableName, {
            title: { type: 'null' }
          });

          const response = await request(app)
            .post(basePath)
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidData)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
        });

        it('should require authentication', async () => {
          await request(app)
            .post(basePath)
            .send(testData)
            .expect(401);
        });
      });

      describe('GET /', () => {
        beforeEach(async () => {
          // Créer un enregistrement pour les tests GET
          const createResponse = await request(app)
            .post(basePath)
            .set('Authorization', `Bearer ${authToken}`)
            .send(testData);
          
          createdId = createResponse.body.data.id;
        });

        it('should list records', async () => {
          const response = await request(app)
            .get(basePath)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(Array.isArray(response.body.data)).toBe(true);

          // Valider chaque enregistrement
          for (const record of response.body.data) {
            const validation = await this.validator.validate(tableName, record);
            expect(validation.valid).toBe(true);
          }
        });

        it('should support pagination', async () => {
          const response = await request(app)
            .get(`${basePath}?page=1&limit=5`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.pagination).toBeDefined();
          expect(response.body.pagination.page).toBe(1);
          expect(response.body.pagination.limit).toBe(5);
        });
      });

      describe('GET /:id', () => {
        beforeEach(async () => {
          const createResponse = await request(app)
            .post(basePath)
            .set('Authorization', `Bearer ${authToken}`)
            .send(testData);
          
          createdId = createResponse.body.data.id;
        });

        it('should get specific record', async () => {
          const response = await request(app)
            .get(`${basePath}/${createdId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.id).toBe(createdId);

          // Valider la réponse
          const validation = await this.validator.validate(tableName, response.body.data);
          expect(validation.valid).toBe(true);
        });

        it('should return 404 for non-existent record', async () => {
          const response = await request(app)
            .get(`${basePath}/999999`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(404);

          expect(response.body.success).toBe(false);
        });
      });

      describe('PUT /:id', () => {
        beforeEach(async () => {
          const createResponse = await request(app)
            .post(basePath)
            .set('Authorization', `Bearer ${authToken}`)
            .send(testData);
          
          createdId = createResponse.body.data.id;
        });

        it('should update record', async () => {
          const updateData = await this.createValidData(tableName);

          const response = await request(app)
            .put(`${basePath}/${createdId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.id).toBe(createdId);

          // Valider la réponse mise à jour
          const validation = await this.validator.validate(tableName, response.body.data);
          expect(validation.valid).toBe(true);
        });

        it('should reject invalid update data', async () => {
          const invalidData = await this.createInvalidData(tableName, {
            email: { type: 'invalid_type', value: 'bad-email' }
          });

          const response = await request(app)
            .put(`${basePath}/${createdId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidData)
            .expect(400);

          expect(response.body.success).toBe(false);
        });
      });

      describe('DELETE /:id', () => {
        beforeEach(async () => {
          const createResponse = await request(app)
            .post(basePath)
            .set('Authorization', `Bearer ${authToken}`)
            .send(testData);
          
          createdId = createResponse.body.data.id;
        });

        it('should delete record', async () => {
          const response = await request(app)
            .delete(`${basePath}/${createdId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);

          // Vérifier que l'enregistrement n'existe plus
          await request(app)
            .get(`${basePath}/${createdId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(404);

          createdId = null; // Éviter le nettoyage en double
        });
      });
    });
  }

  /**
   * Test de validation de schéma
   */
  async testSchemaValidation(tableName) {
    describe(`${tableName} Schema Validation Tests`, () => {
      it('should validate all generated data', async () => {
        // Générer 10 enregistrements et valider chacun
        for (let i = 0; i < 10; i++) {
          const data = await this.createValidData(tableName);
          const validation = await this.validator.validate(tableName, data);
          
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      });

      it('should detect invalid data', async () => {
        const invalidData = await this.createInvalidData(tableName, {
          title: { type: 'null' },
          email: { type: 'invalid_type', value: 'definitely-not-an-email' },
          created_at: { type: 'invalid_type', value: 'not-a-date' }
        });

        const validation = await this.validator.validate(tableName, invalidData);
        
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });

      it('should handle edge cases', async () => {
        const edgeCases = [
          { type: 'max_length', field: 'title', value: 'x'.repeat(1000) },
          { type: 'min_value', field: 'price', value: -100 },
          { type: 'max_value', field: 'max_attendees', value: Number.MAX_SAFE_INTEGER }
        ];

        for (const edgeCase of edgeCases) {
          const data = await this.createValidData(tableName, {
            [edgeCase.field]: edgeCase.value
          });

          const validation = await this.validator.validate(tableName, data);
          
          // Certains edge cases peuvent être valides, d'autres non
          // Le test principal est que la validation ne plante pas
          expect(validation).toBeDefined();
          expect(validation.errors).toBeDefined();
        }
      });
    });
  }

  /**
   * Helper pour créer une requête authentifiée
   */
  createAuthenticatedRequest(app, token) {
    return request(app).set('Authorization', `Bearer ${token}`);
  }

  /**
   * Helper pour valider une réponse de succès
   */
  expectSuccessResponse(response, expectedData = {}) {
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    
    if (Object.keys(expectedData).length > 0) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  }

  /**
   * Helper pour valider une réponse d'erreur
   */
  expectErrorResponse(response, expectedStatus = 400, expectedErrorField = null) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    
    if (expectedErrorField) {
      expect(response.body.error).toContain(expectedErrorField);
    }
  }

  /**
   * Nettoyage de tous les enregistrements créés
   */
  async cleanup() {
    // Implémenter le nettoyage si nécessaire
    this.createdRecords.clear();
  }
}

module.exports = SchemaTestHelper;
