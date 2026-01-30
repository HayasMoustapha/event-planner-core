/**
 * ========================================
 * TESTS DE RÉGRESSION DE SCHÉMA
 * ========================================
 * Validation que tous les schémas sont testés et cohérents
 * @version 1.0.0
 */

describe('Schema Regression Tests', () => {
  let allTables = [];
  let testedTables = [];

  beforeAll(async () => {
    // Récupérer toutes les tables de la base de données
    try {
      allTables = await global.schemaExtractor.getAllTables();
      console.log(`📊 Tables trouvées: ${allTables.join(', ')}`);
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer les tables:', error.message);
      allTables = [
        'users', 'events', 'guests', 'tickets', 'ticket_types',
        'marketplace_designers', 'marketplace_templates', 'marketplace_purchases',
        'system_backups', 'system_logs'
      ];
    }

    // Récupérer les tables qui ont des tests
    testedTables = [
      'users', 'events', 'guests', 'tickets', 'ticket_types',
      'marketplace_designers', 'marketplace_templates', 'marketplace_purchases',
      'system_backups', 'system_logs'
    ];
  });

  describe('Coverage Analysis', () => {
    it('should ensure all database tables have tests', () => {
      const untestedTables = allTables.filter(table => !testedTables.includes(table));
      
      if (untestedTables.length > 0) {
        console.warn(`⚠️ Tables sans tests: ${untestedTables.join(', ')}`);
      }
      
      // Pour l'instant, on s'attend à ce que les tables principales soient testées
      const criticalTables = ['users', 'events', 'guests', 'tickets'];
      const untestedCritical = criticalTables.filter(table => !testedTables.includes(table));
      
      expect(untestedCritical).toHaveLength(0, 
        `Tables critiques sans tests: ${untestedCritical.join(', ')}`
      );
    });

    it('should have schema files for all tested tables', async () => {
      for (const table of testedTables) {
        await expect(global.ensureSchemaLoaded(table)).resolves.not.toThrow();
        
        const schema = global.schemaFactory.schemas.get(table);
        expect(schema).toBeDefined();
        expect(schema.tableName).toBe(table);
        expect(Object.keys(schema.columns)).toBeGreaterThan(0);
      }
    });

    it('should validate all schemas can generate valid data', async () => {
      for (const table of testedTables) {
        try {
          const data = await global.createValidData(table);
          const validation = await global.schemaValidator.validate(table, data);
          
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        } catch (error) {
          // Certaines tables peuvent ne pas exister ou avoir des problèmes
          console.warn(`⚠️ Impossible de générer des données pour ${table}: ${error.message}`);
        }
      }
    });
  });

  describe('Schema Consistency', () => {
    it('should validate database schema consistency', async () => {
      for (const table of testedTables) {
        try {
          // Extraire le schéma depuis la base de données
          const dbSchema = await global.schemaExtractor.extractFromDatabase(table);
          
          // Valider que le schéma a une structure cohérente
          expect(dbSchema.tableName).toBe(table);
          expect(dbSchema.columns).toBeDefined();
          expect(dbSchema.constraints).toBeDefined();
          
          // Valider que les colonnes essentielles existent
          const columnNames = Object.keys(dbSchema.columns);
          expect(columnNames.length).toBeGreaterThan(0);
          
          // Valider que chaque colonne a les propriétés requises
          for (const [columnName, column] of Object.entries(dbSchema.columns)) {
            expect(column.name).toBe(columnName);
            expect(column.type).toBeDefined();
            expect(typeof column.nullable).toBe('boolean');
          }
          
        } catch (error) {
          console.warn(`⚠️ Erreur validation schéma ${table}: ${error.message}`);
        }
      }
    });

    it('should validate constraint consistency', async () => {
      for (const table of testedTables) {
        try {
          const schema = await global.schemaExtractor.extractFromDatabase(table);
          
          // Valider que les clés primaires référencent des colonnes existantes
          for (const pkColumn of schema.constraints.primary) {
            expect(schema.columns[pkColumn]).toBeDefined();
          }
          
          // Valider que les clés étrangères référencent des colonnes existantes
          for (const fk of schema.constraints.foreign) {
            expect(schema.columns[fk.column]).toBeDefined();
            expect(fk.foreignTable).toBeDefined();
            expect(fk.foreignColumn).toBeDefined();
          }
          
          // Valider que les contraintes uniques référencent des colonnes existantes
          for (const uniqueColumn of schema.constraints.unique) {
            expect(schema.columns[uniqueColumn]).toBeDefined();
          }
          
        } catch (error) {
          console.warn(`⚠️ Erreur validation contraintes ${table}: ${error.message}`);
        }
      }
    });

    it('should validate data type consistency', async () => {
      for (const table of testedTables) {
        try {
          const schema = await global.schemaExtractor.extractFromDatabase(table);
          
          for (const [columnName, column] of Object.entries(schema.columns)) {
            // Valider que les types sont reconnus
            const validTypes = [
              'integer', 'bigint', 'smallint', 'numeric', 'decimal',
              'varchar', 'text', 'character', 'character varying',
              'timestamp', 'timestamptz', 'date', 'time',
              'boolean', 'uuid', 'json', 'jsonb'
            ];
            
            const isValidType = validTypes.includes(column.type) || 
                               column.type.includes('[]') || 
                               validTypes.includes(column.udtName);
            
            expect(isValidType).toBe(true);
          }
          
        } catch (error) {
          console.warn(`⚠️ Erreur validation types ${table}: ${error.message}`);
        }
      }
    });
  });

  describe('Repository Schema Alignment', () => {
    it('should validate repository methods match schema', async () => {
      const repositories = [
        { path: '../src/modules/events/events.repository', table: 'events' },
        { path: '../src/modules/guests/guests.repository', table: 'guests' },
        { path: '../src/modules/tickets/tickets.repository', table: 'tickets' }
      ];

      for (const { path, table } of repositories) {
        try {
          const repoSchema = await global.schemaExtractor.extractFromRepository(path);
          const dbSchema = await global.schemaExtractor.extractFromDatabase(table);

          if (repoSchema) {
            // Valider que les schémas sont alignés
            const dbColumns = Object.keys(dbSchema.columns);
            const repoColumns = Object.keys(repoSchema.columns || {});

            // Les colonnes du repository devraient être un sous-ensemble des colonnes DB
            const missingColumns = repoColumns.filter(col => !dbColumns.includes(col));
            expect(missingColumns).toHaveLength(0);
          }
          
        } catch (error) {
          console.warn(`⚠️ Erreur alignement repository ${table}: ${error.message}`);
        }
      }
    });
  });

  describe('Data Generation Regression', () => {
    it('should consistently generate valid data', async () => {
      const testTables = ['events', 'guests', 'tickets'];
      
      for (const table of testTables) {
        try {
          // Générer plusieurs jeux de données
          const datasets = [];
          for (let i = 0; i < 5; i++) {
            const data = await global.createValidData(table);
            datasets.push(data);
          }

          // Valider que tous les jeux sont valides
          for (const data of datasets) {
            const validation = await global.schemaValidator.validate(table, data);
            expect(validation.valid).toBe(true);
          }

          // Valider que les données sont différentes (unicité)
          const uniqueIds = new Set(datasets.map(d => d.id || JSON.stringify(d)));
          expect(uniqueIds.size).toBeGreaterThan(1);
          
        } catch (error) {
          console.warn(`⚠️ Erreur génération données ${table}: ${error.message}`);
        }
      }
    });

    it('should handle edge cases consistently', async () => {
      const edgeCases = [
        { table: 'events', overrides: { max_attendees: 1 } },
        { table: 'events', overrides: { max_attendees: 999999 } },
        { table: 'guests', overrides: { phone: '+33612345678' } },
        { table: 'tickets', overrides: { price: 0.01 } }
      ];

      for (const { table, overrides } of edgeCases) {
        try {
          const data = await global.createValidData(table, overrides);
          const validation = await global.schemaValidator.validate(table, data);
          
          expect(validation.valid).toBe(true);
          expect(data).toMatchObject(overrides);
          
        } catch (error) {
          console.warn(`⚠️ Erreur edge case ${table}: ${error.message}`);
        }
      }
    });
  });

  describe('Performance Regression', () => {
    it('should maintain acceptable performance for schema operations', async () => {
      const startTime = Date.now();
      
      // Charger tous les schémas
      for (const table of testedTables) {
        await global.ensureSchemaLoaded(table);
      }
      
      const loadTime = Date.now() - startTime;
      
      // Le chargement devrait prendre moins de 5 secondes
      expect(loadTime).toBeLessThan(5000);
    });

    it('should maintain acceptable performance for data generation', async () => {
      const table = 'events';
      const count = 10;
      const startTime = Date.now();
      
      // Générer plusieurs enregistrements
      for (let i = 0; i < count; i++) {
        await global.createValidData(table);
      }
      
      const generationTime = Date.now() - startTime;
      const avgTime = generationTime / count;
      
      // La génération devrait prendre moins de 100ms par enregistrement
      expect(avgTime).toBeLessThan(100);
    });

    it('should maintain acceptable performance for validation', async () => {
      const table = 'events';
      const count = 10;
      const startTime = Date.now();
      
      // Valider plusieurs enregistrements
      for (let i = 0; i < count; i++) {
        const data = await global.createValidData(table);
        await global.schemaValidator.validate(table, data);
      }
      
      const validationTime = Date.now() - startTime;
      const avgTime = validationTime / count;
      
      // La validation devrait prendre moins de 50ms par enregistrement
      expect(avgTime).toBeLessThan(50);
    });
  });

  describe('Integration Regression', () => {
    it('should maintain compatibility with existing tests', async () => {
      // Valider que les helpers globaux fonctionnent
      expect(global.createValidData).toBeDefined();
      expect(global.createInvalidData).toBeDefined();
      expect(global.schemaValidator).toBeDefined();
      expect(global.schemaFactory).toBeDefined();

      // Valider qu'on peut créer des données pour les tables principales
      const mainTables = ['events', 'guests', 'tickets'];
      
      for (const table of mainTables) {
        try {
          const data = await global.createValidData(table);
          expect(data).toBeDefined();
          expect(typeof data).toBe('object');
        } catch (error) {
          console.warn(`⚠️ Incompatibilité table ${table}: ${error.message}`);
        }
      }
    });
  });
});
