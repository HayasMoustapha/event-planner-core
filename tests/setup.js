const { Pool } = require('pg');
const request = require('supertest');
const app = require('../src/app');

// Configuration de la base de données de test
const testDb = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/event_planner_test'
});

// Avant tous les tests
beforeAll(async () => {
  try {
    // Test simple de connexion sans quitter le processus
    await testDb.query('SELECT NOW()');
    console.log('✅ Base de données de test connectée');
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de test:', error.message);
    // Ne pas quitter le processus, juste logger l'erreur
    console.log('⚠️  Tests vont s\'exécuter sans base de données');
  }
});

// Après chaque test
afterEach(async () => {
  try {
    await testDb.query('ROLLBACK');
  } catch (error) {
    // Ignorer les erreurs de rollback si la connexion n'est pas établie
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
  testDb
};
