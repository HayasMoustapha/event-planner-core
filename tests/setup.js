const { Pool } = require('pg');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

// Configuration des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';

// URLs des services (défaut: localhost)
process.env.TICKET_GENERATOR_URL = process.env.TICKET_GENERATOR_URL || 'http://localhost:3004';
process.env.SCAN_SERVICE_URL = process.env.SCAN_SERVICE_URL || 'http://localhost:3005';
process.env.PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';
process.env.NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';
process.env.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';

// API Keys pour les tests
process.env.TICKET_GENERATOR_API_KEY = process.env.TICKET_GENERATOR_API_KEY || 'test-ticket-api-key';
process.env.SCAN_SERVICE_API_KEY = process.env.SCAN_SERVICE_API_KEY || 'test-scan-api-key';
process.env.PAYMENT_SERVICE_API_KEY = process.env.PAYMENT_SERVICE_API_KEY || 'test-payment-api-key';
process.env.NOTIFICATION_SERVICE_API_KEY = process.env.NOTIFICATION_SERVICE_API_KEY || 'test-notification-api-key';

// Helper pour vérifier si un service est disponible
global.checkServiceHealth = async (client) => {
  try {
    const result = await client.healthCheck();
    return result.success && result.status === 'healthy';
  } catch (error) {
    return false;
  }
};

// Helper pour attendre qu'un service soit prêt
global.waitForService = async (client, maxAttempts = 10, delay = 1000) => {
  for (let i = 0; i < maxAttempts; i++) {
    if (await global.checkServiceHealth(client)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
};

// Helper pour générer des données de test uniques
global.generateTestData = {
  eventId: () => `test-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  guestId: () => `test-guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  ticketCode: () => `TKT-TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  userId: () => `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  email: () => `test-${Date.now()}@example.com`,
  phone: () => `+336${Math.floor(10000000 + Math.random() * 90000000)}`
};

// Helper pour mesurer le temps de réponse
global.measureResponseTime = async (asyncFn) => {
  const startTime = Date.now();
  const result = await asyncFn();
  const endTime = Date.now();
  return {
    result,
    responseTime: endTime - startTime
  };
};

// Configuration globale pour les tests
global.testConfig = {
  maxResponseTime: 5000, // 5 secondes max pour une réponse
  retryAttempts: 3,
  retryDelay: 1000
};

// Configuration de la base de données de test
const testDb = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'event_planner_core',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Fonction pour créer un token JWT mock
const createMockToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret-key', { expiresIn: '1h' });
};

// Middleware d'authentification mock pour les tests
const mockAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authorization header is required'
    });
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid authorization format'
    });
  }
  
  const token = parts[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key');
    req.user = decoded;
    req.token = token;
    req.authenticatedAt = new Date().toISOString();
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
};

// Avant tous les tests
beforeAll(async () => {
  try {
    // Test simple de connexion sans quitter le processus
    await testDb.query('SELECT NOW()');
    console.log('✅ Base de données de test connectée');
    
    // Créer les tables nécessaires en dehors des transactions
    await setupTestDatabase();
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de test:', error.message);
    // Ne pas quitter le processus, juste logger l'erreur
    console.log('⚠️  Tests vont s\'exécuter sans base de données');
  }
});

// Créer les tables de test persistantes
async function setupTestDatabase() {
  const { Pool } = require('pg');

  try {
    // Créer une connexion dédiée pour la configuration
    const setupDb = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'event_planner_core',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });
    
    // Créer uniquement les tables nécessaires pour le core business
    await setupDb.query(`
      CREATE TABLE IF NOT EXISTS system_backups (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'started',
        include_data BOOLEAN DEFAULT true,
        created_by BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        estimated_size VARCHAR(50),
        details JSONB
      )
    `);
    
    await setupDb.end();
    console.log('✅ Tables de test configurées avec succès (sans table users)');
  } catch (error) {
    console.error('❌ Erreur lors de la configuration des tables de test:', error.message);
  }
}

// Après chaque test
afterEach(async () => {
  try {
    await testDb.query('ROLLBACK');
  } catch (error) {
    // Ignorer les erreurs de rollback si la connexion n'est pas établie
  }
});

// Avant chaque test, nettoyer les données mais garder les tables
beforeEach(async () => {
  try {
    // Nettoyer uniquement les données des tables core (pas de table users)
    await testDb.query('DELETE FROM system_backups');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des tables de test:', error.message);
  }
});

// Après tous les tests
afterAll(async () => {
  try {
    await testDb.end();
    console.log('✅ Connexion base de test fermée');
  } catch (error) {
    // Ignorer les erreurs de fermeture
  }
});

// Export pour utilisation dans les tests
module.exports = {
  app,
  request,
  testDb,
  createMockToken,
  mockAuthenticate
};
