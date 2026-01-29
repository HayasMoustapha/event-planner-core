/**
 * ========================================
 * TESTS REPOSITORY TICKETS BASÉS SUR SCHÉMA
 * ========================================
 * Tests CRUD automatiques avec validation stricte du schéma SQL
 * @version 1.0.0
 */

const TicketsRepository = require('../../../src/modules/tickets/tickets.repository');

describe('Tickets Repository - Schema Based Tests', () => {
  let ticketsRepository;
  let testTicketData;

  beforeAll(async () => {
    ticketsRepository = new TicketsRepository();
  });

  beforeEach(async () => {
    // Générer des données de test valides selon le schéma
    testTicketData = await global.createValidData('tickets', {
      ticket_code: `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      ticket_type_id: global.generateTestId(),
      event_guest_id: global.generateTestId(),
      price: 99.99,
      currency: 'EUR'
    });
  });

  describe('Schema Validation', () => {
    it('should have valid schema structure', async () => {
      const schema = global.schemaFactory.schemas.get('tickets');
      
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('tickets');
      
      // Valider les colonnes essentielles
      const requiredColumns = ['id', 'ticket_code', 'qr_code_data', 'ticket_type_id', 'event_guest_id', 'price', 'currency', 'status', 'created_at', 'updated_at'];
      const schemaColumns = Object.keys(schema.columns);
      
      requiredColumns.forEach(column => {
        expect(schemaColumns).toContain(column);
        expect(schema.columns[column]).toBeDefined();
        expect(schema.columns[column].type).toBeDefined();
      });
    });

    it('should generate valid test data', async () => {
      const validation = await global.schemaValidator.validate('tickets', testTicketData);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Valider les champs spécifiques
      expect(testTicketData.ticket_code).toBeDefined();
      expect(typeof testTicketData.ticket_code).toBe('string');
      expect(testTicketData.ticket_code.length).toBeGreaterThan(0);
      expect(testTicketData.ticket_code.length).toBeLessThanOrEqual(50);
      
      expect(testTicketData.ticket_type_id).toBeDefined();
      expect(Number.isInteger(testTicketData.ticket_type_id)).toBe(true);
      expect(testTicketData.ticket_type_id).toBeGreaterThan(0);
      
      expect(testTicketData.event_guest_id).toBeDefined();
      expect(Number.isInteger(testTicketData.event_guest_id)).toBe(true);
      expect(testTicketData.event_guest_id).toBeGreaterThan(0);
      
      expect(testTicketData.price).toBeDefined();
      expect(typeof testTicketData.price).toBe('number');
      expect(testTicketData.price).toBeGreaterThanOrEqual(0);
      
      expect(testTicketData.currency).toBeDefined();
      expect(typeof testTicketData.currency).toBe('string');
      expect(testTicketData.currency).toMatch(/^[A-Z]{3}$/);
      
      expect(testTicketData.status).toBeDefined();
      expect(['active', 'used', 'cancelled', 'expired']).toContain(testTicketData.status);
    });
  });

  describe('CRUD Operations', () => {
    let createdTicket;

    afterEach(async () => {
      // Nettoyer le ticket créé
      if (createdTicket && createdTicket.id) {
        try {
          await ticketsRepository.delete(createdTicket.id);
        } catch (error) {
          // Ignorer les erreurs de nettoyage
        }
        createdTicket = null;
      }
    });

    describe('CREATE', () => {
      it('should create ticket with valid schema data', async () => {
        createdTicket = await ticketsRepository.create(testTicketData);
        
        expect(createdTicket).toBeDefined();
        expect(createdTicket.id).toBeDefined();
        expect(Number.isInteger(createdTicket.id)).toBe(true);
        expect(createdTicket.id).toBeGreaterThan(0);
        
        // Valider que l'enregistrement créé respecte le schéma
        const validation = await global.schemaValidator.validate('tickets', createdTicket);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        
        // Valider que les données sont préservées
        expect(createdTicket.ticket_code).toBe(testTicketData.ticket_code);
        expect(createdTicket.ticket_type_id).toBe(testTicketData.ticket_type_id);
        expect(createdTicket.event_guest_id).toBe(testTicketData.event_guest_id);
        expect(createdTicket.price).toBe(testTicketData.price);
        expect(createdTicket.currency).toBe(testTicketData.currency);
        expect(createdTicket.status).toBe(testTicketData.status);
      });

      it('should reject invalid schema data', async () => {
        const invalidData = await global.createInvalidData('tickets', {
          ticket_code: { type: 'null' }, // Violation NOT NULL
          ticket_type_id: { type: 'zero' }, // ID invalide
          event_guest_id: { type: 'negative' }, // ID invalide
          price: { type: 'negative' }, // Prix négatif
          currency: { type: 'invalid_type', value: 'INVALID' }
        });

        await expect(ticketsRepository.create(invalidData)).rejects.toThrow();
      });

      it('should handle ticket code uniqueness constraint', async () => {
        // Créer le premier ticket
        createdTicket = await ticketsRepository.create(testTicketData);
        
        // Essayer de créer un deuxième ticket avec le même code
        const duplicateData = { ...testTicketData };
        delete duplicateData.id; // Supprimer l'ID auto-généré
        
        await expect(ticketsRepository.create(duplicateData)).rejects.toThrow();
      });

      it('should validate price constraints', async () => {
        const priceTests = [
          { price: 0, shouldPass: true },      // Prix zéro autorisé
          { price: 0.01, shouldPass: true },   // Prix minimum positif
          { price: 999999.99, shouldPass: true }, // Prix maximum
          { price: -1, shouldPass: false },    // Prix négatif non autorisé
          { price: 1000000, shouldPass: false } // Prix trop élevé
        ];

        for (const test of priceTests) {
          const priceData = await global.createValidData('tickets', {
            ticket_code: `PRICE-TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            price: test.price
          });

          if (test.shouldPass) {
            const ticket = await ticketsRepository.create(priceData);
            expect(ticket.price).toBe(test.price);
            
            // Nettoyer
            await ticketsRepository.delete(ticket.id);
          } else {
            await expect(ticketsRepository.create(priceData)).rejects.toThrow();
          }
        }
      });

      it('should validate currency format', async () => {
        const validCurrencies = ['EUR', 'USD', 'GBP', 'CHF'];
        const invalidCurrencies = ['eur', 'EURO', 'EU', 'INVALID', '123'];

        for (const currency of validCurrencies) {
          const currencyData = await global.createValidData('tickets', {
            ticket_code: `CURR-${currency}-${Date.now()}`,
            currency: currency
          });

          const ticket = await ticketsRepository.create(currencyData);
          expect(ticket.currency).toBe(currency);
          
          // Nettoyer
          await ticketsRepository.delete(ticket.id);
        }

        for (const currency of invalidCurrencies) {
          const invalidData = await global.createValidData('tickets', {
            ticket_code: `BAD-${currency}-${Date.now()}`,
            currency: currency
          });

          await expect(ticketsRepository.create(invalidData)).rejects.toThrow();
        }
      });

      it('should generate QR code data automatically', async () => {
        const ticketData = await global.createValidData('tickets', {
          ticket_code: `QR-${Date.now()}`,
          qr_code_data: null // Laisser le système générer
        });

        const ticket = await ticketsRepository.create(ticketData);
        
        expect(ticket).toBeDefined();
        expect(ticket.qr_code_data).toBeDefined();
        expect(typeof ticket.qr_code_data).toBe('string');
        expect(ticket.qr_code_data.length).toBeGreaterThan(0);
        
        // Nettoyer
        await ticketsRepository.delete(ticket.id);
      });
    });

    describe('READ', () => {
      beforeEach(async () => {
        createdTicket = await ticketsRepository.create(testTicketData);
      });

      it('should find ticket by ID with valid schema', async () => {
        const foundTicket = await ticketsRepository.findById(createdTicket.id);
        
        expect(foundTicket).toBeDefined();
        expect(foundTicket.id).toBe(createdTicket.id);
        
        // Valider le schéma de l'enregistrement trouvé
        const validation = await global.schemaValidator.validate('tickets', foundTicket);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should return null for non-existent ID', async () => {
        const foundTicket = await ticketsRepository.findById(999999);
        expect(foundTicket).toBeNull();
      });

      it('should find ticket by code with valid schema', async () => {
        const ticket = await ticketsRepository.findByCode(createdTicket.ticket_code);
        
        expect(ticket).toBeDefined();
        expect(ticket.ticket_code).toBe(createdTicket.ticket_code);
        
        // Valider le schéma
        const validation = await global.schemaValidator.validate('tickets', ticket);
        expect(validation.valid).toBe(true);
      });

      it('should find tickets by type with valid schema', async () => {
        const tickets = await ticketsRepository.findByType(testTicketData.ticket_type_id);
        
        expect(Array.isArray(tickets)).toBe(true);
        
        // Valider que chaque ticket respecte le schéma
        for (const ticket of tickets) {
          const validation = await global.schemaValidator.validate('tickets', ticket);
          expect(validation.valid).toBe(true);
          expect(ticket.ticket_type_id).toBe(testTicketData.ticket_type_id);
        }
      });

      it('should find tickets by guest with valid schema', async () => {
        const tickets = await ticketsRepository.findByGuest(testTicketData.event_guest_id);
        
        expect(Array.isArray(tickets)).toBe(true);
        
        // Valider que chaque ticket respecte le schéma
        for (const ticket of tickets) {
          const validation = await global.schemaValidator.validate('tickets', ticket);
          expect(validation.valid).toBe(true);
          expect(ticket.event_guest_id).toBe(testTicketData.event_guest_id);
        }
      });

      it('should handle pagination correctly', async () => {
        // Créer quelques tickets supplémentaires
        const additionalTickets = [];
        for (let i = 0; i < 3; i++) {
          const ticketData = await global.createValidData('tickets', {
            ticket_code: `PAGE-${i}-${Date.now()}`,
            ticket_type_id: testTicketData.ticket_type_id
          });
          const ticket = await ticketsRepository.create(ticketData);
          additionalTickets.push(ticket);
        }

        try {
          const options = { page: 1, limit: 2 };
          const result = await ticketsRepository.findByType(testTicketData.ticket_type_id, options);
          
          expect(result.tickets).toBeDefined();
          expect(Array.isArray(result.tickets)).toBe(true);
          expect(result.tickets.length).toBeLessThanOrEqual(2);
          expect(result.pagination).toBeDefined();
          expect(result.pagination.page).toBe(1);
          expect(result.pagination.limit).toBe(2);
          
          // Valider le schéma des résultats
          for (const ticket of result.tickets) {
            const validation = await global.schemaValidator.validate('tickets', ticket);
            expect(validation.valid).toBe(true);
          }
        } finally {
          // Nettoyer les tickets supplémentaires
          for (const ticket of additionalTickets) {
            try {
              await ticketsRepository.delete(ticket.id);
            } catch (error) {
              // Ignorer
            }
          }
        }
      });
    });

    describe('UPDATE', () => {
      beforeEach(async () => {
        createdTicket = await ticketsRepository.create(testTicketData);
      });

      it('should update ticket with valid schema data', async () => {
        const updateData = await global.createValidData('tickets', {
          price: 149.99,
          currency: 'USD',
          status: 'used'
        });

        const updatedTicket = await ticketsRepository.update(createdTicket.id, updateData);
        
        expect(updatedTicket).toBeDefined();
        expect(updatedTicket.id).toBe(createdTicket.id);
        
        // Valider le schéma de l'enregistrement mis à jour
        const validation = await global.schemaValidator.validate('tickets', updatedTicket);
        expect(validation.valid).toBe(true);
        
        // Valider que les données ont été mises à jour
        expect(updatedTicket.price).toBe(updateData.price);
        expect(updatedTicket.currency).toBe(updateData.currency);
        expect(updatedTicket.status).toBe(updateData.status);
      });

      it('should reject invalid update data', async () => {
        const invalidUpdate = await global.createInvalidData('tickets', {
          ticket_code: { type: 'null' },
          price: { type: 'negative' },
          currency: { type: 'invalid_type', value: 'BAD' }
        });

        await expect(ticketsRepository.update(createdTicket.id, invalidUpdate)).rejects.toThrow();
      });

      it('should return null for non-existent ID', async () => {
        const updateData = await global.createValidData('tickets');
        const result = await ticketsRepository.update(999999, updateData);
        expect(result).toBeNull();
      });
    });

    describe('DELETE', () => {
      beforeEach(async () => {
        createdTicket = await ticketsRepository.create(testTicketData);
      });

      it('should delete ticket and return deleted record', async () => {
        const deletedTicket = await ticketsRepository.delete(createdTicket.id);
        
        expect(deletedTicket).toBeDefined();
        expect(deletedTicket.id).toBe(createdTicket.id);
        
        // Valider le schéma de l'enregistrement supprimé
        const validation = await global.schemaValidator.validate('tickets', deletedTicket);
        expect(validation.valid).toBe(true);
        
        // Vérifier que le ticket n'existe plus
        const foundTicket = await ticketsRepository.findById(createdTicket.id);
        expect(foundTicket).toBeNull();
        
        createdTicket = null; // Éviter le nettoyage en double
      });

      it('should return null for non-existent ID', async () => {
        const result = await ticketsRepository.delete(999999);
        expect(result).toBeNull();
      });
    });
  });

  describe('Schema-Specific Operations', () => {
    let createdTicket;

    beforeEach(async () => {
      createdTicket = await ticketsRepository.create(testTicketData);
    });

    afterEach(async () => {
      if (createdTicket && createdTicket.id) {
        try {
          await ticketsRepository.delete(createdTicket.id);
        } catch (error) {
          // Ignorer
        }
        createdTicket = null;
      }
    });

    it('should validate ticket with valid schema', async () => {
      const validatedTicket = await ticketsRepository.validateTicket(createdTicket.ticket_code);
      
      expect(validatedTicket).toBeDefined();
      expect(validatedTicket.id).toBe(createdTicket.id);
      expect(validatedTicket.status).toBe('active');
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('tickets', validatedTicket);
      expect(validation.valid).toBe(true);
    });

    it('should use ticket with valid schema', async () => {
      const usedTicket = await ticketsRepository.useTicket(createdTicket.id);
      
      expect(usedTicket).toBeDefined();
      expect(usedTicket.id).toBe(createdTicket.id);
      expect(usedTicket.status).toBe('used');
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('tickets', usedTicket);
      expect(validation.valid).toBe(true);
    });

    it('should cancel ticket with valid schema', async () => {
      const cancelledTicket = await ticketsRepository.cancelTicket(createdTicket.id);
      
      expect(cancelledTicket).toBeDefined();
      expect(cancelledTicket.id).toBe(createdTicket.id);
      expect(cancelledTicket.status).toBe('cancelled');
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('tickets', cancelledTicket);
      expect(validation.valid).toBe(true);
    });

    it('should get ticket statistics with valid schema', async () => {
      const stats = await ticketsRepository.getTicketStats(createdTicket.ticket_type_id);
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      
      // Valider que les statistiques ont des types cohérents
      if (stats.total_tickets !== undefined) {
        expect(Number.isInteger(stats.total_tickets)).toBe(true);
        expect(stats.total_tickets).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.active_tickets !== undefined) {
        expect(Number.isInteger(stats.active_tickets)).toBe(true);
        expect(stats.active_tickets).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.used_tickets !== undefined) {
        expect(Number.isInteger(stats.used_tickets)).toBe(true);
        expect(stats.used_tickets).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.revenue !== undefined) {
        expect(typeof stats.revenue).toBe('number');
        expect(stats.revenue).toBeGreaterThanOrEqual(0);
      }
    });

    it('should search tickets with valid schema', async () => {
      const searchResults = await ticketsRepository.searchTickets(
        createdTicket.ticket_code.substring(0, 5)
      );
      
      expect(Array.isArray(searchResults)).toBe(true);
      
      // Valider que chaque résultat respecte le schéma
      for (const ticket of searchResults) {
        const validation = await global.schemaValidator.validate('tickets', ticket);
        expect(validation.valid).toBe(true);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent operations', async () => {
      // Créer plusieurs tickets simultanément
      const promises = Array(5).fill().map(async (_, index) => {
        const ticketData = await global.createValidData('tickets', {
          ticket_code: `CONCURRENT-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          ticket_type_id: global.generateTestId(),
          event_guest_id: global.generateTestId()
        });
        return ticketsRepository.create(ticketData);
      });

      const results = await Promise.all(promises);
      
      // Valider que tous les tickets créés respectent le schéma
      for (const ticket of results) {
        expect(ticket).toBeDefined();
        expect(ticket.id).toBeDefined();
        
        const validation = await global.schemaValidator.validate('tickets', ticket);
        expect(validation.valid).toBe(true);
        
        // Nettoyer
        try {
          await ticketsRepository.delete(ticket.id);
        } catch (error) {
          // Ignorer
        }
      }
    });

    it('should handle special characters in ticket codes', async () => {
      const specialCharData = await global.createValidData('tickets', {
        ticket_code: `SPECIAL-ÉVÈNEMENT-${Date.now()}-🎫`
      });

      const ticket = await ticketsRepository.create(specialCharData);
      
      expect(ticket).toBeDefined();
      expect(ticket.ticket_code).toBe(specialCharData.ticket_code);
      
      const validation = await global.schemaValidator.validate('tickets', ticket);
      expect(validation.valid).toBe(true);
      
      // Nettoyer
      await ticketsRepository.delete(ticket.id);
    });

    it('should validate status transitions', async () => {
      const statusTransitions = [
        { from: 'active', to: 'used', shouldPass: true },
        { from: 'active', to: 'cancelled', shouldPass: true },
        { from: 'used', to: 'active', shouldPass: false },
        { from: 'cancelled', to: 'active', shouldPass: false },
        { from: 'used', to: 'cancelled', shouldPass: false }
      ];

      for (const transition of statusTransitions) {
        const ticketData = await global.createValidData('tickets', {
          ticket_code: `STATUS-${transition.from}-${Date.now()}`,
          status: transition.from
        });

        const ticket = await ticketsRepository.create(ticketData);
        
        if (transition.shouldPass) {
          const updatedTicket = await ticketsRepository.update(ticket.id, {
            status: transition.to
          });
          expect(updatedTicket.status).toBe(transition.to);
        } else {
          await expect(ticketsRepository.update(ticket.id, {
            status: transition.to
          })).rejects.toThrow();
        }
        
        // Nettoyer
        await ticketsRepository.delete(ticket.id);
      }
    });

    it('should handle precision for decimal prices', async () => {
      const precisionTests = [
        { price: 0.01, expected: '0.01' },
        { price: 99.99, expected: '99.99' },
        { price: 123.456, expected: '123.46' }, // Arrondi à 2 décimales
        { price: 123.454, expected: '123.45' }  // Arrondi à 2 décimales
      ];

      for (const test of precisionTests) {
        const priceData = await global.createValidData('tickets', {
          ticket_code: `PRECISION-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          price: test.price
        });

        const ticket = await ticketsRepository.create(priceData);
        expect(parseFloat(ticket.price)).toBeCloseTo(parseFloat(test.expected), 2);
        
        // Nettoyer
        await ticketsRepository.delete(ticket.id);
      }
    });
  });
});
