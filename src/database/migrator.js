const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { database } = require('../config');

/**
 * Database Migrator
 * 
 * Handles automatic migration execution on application startup.
 * Ensures database schema is always up to date.
 * 
 * Features:
 * - Automatic migration detection
 * - Execution tracking
 * - Rollback support (future)
 * - Checksum validation
 * - Transaction safety
 */
class DatabaseMigrator {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.migrationTable = 'migrations';
  }

  /**
   * Initialize migration system
   * Creates migrations table if it doesn't exist
   */
  async initialize() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) NOT NULL UNIQUE,
          filename VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          checksum VARCHAR(64) NOT NULL
        );
      `;
      
      await database.query(query);
      console.log('✅ Migration system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize migration system:', error);
      throw error;
    }
  }

  /**
   * Get all migration files from migrations directory
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      
      // Filter and sort migration files
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort((a, b) => {
          // Extract version number for proper sorting
          const versionA = a.split('_')[0];
          const versionB = b.split('_')[0];
          return versionA.localeCompare(versionB);
        });

      return migrationFiles;
    } catch (error) {
      console.error('❌ Failed to read migration files:', error);
      throw error;
    }
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations() {
    try {
      const query = 'SELECT version, filename, checksum FROM migrations ORDER BY version';
      const result = await database.query(query);
      
      return result.rows.reduce((acc, row) => {
        acc[row.version] = row;
        return acc;
      }, {});
    } catch (error) {
      console.error('❌ Failed to get executed migrations:', error);
      throw error;
    }
  }

  /**
   * Calculate file checksum
   */
  calculateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Execute a single migration
   */
  async executeMigration(filename) {
    try {
      const filePath = path.join(this.migrationsPath, filename);
      const content = await fs.readFile(filePath, 'utf8');
      const version = filename.split('_')[0];
      const checksum = this.calculateChecksum(content);

      console.log(`🔄 Executing migration: ${filename}`);

      // Execute migration in transaction
      await database.query('BEGIN');
      
      try {
        // Execute migration SQL
        await database.query(content);
        
        // Record migration execution
        const recordQuery = `
          INSERT INTO migrations (version, filename, checksum)
          VALUES ($1, $2, $3)
          ON CONFLICT (version) DO UPDATE SET
            filename = EXCLUDED.filename,
            checksum = EXCLUDED.checksum,
            executed_at = NOW()
        `;
        
        await database.query(recordQuery, [version, filename, checksum]);
        
        await database.query('COMMIT');
        
        console.log(`✅ Migration executed successfully: ${filename}`);
        return true;
      } catch (error) {
        await database.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error(`❌ Failed to execute migration ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Validate migration checksum
   */
  async validateMigration(filename, executedMigration) {
    try {
      const filePath = path.join(this.migrationsPath, filename);
      const content = await fs.readFile(filePath, 'utf8');
      const currentChecksum = this.calculateChecksum(content);
      
      if (executedMigration.checksum !== currentChecksum) {
        throw new Error(
          `Migration ${filename} checksum mismatch. ` +
          `Expected: ${executedMigration.checksum}, Got: ${currentChecksum}`
        );
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Migration validation failed for ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate() {
    try {
      console.log('🚀 Starting database migration process...');
      
      // Initialize migration system
      await this.initialize();
      
      // Get migration files and executed migrations
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      if (migrationFiles.length === 0) {
        console.log('ℹ️ No migration files found');
        return { executed: 0, total: 0 };
      }
      
      console.log(`📁 Found ${migrationFiles.length} migration files`);
      console.log(`📊 ${Object.keys(executedMigrations).length} migrations already executed`);
      
      let executedCount = 0;
      
      // Process each migration file
      for (const filename of migrationFiles) {
        const version = filename.split('_')[0];
        const executedMigration = executedMigrations[version];
        
        if (!executedMigration) {
          // Migration not executed yet
          await this.executeMigration(filename);
          executedCount++;
        } else {
          // Migration already executed, validate checksum
          await this.validateMigration(filename, executedMigration);
          console.log(`ℹ️ Migration already executed: ${filename}`);
        }
      }
      
      console.log(`✅ Migration process completed. Executed: ${executedCount}/${migrationFiles.length}`);
      
      return {
        executed: executedCount,
        total: migrationFiles.length,
        remaining: migrationFiles.length - executedCount
      };
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus() {
    try {
      await this.initialize();
      
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      const status = migrationFiles.map(filename => {
        const version = filename.split('_')[0];
        const executed = executedMigrations[version];
        
        return {
          filename,
          version,
          status: executed ? 'executed' : 'pending',
          executed_at: executed?.executed_at,
          checksum: executed?.checksum
        };
      });
      
      return {
        total: migrationFiles.length,
        executed: Object.keys(executedMigrations).length,
        pending: migrationFiles.length - Object.keys(executedMigrations).length,
        migrations: status
      };
    } catch (error) {
      console.error('❌ Failed to get migration status:', error);
      throw error;
    }
  }

  /**
   * Reset migration table (for development only)
   */
  async reset() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Migration reset is not allowed in production');
    }
    
    try {
      await database.query('DELETE FROM migrations');
      console.log('⚠️ Migration table reset');
    } catch (error) {
      console.error('❌ Failed to reset migration table:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseMigrator();
