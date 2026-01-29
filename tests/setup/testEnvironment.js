/**
 * ========================================
        * CONFIGURATION ENVIRONNEMENT DE TEST
 * ========================================
 * Configuration de l'environnement pour les tests de schéma
 * @version 1.0.0
 */

// Variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.SCHEMA_VALIDATION = 'strict';
process.env.DB_TIMEOUT = '30000';

// Configuration Jest
jest.setTimeout(60000);

// Mock des modules externes si nécessaire
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }))
}));

// Mock de Redis si utilisé
jest.mock('ioredis', () => {
  const Redis = jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1)
  }));
  
  return Redis;
});

// Configuration globale pour les tests
global.testConfig = {
  maxResponseTime: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
  schemaValidation: {
    strict: true,
    allowNullOverride: false,
    validateTypes: true,
    validateConstraints: true
  }
};

// Helpers pour les tests
global.testHelpers = {
  generateId: () => Math.floor(Math.random() * 1000000) + 1,
  generateEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
  generateTimestamp: (future = true) => {
    const base = future ? Date.now() + 86400000 : Date.now();
    return new Date(base + Math.random() * 86400000).toISOString();
  },
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Intercepter les console.log pour les tests (optionnel)
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (process.env.VERBOSE_TESTS === 'true') {
    originalConsoleLog(...args);
  }
};

// Nettoyage après chaque test
afterEach(() => {
  // Restaurer console.log
  console.log = originalConsoleLog;
});
