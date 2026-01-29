/**
 * ========================================
 * TESTS REPOSITORY GUESTS BASÉS SUR SCHÉMA
 * ========================================
 * Tests CRUD automatiques avec validation stricte du schéma SQL
 * @version 1.0.0
 */

const GuestsRepository = require('../../../src/modules/guests/guests.repository');

describe('Guests Repository - Schema Based Tests', () => {
  let guestsRepository;
  let testGuestData;

  beforeAll(async () => {
    guestsRepository = new GuestsRepository();
  });

  beforeEach(async () => {
    // Générer des données de test valides selon le schéma
    testGuestData = await global.createValidData('guests', {
      event_id: global.generateTestId(),
      email: global.generateTestEmail()
    });
  });

  describe('Schema Validation', () => {
    it('should have valid schema structure', async () => {
      const schema = global.schemaFactory.schemas.get('guests');
      
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('guests');
      
      // Valider les colonnes essentielles
      const requiredColumns = ['id', 'first_name', 'last_name', 'email', 'event_id', 'checked_in', 'created_at', 'updated_at'];
      const schemaColumns = Object.keys(schema.columns);
      
      requiredColumns.forEach(column => {
        expect(schemaColumns).toContain(column);
        expect(schema.columns[column]).toBeDefined();
        expect(schema.columns[column].type).toBeDefined();
      });
    });

    it('should generate valid test data', async () => {
      const validation = await global.schemaValidator.validate('guests', testGuestData);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Valider les champs spécifiques
      expect(testGuestData.first_name).toBeDefined();
      expect(typeof testGuestData.first_name).toBe('string');
      expect(testGuestData.first_name.length).toBeGreaterThan(0);
      expect(testGuestData.first_name.length).toBeLessThanOrEqual(100);
      
      expect(testGuestData.last_name).toBeDefined();
      expect(typeof testGuestData.last_name).toBe('string');
      expect(testGuestData.last_name.length).toBeGreaterThan(0);
      expect(testGuestData.last_name.length).toBeLessThanOrEqual(100);
      
      expect(testGuestData.email).toBeDefined();
      expect(typeof testGuestData.email).toBe('string');
      expect(testGuestData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      
      expect(testGuestData.event_id).toBeDefined();
      expect(Number.isInteger(testGuestData.event_id)).toBe(true);
      expect(testGuestData.event_id).toBeGreaterThan(0);
      
      expect(typeof testGuestData.checked_in).toBe('boolean');
    });
  });

  describe('CRUD Operations', () => {
    let createdGuest;

    afterEach(async () => {
      // Nettoyer l'invité créé
      if (createdGuest && createdGuest.id) {
        try {
          await guestsRepository.delete(createdGuest.id);
        } catch (error) {
          // Ignorer les erreurs de nettoyage
        }
        createdGuest = null;
      }
    });

    describe('CREATE', () => {
      it('should create guest with valid schema data', async () => {
        createdGuest = await guestsRepository.create(testGuestData);
        
        expect(createdGuest).toBeDefined();
        expect(createdGuest.id).toBeDefined();
        expect(Number.isInteger(createdGuest.id)).toBe(true);
        expect(createdGuest.id).toBeGreaterThan(0);
        
        // Valider que l'enregistrement créé respecte le schéma
        const validation = await global.schemaValidator.validate('guests', createdGuest);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        
        // Valider que les données sont préservées
        expect(createdGuest.first_name).toBe(testGuestData.first_name);
        expect(createdGuest.last_name).toBe(testGuestData.last_name);
        expect(createdGuest.email).toBe(testGuestData.email);
        expect(createdGuest.event_id).toBe(testGuestData.event_id);
        expect(createdGuest.checked_in).toBe(testGuestData.checked_in);
      });

      it('should reject invalid schema data', async () => {
        const invalidData = await global.createInvalidData('guests', {
          first_name: { type: 'null' }, // Violation NOT NULL
          last_name: { type: 'null' }, // Violation NOT NULL
          email: { type: 'invalid_type', value: 'not-an-email' },
          event_id: { type: 'zero' }
        });

        await expect(guestsRepository.create(invalidData)).rejects.toThrow();
      });

      it('should handle email uniqueness constraint', async () => {
        // Créer le premier invité
        createdGuest = await guestsRepository.create(testGuestData);
        
        // Essayer de créer un deuxième invité avec le même email
        const duplicateData = { ...testGuestData };
        delete duplicateData.id; // Supprimer l'ID auto-généré
        
        await expect(guestsRepository.create(duplicateData)).rejects.toThrow();
      });

      it('should validate name length constraints', async () => {
        const longNameData = await global.createValidData('guests', {
          first_name: 'A'.repeat(150), // Dépasse la limite de 100
          last_name: 'B'.repeat(150)   // Dépasse la limite de 100
        });

        // Le repository devrait soit tronquer, soit rejeter
        try {
          const result = await guestsRepository.create(longNameData);
          expect(result.first_name.length).toBeLessThanOrEqual(100);
          expect(result.last_name.length).toBeLessThanOrEqual(100);
        } catch (error) {
          expect(error.message).toMatch(/first_name|last_name/);
        }
      });

      it('should handle phone number format', async () => {
        const phoneData = await global.createValidData('guests', {
          phone: '+33612345678'
        });

        const guest = await guestsRepository.create(phoneData);
        
        expect(guest).toBeDefined();
        expect(guest.phone).toBe('+33612345678');
        
        // Nettoyer
        await guestsRepository.delete(guest.id);
      });
    });

    describe('READ', () => {
      beforeEach(async () => {
        createdGuest = await guestsRepository.create(testGuestData);
      });

      it('should find guest by ID with valid schema', async () => {
        const foundGuest = await guestsRepository.findById(createdGuest.id);
        
        expect(foundGuest).toBeDefined();
        expect(foundGuest.id).toBe(createdGuest.id);
        
        // Valider le schéma de l'enregistrement trouvé
        const validation = await global.schemaValidator.validate('guests', foundGuest);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should return null for non-existent ID', async () => {
        const foundGuest = await guestsRepository.findById(999999);
        expect(foundGuest).toBeNull();
      });

      it('should find guests by event with valid schema', async () => {
        const guests = await guestsRepository.findByEvent(testGuestData.event_id);
        
        expect(Array.isArray(guests)).toBe(true);
        expect(guests.length).toBeGreaterThan(0);
        
        // Valider que chaque invité respecte le schéma
        for (const guest of guests) {
          const validation = await global.schemaValidator.validate('guests', guest);
          expect(validation.valid).toBe(true);
          expect(guest.event_id).toBe(testGuestData.event_id);
        }
      });

      it('should find guests by email with valid schema', async () => {
        const guest = await guestsRepository.findByEmail(testGuestData.email);
        
        expect(guest).toBeDefined();
        expect(guest.email).toBe(testGuestData.email);
        
        // Valider le schéma
        const validation = await global.schemaValidator.validate('guests', guest);
        expect(validation.valid).toBe(true);
      });

      it('should handle pagination correctly', async () => {
        // Créer quelques invités supplémentaires
        const additionalGuests = [];
        for (let i = 0; i < 3; i++) {
          const guestData = await global.createValidData('guests', {
            event_id: testGuestData.event_id,
            email: `test${i}-${Date.now()}@example.com`
          });
          const guest = await guestsRepository.create(guestData);
          additionalGuests.push(guest);
        }

        try {
          const options = { page: 1, limit: 2 };
          const result = await guestsRepository.findByEvent(testGuestData.event_id, options);
          
          expect(result.guests).toBeDefined();
          expect(Array.isArray(result.guests)).toBe(true);
          expect(result.guests.length).toBeLessThanOrEqual(2);
          expect(result.pagination).toBeDefined();
          expect(result.pagination.page).toBe(1);
          expect(result.pagination.limit).toBe(2);
          
          // Valider le schéma des résultats
          for (const guest of result.guests) {
            const validation = await global.schemaValidator.validate('guests', guest);
            expect(validation.valid).toBe(true);
          }
        } finally {
          // Nettoyer les invités supplémentaires
          for (const guest of additionalGuests) {
            try {
              await guestsRepository.delete(guest.id);
            } catch (error) {
              // Ignorer
            }
          }
        }
      });
    });

    describe('UPDATE', () => {
      beforeEach(async () => {
        createdGuest = await guestsRepository.create(testGuestData);
      });

      it('should update guest with valid schema data', async () => {
        const updateData = await global.createValidData('guests', {
          first_name: 'Updated First Name',
          last_name: 'Updated Last Name',
          phone: '+33698765432',
          checked_in: true
        });

        const updatedGuest = await guestsRepository.update(createdGuest.id, updateData);
        
        expect(updatedGuest).toBeDefined();
        expect(updatedGuest.id).toBe(createdGuest.id);
        
        // Valider le schéma de l'enregistrement mis à jour
        const validation = await global.schemaValidator.validate('guests', updatedGuest);
        expect(validation.valid).toBe(true);
        
        // Valider que les données ont été mises à jour
        expect(updatedGuest.first_name).toBe(updateData.first_name);
        expect(updatedGuest.last_name).toBe(updateData.last_name);
        expect(updatedGuest.phone).toBe(updateData.phone);
        expect(updatedGuest.checked_in).toBe(updateData.checked_in);
      });

      it('should reject invalid update data', async () => {
        const invalidUpdate = await global.createInvalidData('guests', {
          first_name: { type: 'null' },
          email: { type: 'invalid_type', value: 'still-invalid-email' }
        });

        await expect(guestsRepository.update(createdGuest.id, invalidUpdate)).rejects.toThrow();
      });

      it('should return null for non-existent ID', async () => {
        const updateData = await global.createValidData('guests');
        const result = await guestsRepository.update(999999, updateData);
        expect(result).toBeNull();
      });
    });

    describe('DELETE', () => {
      beforeEach(async () => {
        createdGuest = await guestsRepository.create(testGuestData);
      });

      it('should delete guest and return deleted record', async () => {
        const deletedGuest = await guestsRepository.delete(createdGuest.id);
        
        expect(deletedGuest).toBeDefined();
        expect(deletedGuest.id).toBe(createdGuest.id);
        
        // Valider le schéma de l'enregistrement supprimé
        const validation = await global.schemaValidator.validate('guests', deletedGuest);
        expect(validation.valid).toBe(true);
        
        // Vérifier que l'invité n'existe plus
        const foundGuest = await guestsRepository.findById(createdGuest.id);
        expect(foundGuest).toBeNull();
        
        createdGuest = null; // Éviter le nettoyage en double
      });

      it('should return null for non-existent ID', async () => {
        const result = await guestsRepository.delete(999999);
        expect(result).toBeNull();
      });
    });
  });

  describe('Schema-Specific Operations', () => {
    let createdGuest;

    beforeEach(async () => {
      createdGuest = await guestsRepository.create(testGuestData);
    });

    afterEach(async () => {
      if (createdGuest && createdGuest.id) {
        try {
          await guestsRepository.delete(createdGuest.id);
        } catch (error) {
          // Ignorer
        }
        createdGuest = null;
      }
    });

    it('should check in guest with valid schema', async () => {
      const checkedInGuest = await guestsRepository.checkIn(createdGuest.id);
      
      expect(checkedInGuest).toBeDefined();
      expect(checkedInGuest.id).toBe(createdGuest.id);
      expect(checkedInGuest.checked_in).toBe(true);
      expect(checkedInGuest.check_in_time).toBeDefined();
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('guests', checkedInGuest);
      expect(validation.valid).toBe(true);
    });

    it('should check out guest with valid schema', async () => {
      // D'abord check-in
      await guestsRepository.checkIn(createdGuest.id);
      
      // Puis check-out
      const checkedOutGuest = await guestsRepository.checkOut(createdGuest.id);
      
      expect(checkedOutGuest).toBeDefined();
      expect(checkedOutGuest.id).toBe(createdGuest.id);
      expect(checkedOutGuest.checked_in).toBe(false);
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('guests', checkedOutGuest);
      expect(validation.valid).toBe(true);
    });

    it('should get guest statistics with valid schema', async () => {
      const stats = await guestsRepository.getGuestStats(createdGuest.event_id);
      
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
      
      if (stats.check_in_rate !== undefined) {
        expect(typeof stats.check_in_rate).toBe('number');
        expect(stats.check_in_rate).toBeGreaterThanOrEqual(0);
        expect(stats.check_in_rate).toBeLessThanOrEqual(100);
      }
    });

    it('should search guests with valid schema', async () => {
      const searchResults = await guestsRepository.searchGuests(
        createdGuest.event_id,
        createdGuest.first_name
      );
      
      expect(Array.isArray(searchResults)).toBe(true);
      
      // Valider que chaque résultat respecte le schéma
      for (const guest of searchResults) {
        const validation = await global.schemaValidator.validate('guests', guest);
        expect(validation.valid).toBe(true);
        expect(guest.event_id).toBe(createdGuest.event_id);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent operations', async () => {
      // Créer plusieurs invités simultanément
      const promises = Array(5).fill().map(async (_, index) => {
        const guestData = await global.createValidData('guests', {
          event_id: global.generateTestId(),
          email: `concurrent${index}-${Date.now()}@example.com`
        });
        return guestsRepository.create(guestData);
      });

      const results = await Promise.all(promises);
      
      // Valider que tous les invités créés respectent le schéma
      for (const guest of results) {
        expect(guest).toBeDefined();
        expect(guest.id).toBeDefined();
        
        const validation = await global.schemaValidator.validate('guests', guest);
        expect(validation.valid).toBe(true);
        
        // Nettoyer
        try {
          await guestsRepository.delete(guest.id);
        } catch (error) {
          // Ignorer
        }
      }
    });

    it('should handle special characters in data', async () => {
      const specialCharData = await global.createValidData('guests', {
        first_name: 'Jean-François',
        last_name: 'Éléonore d\'Arc',
        email: 'test+special@example.com'
      });

      const guest = await guestsRepository.create(specialCharData);
      
      expect(guest).toBeDefined();
      expect(guest.first_name).toBe(specialCharData.first_name);
      expect(guest.last_name).toBe(specialCharData.last_name);
      expect(guest.email).toBe(specialCharData.email);
      
      const validation = await global.schemaValidator.validate('guests', guest);
      expect(validation.valid).toBe(true);
      
      // Nettoyer
      await guestsRepository.delete(guest.id);
    });

    it('should validate email formats strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example..com'
      ];

      for (const invalidEmail of invalidEmails) {
        const invalidData = await global.createValidData('guests', {
          email: invalidEmail
        });

        await expect(guestsRepository.create(invalidData)).rejects.toThrow();
      }
    });
  });
});
