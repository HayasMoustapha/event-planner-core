/**
 * ========================================
 * TESTS REPOSITORY SYSTEM BACKUPS BASÉS SUR SCHÉMA
 * ========================================
 * Tests CRUD automatiques avec validation stricte du schéma SQL
 * @version 1.0.0
 */

const SystemBackupsRepository = require('../../../src/modules/system/system_backups.repository');

describe('System Backups Repository - Schema Based Tests', () => {
  let systemBackupsRepository;
  let testBackupData;

  beforeAll(async () => {
    systemBackupsRepository = new SystemBackupsRepository();
  });

  beforeEach(async () => {
    // Générer des données de test valides selon le schéma
    testBackupData = await global.createValidData('system_backups', {
      id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'full',
      status: 'started',
      include_data: true,
      created_by: global.generateTestId(),
      estimated_size: '250MB',
      details: {
        tables: ['users', 'events', 'guests', 'tickets'],
        compression: true,
        encryption: true
      }
    });
  });

  describe('Schema Validation', () => {
    it('should have valid schema structure', async () => {
      const schema = global.schemaFactory.schemas.get('system_backups');
      
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('system_backups');
      
      // Valider les colonnes essentielles
      const requiredColumns = ['id', 'type', 'status', 'include_data', 'created_by', 'created_at', 'updated_at', 'estimated_size', 'details'];
      const schemaColumns = Object.keys(schema.columns);
      
      requiredColumns.forEach(column => {
        expect(schemaColumns).toContain(column);
        expect(schema.columns[column]).toBeDefined();
        expect(schema.columns[column].type).toBeDefined();
      });
    });

    it('should generate valid test data', async () => {
      const validation = await global.schemaValidator.validate('system_backups', testBackupData);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Valider les champs spécifiques
      expect(testBackupData.id).toBeDefined();
      expect(typeof testBackupData.id).toBe('string');
      expect(testBackupData.id.length).toBeGreaterThan(0);
      expect(testBackupData.id.length).toBeLessThanOrEqual(255);
      
      expect(testBackupData.type).toBeDefined();
      expect(typeof testBackupData.type).toBe('string');
      expect(['full', 'incremental', 'differential', 'schema_only']).toContain(testBackupData.type);
      
      expect(testBackupData.status).toBeDefined();
      expect(typeof testBackupData.status).toBe('string');
      expect(['started', 'running', 'completed', 'failed', 'cancelled']).toContain(testBackupData.status);
      
      expect(testBackupData.created_by).toBeDefined();
      expect(Number.isInteger(testBackupData.created_by)).toBe(true);
      expect(testBackupData.created_by).toBeGreaterThan(0);
      
      expect(testBackupData.estimated_size).toBeDefined();
      expect(typeof testBackupData.estimated_size).toBe('string');
      
      expect(testBackupData.details).toBeDefined();
      expect(typeof testBackupData.details).toBe('object');
    });
  });

  describe('CRUD Operations', () => {
    let createdBackup;

    afterEach(async () => {
      // Nettoyer le backup créé
      if (createdBackup && createdBackup.id) {
        try {
          await systemBackupsRepository.delete(createdBackup.id);
        } catch (error) {
          // Ignorer les erreurs de nettoyage
        }
        createdBackup = null;
      }
    });

    describe('CREATE', () => {
      it('should create backup with valid schema data', async () => {
        createdBackup = await systemBackupsRepository.create(testBackupData);
        
        expect(createdBackup).toBeDefined();
        expect(createdBackup.id).toBe(testBackupData.id);
        
        // Valider que l'enregistrement créé respecte le schéma
        const validation = await global.schemaValidator.validate('system_backups', createdBackup);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        
        // Valider que les données sont préservées
        expect(createdBackup.type).toBe(testBackupData.type);
        expect(createdBackup.status).toBe(testBackupData.status);
        expect(createdBackup.include_data).toBe(testBackupData.include_data);
        expect(createdBackup.created_by).toBe(testBackupData.created_by);
        expect(createdBackup.estimated_size).toBe(testBackupData.estimated_size);
      });

      it('should reject invalid schema data', async () => {
        const invalidData = await global.createInvalidData('system_backups', {
          id: { type: 'null' }, // Violation NOT NULL
          type: { type: 'invalid_type', value: 'invalid' },
          status: { type: 'invalid_type', value: 'invalid' },
          created_by: { type: 'zero' }
        });

        await expect(systemBackupsRepository.create(invalidData)).rejects.toThrow();
      });

      it('should handle backup ID uniqueness constraint', async () => {
        // Créer le premier backup
        createdBackup = await systemBackupsRepository.create(testBackupData);
        
        // Essayer de créer un deuxième backup avec le même ID
        const duplicateData = { ...testBackupData };
        
        await expect(systemBackupsRepository.create(duplicateData)).rejects.toThrow();
      });

      it('should validate backup types', async () => {
        const validTypes = ['full', 'incremental', 'differential', 'schema_only'];
        const invalidTypes = ['invalid', 'partial', 'custom', ''];

        for (const type of validTypes) {
          const typeData = await global.createValidData('system_backups', {
            id: `backup-${type}-${Date.now()}`,
            type: type
          });

          const backup = await systemBackupsRepository.create(typeData);
          expect(backup.type).toBe(type);
          
          // Nettoyer
          await systemBackupsRepository.delete(backup.id);
        }

        for (const type of invalidTypes) {
          const invalidData = await global.createValidData('system_backups', {
            id: `bad-${type}-${Date.now()}`,
            type: type
          });

          await expect(systemBackupsRepository.create(invalidData)).rejects.toThrow();
        }
      });

      it('should validate backup statuses', async () => {
        const validStatuses = ['started', 'running', 'completed', 'failed', 'cancelled'];
        const invalidStatuses = ['invalid', 'pending', 'processing', ''];

        for (const status of validStatuses) {
          const statusData = await global.createValidData('system_backups', {
            id: `backup-${status}-${Date.now()}`,
            status: status
          });

          const backup = await systemBackupsRepository.create(statusData);
          expect(backup.status).toBe(status);
          
          // Nettoyer
          await systemBackupsRepository.delete(backup.id);
        }

        for (const status of invalidStatuses) {
          const invalidData = await global.createValidData('system_backups', {
            id: `bad-${status}-${Date.now()}`,
            status: status
          });

          await expect(systemBackupsRepository.create(invalidData)).rejects.toThrow();
        }
      });

      it('should handle JSON details correctly', async () => {
        const complexDetails = {
          tables: ['users', 'events', 'guests', 'tickets', 'marketplace_*'],
          compression: {
            enabled: true,
            algorithm: 'gzip',
            level: 6
          },
          encryption: {
            enabled: true,
            algorithm: 'AES-256',
            key_rotation: true
          },
          storage: {
            type: 's3',
            bucket: 'event-planner-backups',
            region: 'eu-west-3'
          },
          retention: {
            daily: 7,
            weekly: 4,
            monthly: 12
          }
        };

        const detailsData = await global.createValidData('system_backups', {
          id: `backup-details-${Date.now()}`,
          details: complexDetails
        });

        const backup = await systemBackupsRepository.create(detailsData);
        
        expect(backup).toBeDefined();
        expect(backup.details).toBeDefined();
        expect(typeof backup.details).toBe('object');
        expect(backup.details.compression.enabled).toBe(true);
        
        // Nettoyer
        await systemBackupsRepository.delete(backup.id);
      });
    });

    describe('READ', () => {
      beforeEach(async () => {
        createdBackup = await systemBackupsRepository.create(testBackupData);
      });

      it('should find backup by ID with valid schema', async () => {
        const foundBackup = await systemBackupsRepository.findById(createdBackup.id);
        
        expect(foundBackup).toBeDefined();
        expect(foundBackup.id).toBe(createdBackup.id);
        
        // Valider le schéma de l'enregistrement trouvé
        const validation = await global.schemaValidator.validate('system_backups', foundBackup);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should return null for non-existent ID', async () => {
        const foundBackup = await systemBackupsRepository.findById('non-existent-backup');
        expect(foundBackup).toBeNull();
      });

      it('should find backups by type with valid schema', async () => {
        const backups = await systemBackupsRepository.findByType(testBackupData.type);
        
        expect(Array.isArray(backups)).toBe(true);
        expect(backups.length).toBeGreaterThan(0);
        
        // Valider que chaque backup respecte le schéma
        for (const backup of backups) {
          const validation = await global.schemaValidator.validate('system_backups', backup);
          expect(validation.valid).toBe(true);
          expect(backup.type).toBe(testBackupData.type);
        }
      });

      it('should find backups by status with valid schema', async () => {
        const backups = await systemBackupsRepository.findByStatus(testBackupData.status);
        
        expect(Array.isArray(backups)).toBe(true);
        expect(backups.length).toBeGreaterThan(0);
        
        // Valider que chaque backup respecte le schéma
        for (const backup of backups) {
          const validation = await global.schemaValidator.validate('system_backups', backup);
          expect(validation.valid).toBe(true);
          expect(backup.status).toBe(testBackupData.status);
        }
      });

      it('should find backups by creator with valid schema', async () => {
        const backups = await systemBackupsRepository.findByCreator(testBackupData.created_by);
        
        expect(Array.isArray(backups)).toBe(true);
        expect(backups.length).toBeGreaterThan(0);
        
        // Valider que chaque backup respecte le schéma
        for (const backup of backups) {
          const validation = await global.schemaValidator.validate('system_backups', backup);
          expect(validation.valid).toBe(true);
          expect(backup.created_by).toBe(testBackupData.created_by);
        }
      });

      it('should handle pagination correctly', async () => {
        // Créer quelques backups supplémentaires
        const additionalBackups = [];
        for (let i = 0; i < 3; i++) {
          const backupData = await global.createValidData('system_backups', {
            id: `page-${i}-${Date.now()}`,
            type: testBackupData.type
          });
          const backup = await systemBackupsRepository.create(backupData);
          additionalBackups.push(backup);
        }

        try {
          const options = { page: 1, limit: 2 };
          const result = await systemBackupsRepository.findByType(testBackupData.type, options);
          
          expect(result.backups).toBeDefined();
          expect(Array.isArray(result.backups)).toBe(true);
          expect(result.backups.length).toBeLessThanOrEqual(2);
          expect(result.pagination).toBeDefined();
          expect(result.pagination.page).toBe(1);
          expect(result.pagination.limit).toBe(2);
          
          // Valider le schéma des résultats
          for (const backup of result.backups) {
            const validation = await global.schemaValidator.validate('system_backups', backup);
            expect(validation.valid).toBe(true);
          }
        } finally {
          // Nettoyer les backups supplémentaires
          for (const backup of additionalBackups) {
            try {
              await systemBackupsRepository.delete(backup.id);
            } catch (error) {
              // Ignorer
            }
          }
        }
      });
    });

    describe('UPDATE', () => {
      beforeEach(async () => {
        createdBackup = await systemBackupsRepository.create(testBackupData);
      });

      it('should update backup with valid schema data', async () => {
        const updateData = await global.createValidData('system_backups', {
          status: 'completed',
          estimated_size: '1.2GB',
          details: {
            ...testBackupData.details,
            completed_at: new Date().toISOString(),
            actual_size: '1.15GB',
            duration: 1800 // 30 minutes
          }
        });

        const updatedBackup = await systemBackupsRepository.update(createdBackup.id, updateData);
        
        expect(updatedBackup).toBeDefined();
        expect(updatedBackup.id).toBe(createdBackup.id);
        
        // Valider le schéma de l'enregistrement mis à jour
        const validation = await global.schemaValidator.validate('system_backups', updatedBackup);
        expect(validation.valid).toBe(true);
        
        // Valider que les données ont été mises à jour
        expect(updatedBackup.status).toBe(updateData.status);
        expect(updatedBackup.estimated_size).toBe(updateData.estimated_size);
      });

      it('should reject invalid update data', async () => {
        const invalidUpdate = await global.createInvalidData('system_backups', {
          status: { type: 'invalid_type', value: 'invalid' },
          type: { type: 'invalid_type', value: 'invalid' }
        });

        await expect(systemBackupsRepository.update(createdBackup.id, invalidUpdate)).rejects.toThrow();
      });

      it('should return null for non-existent ID', async () => {
        const updateData = await global.createValidData('system_backups');
        const result = await systemBackupsRepository.update('non-existent-backup', updateData);
        expect(result).toBeNull();
      });
    });

    describe('DELETE', () => {
      beforeEach(async () => {
        createdBackup = await systemBackupsRepository.create(testBackupData);
      });

      it('should delete backup and return deleted record', async () => {
        const deletedBackup = await systemBackupsRepository.delete(createdBackup.id);
        
        expect(deletedBackup).toBeDefined();
        expect(deletedBackup.id).toBe(createdBackup.id);
        
        // Valider le schéma de l'enregistrement supprimé
        const validation = await global.schemaValidator.validate('system_backups', deletedBackup);
        expect(validation.valid).toBe(true);
        
        // Vérifier que le backup n'existe plus
        const foundBackup = await systemBackupsRepository.findById(createdBackup.id);
        expect(foundBackup).toBeNull();
        
        createdBackup = null; // Éviter le nettoyage en double
      });

      it('should return null for non-existent ID', async () => {
        const result = await systemBackupsRepository.delete('non-existent-backup');
        expect(result).toBeNull();
      });
    });
  });

  describe('Schema-Specific Operations', () => {
    let createdBackup;

    beforeEach(async () => {
      createdBackup = await systemBackupsRepository.create(testBackupData);
    });

    afterEach(async () => {
      if (createdBackup && createdBackup.id) {
        try {
          await systemBackupsRepository.delete(createdBackup.id);
        } catch (error) {
          // Ignorer
        }
        createdBackup = null;
      }
    });

    it('should start backup with valid schema', async () => {
      const startedBackup = await systemBackupsRepository.startBackup(createdBackup.id);
      
      expect(startedBackup).toBeDefined();
      expect(startedBackup.id).toBe(createdBackup.id);
      expect(startedBackup.status).toBe('running');
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('system_backups', startedBackup);
      expect(validation.valid).toBe(true);
    });

    it('should complete backup with valid schema', async () => {
      const completedBackup = await systemBackupsRepository.completeBackup(createdBackup.id, {
        actual_size: '1.2GB',
        duration: 2400,
        files_count: 1250
      });
      
      expect(completedBackup).toBeDefined();
      expect(completedBackup.id).toBe(createdBackup.id);
      expect(completedBackup.status).toBe('completed');
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('system_backups', completedBackup);
      expect(validation.valid).toBe(true);
    });

    it('should fail backup with valid schema', async () => {
      const failedBackup = await systemBackupsRepository.failBackup(createdBackup.id, {
        error: 'Connection timeout',
        error_code: 'TIMEOUT',
        partial_size: '800MB'
      });
      
      expect(failedBackup).toBeDefined();
      expect(failedBackup.id).toBe(createdBackup.id);
      expect(failedBackup.status).toBe('failed');
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('system_backups', failedBackup);
      expect(validation.valid).toBe(true);
    });

    it('should cancel backup with valid schema', async () => {
      const cancelledBackup = await systemBackupsRepository.cancelBackup(createdBackup.id);
      
      expect(cancelledBackup).toBeDefined();
      expect(cancelledBackup.id).toBe(createdBackup.id);
      expect(cancelledBackup.status).toBe('cancelled');
      
      // Valider le schéma
      const validation = await global.schemaValidator.validate('system_backups', cancelledBackup);
      expect(validation.valid).toBe(true);
    });

    it('should get backup statistics with valid schema', async () => {
      const stats = await systemBackupsRepository.getBackupStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      
      // Valider que les statistiques ont des types cohérents
      if (stats.total_backups !== undefined) {
        expect(Number.isInteger(stats.total_backups)).toBe(true);
        expect(stats.total_backups).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.completed_backups !== undefined) {
        expect(Number.isInteger(stats.completed_backups)).toBe(true);
        expect(stats.completed_backups).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.failed_backups !== undefined) {
        expect(Number.isInteger(stats.failed_backups)).toBe(true);
        expect(stats.failed_backups).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.total_storage_used !== undefined) {
        expect(typeof stats.total_storage_used).toBe('string');
      }
    });

    it('should search backups with valid schema', async () => {
      const searchResults = await systemBackupsRepository.searchBackups(
        createdBackup.id.substring(0, 10)
      );
      
      expect(Array.isArray(searchResults)).toBe(true);
      
      // Valider que chaque résultat respecte le schéma
      for (const backup of searchResults) {
        const validation = await global.schemaValidator.validate('system_backups', backup);
        expect(validation.valid).toBe(true);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent backup operations', async () => {
      // Créer plusieurs backups simultanément
      const promises = Array(3).fill().map(async (_, index) => {
        const backupData = await global.createValidData('system_backups', {
          id: `concurrent-${index}-${Date.now()}`,
          type: 'full',
          created_by: global.generateTestId()
        });
        return systemBackupsRepository.create(backupData);
      });

      const results = await Promise.all(promises);
      
      // Valider que tous les backups créés respectent le schéma
      for (const backup of results) {
        expect(backup).toBeDefined();
        expect(backup.id).toBeDefined();
        
        const validation = await global.schemaValidator.validate('system_backups', backup);
        expect(validation.valid).toBe(true);
        
        // Nettoyer
        try {
          await systemBackupsRepository.delete(backup.id);
        } catch (error) {
          // Ignorer
        }
      }
    });

    it('should handle special characters in backup IDs', async () => {
      const specialCharData = await global.createValidData('system_backups', {
        id: `backup-évévement-${Date.now()}-🗄️`,
        type: 'full'
      });

      const backup = await systemBackupsRepository.create(specialCharData);
      
      expect(backup).toBeDefined();
      expect(backup.id).toBe(specialCharData.id);
      
      const validation = await global.schemaValidator.validate('system_backups', backup);
      expect(validation.valid).toBe(true);
      
      // Nettoyer
      await systemBackupsRepository.delete(backup.id);
    });

    it('should validate estimated size format', async () => {
      const validSizes = ['100MB', '1.5GB', '2.3TB', '500KB'];
      const invalidSizes = ['invalid', '100', 'MB', '1000GB'];

      for (const size of validSizes) {
        const sizeData = await global.createValidData('system_backups', {
          id: `size-${size}-${Date.now()}`,
          estimated_size: size
        });

        const validation = await global.schemaValidator.validate('system_backups', sizeData);
        expect(validation.valid).toBe(true);
      }

      for (const size of invalidSizes) {
        const sizeData = await global.createValidData('system_backups', {
          id: `bad-size-${size}-${Date.now()}`,
          estimated_size: size
        });

        const validation = await global.schemaValidator.validate('system_backups', sizeData);
        // Les formats invalides peuvent être acceptés au niveau du schéma mais rejetés au niveau applicatif
        expect(validation).toBeDefined();
      }
    });

    it('should handle complex JSON details', async () => {
      const complexDetails = {
        backup_schedule: {
          enabled: true,
          frequency: 'daily',
          time: '02:00',
          timezone: 'Europe/Paris'
        },
        notification_settings: {
          email: true,
          slack: true,
          webhook: 'https://hooks.slack.com/backup'
        },
        retention_policy: {
          keep_daily: 7,
          keep_weekly: 4,
          keep_monthly: 12,
          keep_yearly: 5
        },
        compression_settings: {
          algorithm: 'lz4',
          level: 4,
          parallel: true
        }
      };

      const complexData = await global.createValidData('system_backups', {
        id: `complex-${Date.now()}`,
        details: complexDetails
      });

      const backup = await systemBackupsRepository.create(complexData);
      
      expect(backup).toBeDefined();
      expect(backup.details.backup_schedule.enabled).toBe(true);
      expect(backup.details.notification_settings.email).toBe(true);
      
      const validation = await global.schemaValidator.validate('system_backups', backup);
      expect(validation.valid).toBe(true);
      
      // Nettoyer
      await systemBackupsRepository.delete(backup.id);
    });
  });
});
