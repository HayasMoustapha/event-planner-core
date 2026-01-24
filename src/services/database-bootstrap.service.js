const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { connection } = require('../config/database');

/**
 * Service de Bootstrap de Base de Données
 * 
 * CONTRAT PUBLIC:
 * ================
 * Méthode obligatoire: initialize()
 * - Type: async function
 * - Rôle: Initialise la base de données et les migrations
 * - Retour: Promise<Object> Résultat du bootstrap
 * - Erreur: Lance une exception si échec critique
 * 
 * Méthodes optionnelles: verify(), shutdown()
 * - Type: async function
 * - Rôle: Validation et arrêt contrôlé
 * 
 * Export: module.exports = new DatabaseBootstrap()
 * 
 * INVARIANTS:
 * - initialize() est TOUJOURS disponible
 * - initialize() est idempotente
 * - Toute erreur critique est propagée (pas masquée)
 */
class DatabaseBootstrap {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../../database/migrations');
    this.seedsPath = path.join(__dirname, '../../database/seeds');
    this.bootstrapPath = path.join(__dirname, '../../database/bootstrap');
    this.lockId = 12345; // ID unique pour le verrou PostgreSQL
  }

  /**
   * Initialise la base de données (méthode OBLIGATOIRE)
   * @returns {Promise<Object>} Résultat du bootstrap
   * @throws {Error} Si échec critique d'initialisation
   */
  async initialize() {
    let lockAcquired = false;
    
    try {
      // Vérification de sécurité : le bootstrap doit être explicitement activé
      if (process.env.DB_AUTO_BOOTSTRAP !== 'true') {
        console.log('⚠️  Bootstrap automatique désactivé (DB_AUTO_BOOTSTRAP != true)');
        return { success: true, message: 'Bootstrap désactivé', actions: [] };
      }

      console.log('🚀 Démarrage du bootstrap de la base de données...');
      const startTime = Date.now();
      const actions = [];

      // Phase 1: Connexion et verrouillage (avec garantie de libération)
      await this.acquireLock();
      lockAcquired = true;
      actions.push('Verrouillage de la base de données');

      // Phase 2: Création de la table de contrôle
      await this.createSchemaMigrationsTable();
      actions.push('Création de la table schema_migrations');

      // Phase 3: Application des migrations
      const migrationsApplied = await this.applyMigrations();
      actions.push(`Application de ${migrationsApplied.length} migration(s)`);

      // Phase 4: Exécution des seeds si nécessaire
      const seedsExecuted = await this.executeSeeds();
      actions.push(`Exécution de ${seedsExecuted.length} seed(s)`);

      // Phase 5: Validation finale
      await this.validateInstallation();
      actions.push('Validation de l\'installation');

      // Phase 6: Garantir les permissions super-admin
      await this.ensureSuperAdminPermissions();
      actions.push('Garantie des permissions super-admin');

      // Libération du verrou
      await this.releaseLock();
      lockAcquired = false;

      const duration = Date.now() - startTime;
      console.log(`✅ Bootstrap terminé en ${duration}ms`);

      return {
        success: true,
        message: 'Bootstrap réussi',
        duration,
        actions,
        migrationsApplied: migrationsApplied.length,
        seedsExecuted: seedsExecuted.length
      };

    } catch (error) {
      // GARANTIE: Libération du verrou même en cas d'erreur
      if (lockAcquired) {
        try {
          await this.releaseLock();
          console.log('🔓 Verrou libéré après erreur');
        } catch (lockError) {
          console.error('❌ Erreur lors de la libération du verrou:', lockError.message);
        }
      }
      
      console.error('❌ Erreur lors du bootstrap:', error.message);
      throw error;
    }
  }

  /**
   * Acquiert un verrou PostgreSQL pour éviter les exécutions simultanées
   */
  async acquireLock() {
    const client = await connection.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT pg_advisory_lock($1)', [this.lockId]);
      console.log('🔒 Verrou de bootstrap acquis');
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Libère le verrou PostgreSQL
   */
  async releaseLock() {
    const client = await connection.connect();
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [this.lockId]);
      console.log('🔓 Verrou de bootstrap libéré');
    } finally {
      client.release();
    }
  }

  /**
   * Crée la base de données et la table de contrôle schema_migrations si elles n'existent pas
   */
  async createSchemaMigrationsTable() {
    // D'abord, créer la base de données si elle n'existe pas
    await this.ensureDatabaseExists();
    
    // Ensuite, créer la table schema_migrations
    const client = await connection.connect();
    try {
      const bootstrapSql = await fs.readFile(
        path.join(this.bootstrapPath, '001_create_schema_migrations.sql'),
        'utf8'
      );
      await client.query(bootstrapSql);
      console.log('✅ Table schema_migrations vérifiée/créée');
    } finally {
      client.release();
    }
  }

  /**
   * Crée la base de données event_planner_auth si elle n'existe pas
   */
  async ensureDatabaseExists() {
    const { Pool } = require('pg');
    
    // Connexion à PostgreSQL sans spécifier de base de données
    // Utilise les variables d'environnement directement pour éviter la connexion à la base inexistante
    const tempConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'postgres' // Base de données par défaut PostgreSQL
    };
    
    const tempPool = new Pool(tempConfig);
    const tempClient = await tempPool.connect();
    
    try {
      const databaseName = process.env.DB_NAME || 'event_planner_auth';
      
      // Vérifier si la base de données existe
      const checkQuery = `
        SELECT 1 FROM pg_database 
        WHERE datname = '${databaseName}'
      `;
      const result = await tempClient.query(checkQuery);
      
      if (result.rows.length === 0) {
        // Créer la base de données
        const createQuery = `CREATE DATABASE "${databaseName}"`;
        await tempClient.query(createQuery);
        console.log(`✅ Base de données ${databaseName} créée avec succès`);
      } else {
        console.log(`ℹ️  La base de données ${databaseName} existe déjà`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création de la base de données:', error.message);
      throw error;
    } finally {
      tempClient.release();
      await tempPool.end();
    }
  }

  /**
   * Applique les migrations en attente (TRANSACTION PAR MIGRATION)
   */
  async applyMigrations() {
    const appliedMigrations = [];
    
    // Récupérer les fichiers de migration dans l'ordre
    const migrationFiles = await this.getMigrationFiles();
    
    for (const file of migrationFiles) {
      const migrationName = path.basename(file);
      
      // Vérifier si la migration est déjà appliquée
      const isApplied = await this.isMigrationApplied(migrationName);
      if (isApplied) {
        console.log(`⏭️  Migration ${migrationName} déjà appliquée`);
        continue;
      }

      // Appliquer la migration avec sa propre transaction
      const applied = await this.applySingleMigration(file, migrationName);
      if (applied) {
        appliedMigrations.push(migrationName);
      }
    }

    return appliedMigrations;
  }

  /**
   * Applique une seule migration dans sa propre transaction
   */
  async applySingleMigration(file, migrationName) {
    const client = await connection.connect();
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Début de la migration ${migrationName}...`);
      await client.query('BEGIN');
      
      const migrationSql = await fs.readFile(file, 'utf8');
      console.log(`📝 Fichier ${migrationName} lu (${migrationSql.length} caractères)`);
      
      await client.query(migrationSql);
      console.log(`⚡ SQL exécuté pour ${migrationName}`);
      
      // Calculer le checksum et enregistrer la migration
      const stats = await fs.stat(file);
      const checksum = await this.calculateFileChecksum(file);
      
      await client.query(`
        INSERT INTO schema_migrations (migration_name, checksum, file_size, execution_time_ms)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (migration_name) DO NOTHING
      `, [migrationName, checksum, stats.size, Date.now() - startTime]);
      
      await client.query('COMMIT');
      const duration = Date.now() - startTime;
      console.log(`✅ Migration ${migrationName} appliquée en ${duration}ms`);
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Erreur lors de la migration ${migrationName}:`, error.message);
      console.error(`🔍 Détails: Fichier=${file}, Durée=${Date.now() - startTime}ms`);
      throw new Error(`Erreur lors de la migration ${migrationName}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Exécute tous les seeds automatiquement
   * Garantit l'exécution même en cas d'erreurs partielles
   */
  async executeSeeds() {
    console.log('🌱 Démarrage de l\'exécution automatique des seeds...');
    
    // Vérifier si les seeds sont nécessaires
    const needsSeeds = await this.needsSeeds();
    
    if (!needsSeeds) {
      console.log('✅ Base de données déjà complète - vérification finale...');
      
      // Vérification supplémentaire pour s'assurer que tout est en ordre
      await this.verifySeedIntegrity();
      
      console.log('✅ Seeds non nécessaires - base de données complète');
      return [];
    }

    console.log('🌱 Exécution des seeds nécessaire - base de données incomplète');
    const executedSeeds = [];
    const failedSeeds = [];
    
    // Ordre strict d'exécution des seeds
    const seedOrder = [
      'roles.seed.sql',
      'permissions.seed.sql', 
      'menus.seed.sql',
      'admin.seed.sql'
    ];

    for (const seedFile of seedOrder) {
      const seedPath = path.join(this.seedsPath, 'seeds', seedFile);
      
      try {
        await fs.access(seedPath);
      } catch {
        console.warn(`⚠️  Fichier seed non trouvé: ${seedFile}`);
        failedSeeds.push(seedFile);
        continue;
      }

      // Exécuter chaque seed dans sa propre transaction
      // Ne pas arrêter en cas d'erreur, continuer avec les autres
      try {
        const executed = await this.executeSingleSeed(seedPath, seedFile);
        if (executed) {
          executedSeeds.push(seedFile);
        }
      } catch (seedError) {
        console.error(`❌ Erreur critique du seed ${seedFile}:`, seedError.message);
        failedSeeds.push(seedFile);
        
        // Continuer avec les autres seeds même si celui-ci échoue
        console.log(`🔄 Continuation avec le seed suivant...`);
      }
    }

    // Rapport final d'exécution
    console.log(`📊 Rapport d\'exécution des seeds:`);
    console.log(`   ✅ Réussis: ${executedSeeds.length}`);
    console.log(`   ❌ Échoués: ${failedSeeds.length}`);
    
    if (executedSeeds.length > 0) {
      console.log(`✅ Seeds appliqués: ${executedSeeds.join(', ')}`);
    }
    
    if (failedSeeds.length > 0) {
      console.log(`⚠️  Seeds échoués: ${failedSeeds.join(', ')}`);
      console.log('🔧 Vérification manuelle recommandée pour les seeds échoués');
    }

    // Validation finale même en cas d'échecs partiels
    try {
      await this.verifySeedIntegrity();
      console.log('✅ Vérification d\'intégrité des seeds terminée');
    } catch (validationError) {
      console.warn('⚠️  Erreur lors de la validation finale:', validationError.message);
    }

    return executedSeeds;
  }

  /**
   * Vérifie l'intégrité des seeds après exécution
   */
  async verifySeedIntegrity() {
    const client = await connection.connect();
    try {
      console.log('🔍 Vérification de l\'intégrité des seeds...');
      
      // 1. Vérifier les rôles attendus
      const expectedRoles = ['super_admin', 'admin', 'user'];
      const rolesResult = await client.query(`
        SELECT code FROM roles WHERE code IN (${expectedRoles.map((_, i) => `$${i + 1}`).join(', ')})
      `, expectedRoles);
      
      const foundRoles = rolesResult.rows.map(r => r.code);
      const missingRoles = expectedRoles.filter(role => !foundRoles.includes(role));
      
      if (missingRoles.length > 0) {
        console.warn(`⚠️  Rôles manquants: ${missingRoles.join(', ')}`);
      } else {
        console.log('✅ Tous les rôles de base sont présents');
      }
      
      // 2. Vérifier les permissions minimales
      const minPermissions = 10; // Minimum attendu
      const permissionsResult = await client.query(`
        SELECT COUNT(*) as count FROM permissions
      `);
      const permissionsCount = parseInt(permissionsResult.rows[0].count);
      
      if (permissionsCount < minPermissions) {
        console.warn(`⚠️  Permissions insuffisantes: ${permissionsCount} (minimum: ${minPermissions})`);
      } else {
        console.log(`✅ Permissions adéquates: ${permissionsCount}`);
      }
      
      // 3. Vérifier les menus de base
      const minMenus = 5; // Minimum attendu
      const menusResult = await client.query(`
        SELECT COUNT(*) as count FROM menus
      `);
      const menusCount = parseInt(menusResult.rows[0].count);
      
      if (menusCount < minMenus) {
        console.warn(`⚠️  Menus insuffisants: ${menusCount} (minimum: ${minMenus})`);
      } else {
        console.log(`✅ Menus adéquats: ${menusCount}`);
      }
      
      // 4. Vérifier l'utilisateur admin
      const adminResult = await client.query(`
        SELECT COUNT(*) as count FROM users u
        JOIN people p ON u.person_id = p.id
        WHERE u.username = 'admin'
      `);
      const adminCount = parseInt(adminResult.rows[0].count);
      
      if (adminCount === 0) {
        console.warn('⚠️  Utilisateur admin manquant');
      } else {
        console.log('✅ Utilisateur admin présent');
      }
      
      // 5. Calculer le score d'intégrité
      let integrityScore = 0;
      const maxScore = 4;
      
      if (missingRoles.length === 0) integrityScore++;
      if (permissionsCount >= minPermissions) integrityScore++;
      if (menusCount >= minMenus) integrityScore++;
      if (adminCount > 0) integrityScore++;
      
      const integrityPercentage = Math.round((integrityScore / maxScore) * 100);
      console.log(`📈 Score d\'intégrité: ${integrityPercentage}% (${integrityScore}/${maxScore})`);
      
      return {
        integrityScore,
        integrityPercentage,
        missingRoles,
        permissionsCount,
        menusCount,
        adminCount,
        isComplete: integrityScore === maxScore
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Détermine si les seeds sont nécessaires
   * Vérifie complètement l'état de la base de données
   */
  async needsSeeds() {
    const client = await connection.connect();
    try {
      console.log('🔍 Vérification complète de l\'état de la base de données...');
      
      // 1. Vérifier si les tables critiques existent
      const requiredTables = ['people', 'users', 'roles', 'permissions', 'menus', 'accesses', 'authorizations'];
      const existingTables = [];
      
      for (const table of requiredTables) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        if (result.rows[0].exists) {
          existingTables.push(table);
        }
      }
      
      console.log(`📊 Tables existantes: ${existingTables.length}/${requiredTables.length}`);
      
      // 2. Vérifier le nombre de rôles attendus
      const expectedRoles = ['super_admin', 'admin', 'user'];
      const rolesResult = await client.query(`
        SELECT COUNT(*) as count FROM roles 
        WHERE code IN (${expectedRoles.map((_, i) => `$${i + 1}`).join(', ')})
      `, expectedRoles);
      
      const rolesCount = parseInt(rolesResult.rows[0].count);
      console.log(`👥 Rôles trouvés: ${rolesCount}/${expectedRoles.length}`);
      
      // 3. Vérifier le nombre de permissions attendues
      const permissionsResult = await client.query(`
        SELECT COUNT(*) as count FROM permissions
      `);
      const permissionsCount = parseInt(permissionsResult.rows[0].count);
      console.log(`🔐 Permissions trouvées: ${permissionsCount}`);
      
      // 4. Vérifier le nombre de menus attendus
      const menusResult = await client.query(`
        SELECT COUNT(*) as count FROM menus
      `);
      const menusCount = parseInt(menusResult.rows[0].count);
      console.log(`📋 Menus trouvés: ${menusCount}`);
      
      // 5. Vérifier si l'admin par défaut existe
      const adminResult = await client.query(`
        SELECT COUNT(*) as count FROM users u
        JOIN people p ON u.person_id = p.id
        WHERE u.username = 'admin'
      `);
      const adminCount = parseInt(adminResult.rows[0].count);
      console.log(`👤 Admin trouvé: ${adminCount > 0 ? 'Oui' : 'Non'}`);
      
      // 6. Calculer le pourcentage de complétion
      let completionScore = 0;
      const maxScore = 5;
      
      if (existingTables.length >= requiredTables.length) completionScore++;
      if (rolesCount >= expectedRoles.length) completionScore++;
      if (permissionsCount >= 20) completionScore++; // Au moins 20 permissions
      if (menusCount >= 10) completionScore++; // Au moins 10 menus
      if (adminCount > 0) completionScore++;
      
      const completionPercentage = Math.round((completionScore / maxScore) * 100);
      console.log(`📈 Complétion de la base de données: ${completionPercentage}%`);
      
      // Les seeds sont nécessaires si la base n'est pas complète
      const needsSeeds = completionScore < maxScore;
      
      if (needsSeeds) {
        console.log('🌱 Seeds nécessaires - base de données incomplète');
      } else {
        console.log('✅ Base de données complète - seeds non nécessaires');
      }
      
      return needsSeeds;
      
    } finally {
      client.release();
    }
  }

  /**
   * Exécute un seul seed dans sa propre transaction
   * Gère les erreurs de manière robuste pour garantir l'exécution
   */
  async executeSingleSeed(seedPath, seedFile) {
    const client = await connection.connect();
    const startTime = Date.now();
    
    try {
      console.log(`🌱 Début du seed ${seedFile}...`);
      await client.query('BEGIN');
      
      const seedSql = await fs.readFile(seedPath, 'utf8');
      console.log(`📝 Fichier seed ${seedFile} lu (${seedSql.length} caractères)`);
      
      try {
        await client.query(seedSql);
        console.log(`⚡ SQL exécuté pour ${seedFile}`);
      } catch (seedError) {
        // Gérer les erreurs de contrainte (doublons) comme non-fatales
        if (seedError.message.includes('duplicate key') || 
            seedError.message.includes('unique constraint') ||
            seedError.message.includes('already exists')) {
          console.log(`⚠️  Données déjà existantes dans ${seedFile} - ignoré`);
        } else {
          throw seedError;
        }
      }
      
      await client.query('COMMIT');
      const duration = Date.now() - startTime;
      console.log(`✅ Seed ${seedFile} exécuté en ${duration}ms`);
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Ne pas échouer le bootstrap pour les erreurs de doublons
      if (error.message.includes('duplicate key') || 
          error.message.includes('unique constraint') ||
          error.message.includes('already exists')) {
        console.log(`⚠️  Seed ${seedFile} ignoré - données déjà existantes`);
        return true; // Considérer comme un succès car les données existent déjà
      }
      
      console.error(`❌ Erreur lors du seed ${seedFile}:`, error.message);
      console.error(`🔍 Détails: Fichier=${seedPath}, Durée=${Date.now() - startTime}ms`);
      
      // Pour les seeds, ne pas arrêter le bootstrap complètement
      console.log(`⚠️  Continuation du bootstrap malgré l'erreur du seed ${seedFile}`);
      return false; // Indiquer que le seed n'a pas été appliqué mais continuer
      
    } finally {
      client.release();
    }
  }

  /**
   * Valide l'installation complète
   */
  async validateInstallation() {
    const client = await connection.connect();
    try {
      // Vérifier les tables critiques
      const requiredTables = ['people', 'users', 'roles', 'permissions', 'menus'];
      for (const table of requiredTables) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        if (!result.rows[0].exists) {
          throw new Error(`Table critique manquante: ${table}`);
        }
      }

      // Vérifier l'admin par défaut
      const adminCheck = await client.query(`
        SELECT COUNT(*) as count FROM users u
        JOIN people p ON u.person_id = p.id
        WHERE u.username = 'admin'
      `);

      if (adminCheck.rows[0].count === 0) {
        throw new Error('Administrateur par défaut non trouvé');
      }

      console.log('✅ Validation de l\'installation réussie');
      
    } finally {
      client.release();
    }
  }

  /**
   * Récupère la liste des fichiers de migration triés par nom
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort()
        .map(file => path.join(this.migrationsPath, file));
      
      return migrationFiles;
    } catch (error) {
      throw new Error(`Impossible de lire le dossier des migrations: ${error.message}`);
    }
  }

  /**
   * Vérifie si une migration est déjà appliquée
   */
  async isMigrationApplied(migrationName) {
    const client = await connection.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count FROM schema_migrations 
        WHERE migration_name = $1
      `, [migrationName]);
      
      return result.rows[0].count > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Détermine si c'est la première initialisation
   */
  async isFirstInitialization() {
    const client = await connection.connect();
    try {
      // Si aucune migration n'est appliquée, c'est la première fois
      const result = await client.query(`
        SELECT COUNT(*) as count FROM schema_migrations
      `);
      
      return result.rows[0].count === 0;
    } finally {
      client.release();
    }
  }

  /**
   * Calcule le checksum SHA256 d'un fichier
   */
  async calculateFileChecksum(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Retourne l'état actuel des migrations
   */
  async getMigrationStatus() {
    const client = await connection.connect();
    try {
      const result = await client.query(`
        SELECT migration_name, executed_at, checksum, file_size, execution_time_ms
        FROM schema_migrations 
        ORDER BY executed_at
      `);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Garantit que le super-admin ait toutes les permissions disponibles
   */
  async ensureSuperAdminPermissions() {
    const client = await connection.connect();
    try {
      await client.query('BEGIN');

      // Récupérer le rôle super_admin
      const roleResult = await client.query(`
        SELECT id FROM roles WHERE code = 'super_admin'
      `);

      if (roleResult.rows.length === 0) {
        console.log('⚠️  Rôle super_admin non trouvé, création des permissions ignorée');
        return;
      }

      const superAdminRoleId = roleResult.rows[0].id;

      // Récupérer toutes les permissions
      const permissionsResult = await client.query(`
        SELECT id FROM permissions
      `);

      // Insérer toutes les permissions manquantes pour le super_admin
      for (const permission of permissionsResult.rows) {
        await client.query(`
          INSERT INTO authorizations (role_id, permission_id, menu_id, created_at, updated_at)
          VALUES ($1, $2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (role_id, permission_id, menu_id) DO NOTHING
        `, [superAdminRoleId, permission.id]);
      }

      await client.query('COMMIT');
      console.log(`✅ Super-admin permissions garanties: ${permissionsResult.rows.length} permissions`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Erreur lors de la garantie des permissions super-admin:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new DatabaseBootstrap();
