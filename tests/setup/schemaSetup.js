/**
 * ========================================
 * SETUP GLOBAL BASÉ SUR SCHÉMA
 * ========================================
 * Configuration Jest avec extraction et validation automatique
 * @version 1.0.0
 */

const SchemaExtractor = require('../tools/schemaExtractors');
const SchemaBasedFactory = require('../factories/schemaBasedFactory');
const SchemaValidator = require('../validators/schemaValidator');
const SchemaTestHelper = require('../helpers/schemaTestHelper');

// Variables globales pour les tests
let schemaExtractor;
let schemaFactory;
let schemaValidator;
let schemaTestHelper;

/**
 * Setup global avant tous les tests
 */
beforeAll(async () => {
  console.log('🚀 Initialisation du setup basé sur schéma...');
  
  try {
    // Initialiser les composants
    schemaExtractor = new SchemaExtractor();
    schemaFactory = new SchemaBasedFactory(schemaExtractor);
    schemaValidator = new SchemaValidator(schemaExtractor);
    schemaTestHelper = new SchemaTestHelper(schemaFactory, schemaValidator);

    // Liste des tables à pré-charger
    const tables = [
      'users',
      'events', 
      'guests',
      'tickets',
      'ticket_types',
      'marketplace_designers',
      'marketplace_templates', 
      'marketplace_purchases',
      'marketplace_reviews',
      'system_backups',
      'system_logs',
      'event_guests',
      'user_permissions',
      'roles',
      'permissions'
    ];

    console.log(`📋 Pré-chargement de ${tables.length} schémas...`);
    
    // Pré-charger tous les schémas avec timeout
    const loadPromises = tables.map(async (table) => {
      try {
        const startTime = Date.now();
        await schemaFactory.loadSchema(table);
        const loadTime = Date.now() - startTime;
        console.log(`✅ ${table} (${loadTime}ms)`);
      } catch (error) {
        console.warn(`⚠️ Échec chargement ${table}: ${error.message}`);
      }
    });

    // Attendre le chargement avec timeout global
    await Promise.race([
      Promise.all(loadPromises),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout chargement schémas')), 30000)
      )
    ]);

    // Exporter globalement pour les tests
    global.schemaExtractor = schemaExtractor;
    global.schemaFactory = schemaFactory;
    global.schemaValidator = schemaValidator;
    global.schemaTestHelper = schemaTestHelper;

    // Exporter les helpers
    global.createValidData = (tableName, overrides) => 
      schemaTestHelper.createValidData(tableName, overrides);
    
    global.createInvalidData = (tableName, invalidFields) => 
      schemaTestHelper.createInvalidData(tableName, invalidFields);

    console.log('🎉 Setup basé sur schéma terminé avec succès!');
    console.log(`📊 Schémas chargés: ${schemaFactory.getLoadedSchemas().join(', ')}`);

  } catch (error) {
    console.error('❌ Erreur critique setup schéma:', error.message);
    
    // Exporter quand même pour éviter les erreurs dans les tests
    global.schemaExtractor = schemaExtractor;
    global.schemaFactory = schemaFactory;
    global.schemaValidator = schemaValidator;
    global.schemaTestHelper = schemaTestHelper;
  }
});

/**
 * Nettoyage après chaque test
 */
afterEach(async () => {
  // Nettoyer les caches si nécessaire
  if (global.schemaValidator) {
    // Garder le cache pour les performances, mais optionnellement le vider
    // global.schemaValidator.clearCache();
  }
});

/**
 * Nettoyage global après tous les tests
 */
afterAll(async () => {
  console.log('🧹 Nettoyage final du setup schéma...');
  
  try {
    // Fermer les connexions
    if (schemaExtractor) {
      await schemaExtractor.close();
    }

    // Nettoyer les caches
    if (schemaFactory) {
      schemaFactory.clearCache();
    }
    
    if (schemaValidator) {
      schemaValidator.clearCache();
    }

    console.log('✅ Nettoyage terminé');
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error.message);
  }
});

/**
 * Helper pour vérifier qu'un schéma est chargé
 */
global.ensureSchemaLoaded = async (tableName) => {
  if (!global.schemaFactory) {
    throw new Error('Schema factory non initialisé');
  }

  const loadedSchemas = global.schemaFactory.getLoadedSchemas();
  if (!loadedSchemas.includes(tableName)) {
    console.log(`📥 Chargement du schéma ${tableName}...`);
    await global.schemaFactory.loadSchema(tableName);
  }
};

/**
 * Helper pour créer des données de test avec validation
 */
global.createAndValidate = async (tableName, overrides = {}) => {
  await global.ensureSchemaLoaded(tableName);
  const data = await global.createValidData(tableName, overrides);
  
  // Validation supplémentaire
  const validation = await global.schemaValidator.validate(tableName, data);
  if (!validation.valid) {
    throw new Error(`Données invalides générées pour ${tableName}: ${validation.errors.join(', ')}`);
  }
  
  return data;
};

/**
 * Helper pour les tests de repository
 */
global.testRepositoryCRUD = async (repository, tableName) => {
  await global.ensureSchemaLoaded(tableName);
  await global.schemaTestHelper.testRepositoryCRUD(repository, tableName);
};

/**
 * Helper pour les tests d'API
 */
global.testAPIEndpoints = async (app, tableName, basePath, authToken) => {
  await global.ensureSchemaLoaded(tableName);
  await global.schemaTestHelper.testAPIEndpoints(app, tableName, basePath, authToken);
};

/**
 * Helper pour les tests de validation
 */
global.testSchemaValidation = async (tableName) => {
  await global.ensureSchemaLoaded(tableName);
  await global.schemaTestHelper.testSchemaValidation(tableName);
};

/**
 * Helper pour générer des IDs uniques
 */
global.generateTestId = () => Math.floor(Math.random() * 1000000) + 1;

/**
 * Helper pour générer des emails uniques
 */
global.generateTestEmail = () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;

/**
 * Helper pour générer des timestamps de test
 */
global.generateTestTimestamp = (future = true) => {
  const base = future ? Date.now() + 86400000 : Date.now(); // +1 jour ou maintenant
  return new Date(base + Math.random() * 86400000).toISOString(); // +24h aléatoire
};

/**
 * Helper pour valider rapidement une réponse API
 */
global.expectAPIResponse = (response, expectedStatus = 200, expectSuccess = true) => {
  expect(response.status).toBe(expectedStatus);
  
  if (expectSuccess) {
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  } else {
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  }
};

/**
 * Helper pour mesurer la performance d'un test
 */
global.measureTestPerformance = async (testFn, testName) => {
  const start = Date.now();
  const result = await testFn();
  const duration = Date.now() - start;
  
  if (duration > 1000) {
    console.warn(`⚠️ Test lent: ${testName} (${duration}ms)`);
  }
  
  return { result, duration };
};

/**
 * Configuration des timeouts pour les tests de schéma
 */
global.SCHEMA_TEST_TIMEOUT = 30000; // 30 secondes
global.API_TEST_TIMEOUT = 10000;    // 10 secondes
global.REPO_TEST_TIMEOUT = 5000;    // 5 secondes

// Exporter pour utilisation dans d'autres fichiers setup
module.exports = {
  schemaExtractor,
  schemaFactory,
  schemaValidator,
  schemaTestHelper
};
