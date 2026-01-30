const { Pool } = require('pg');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

// Configuration de la base de données de test
const testDb = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/event_planner_test'
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
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
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
