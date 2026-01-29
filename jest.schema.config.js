/**
 * ========================================
 * CONFIGURATION JEST BASÉE SUR SCHÉMA
 * ========================================
 * Configuration optimisée pour tests avec validation de schéma SQL
 * @version 1.0.0
 */

module.exports = {
  displayName: 'Schema-Based Tests',
  testEnvironment: 'node',

  // Setup principal avec schéma
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/schemaSetup.js'
  ],

  // Patterns de tests
  testMatch: [
    '<rootDir>/tests/**/*.schema.test.js',
    '<rootDir>/tests/schema/**/*.test.js',
    '<rootDir>/tests/unit/modules/**/*.schema.test.js',
    '<rootDir>/tests/integration/**/*.schema.test.js'
  ],

  // Exclure les tests non-schema
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '<rootDir>/tests/orchestration/',
    '<rootDir>/tests/services/',
    '<rootDir>/tests/unit/modules/events/events.repository.test.js', // Ancien test
    '<rootDir>/tests/unit/modules/events/events.service.test.js'     // Ancien test
  ],

  // Couverture de code stricte
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!**/node_modules/**'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Seuils de couverture élevés pour le 10/10
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/modules/': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    }
  },

  // Reporters détaillés
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './reports',
      outputName: 'schema-tests.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Timeout plus long pour les opérations de schéma
  testTimeout: 60000,

  // Verbose pour voir les détails de validation
  verbose: true,

  // Ne pas s'arrêter à la première erreur
  bail: false,

  // Forcer la sortie après tous les tests
  forceExit: true,

  // Détecter les handles ouverts
  detectOpenHandles: true,

  // Nettoyage automatique
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Variables d'environnement pour les tests
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    SCHEMA_VALIDATION: 'strict',
    DB_TIMEOUT: '30000'
  },

  // Transformateurs
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Modules à ignorer pour la transformation
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@faker-js/faker)/)'
  ],

  // Mapping des modules
  moduleNameMapper: {
    '^uuid$': 'uuid',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Collecteurs de couverture personnalisés
  collectCoverageFrom: [
    'src/modules/events/events.repository.js',
    'src/modules/events/events.service.js',
    'src/modules/guests/guests.repository.js',
    'src/modules/guests/guests.service.js',
    'src/modules/tickets/tickets.repository.js',
    'src/modules/tickets/tickets.service.js',
    'src/modules/marketplace/marketplace.repository.js',
    'src/modules/marketplace/marketplace.service.js'
  ],

  // Configuration globale
  globalSetup: '<rootDir>/tests/setup/globalSchemaSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalSchemaTeardown.js',

  // Maximum de workers pour les tests
  maxWorkers: '50%',

  // Cache
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache-schemas',

  // Notification des résultats
  notify: true,
  notifyMode: 'failure-change',

  // Projets pour différents types de tests
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/modules/**/*.schema.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/schemaSetup.js'],
      testTimeout: 30000
    },
    {
      displayName: 'Integration Tests', 
      testMatch: ['<rootDir>/tests/integration/**/*.schema.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/schemaSetup.js'],
      testTimeout: 45000
    },
    {
      displayName: 'Schema Validation',
      testMatch: ['<rootDir>/tests/schema/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/schemaSetup.js'],
      testTimeout: 60000
    }
  ],

  // Hooks de test
  setupFiles: ['<rootDir>/tests/setup/testEnvironment.js']
};
