/**
 * Configuration Jest pour les Tests d'Orchestration
 *
 * Utilisation:
 *   # Tests mock uniquement
 *   npm run test:orchestration:mock
 *
 *   # Tests integration (services requis)
 *   npm run test:orchestration:integration
 *
 *   # Tests E2E (tous les services requis)
 *   npm run test:orchestration:e2e
 *
 *   # Tous les tests d'orchestration
 *   npm run test:orchestration
 */

module.exports = {
  displayName: 'Orchestration Tests',
  testEnvironment: 'node',

  // Fichiers de setup
  setupFilesAfterEnv: [
    '<rootDir>/setup/jest.orchestration.setup.js'
  ],

  // Patterns de test selon le mode
  testMatch: process.env.ORCHESTRATION_TEST_MODE === 'mock'
    ? ['<rootDir>/mocks/**/*.test.js']
    : process.env.ORCHESTRATION_TEST_MODE === 'integration'
      ? ['<rootDir>/integration/**/*.test.js']
      : process.env.ORCHESTRATION_TEST_MODE === 'e2e'
        ? ['<rootDir>/e2e/**/*.test.js']
        : ['<rootDir>/**/*.test.js'],

  // Timeouts
  testTimeout: process.env.ORCHESTRATION_TEST_MODE === 'e2e' ? 60000 : 30000,

  // Couverture
  collectCoverageFrom: [
    '../../src/**/*.js',
    '../../../shared/**/*.js',
    '!**/node_modules/**'
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './reports',
      outputName: 'orchestration-tests.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ],

  // Ignorer certains dossiers
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Verbose pour debug
  verbose: true,

  // Ne pas arrêter sur la première erreur
  bail: false,

  // Forcer la sortie après tous les tests
  forceExit: true,

  // Détection de fuites de handles
  detectOpenHandles: true
};
