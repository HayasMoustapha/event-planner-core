/**
 * Middleware pour injecter la base de données dans les requêtes
 * 
 * Ce middleware ajoute req.db pour que les controllers puissent accéder
 * à la base de données sans avoir à l'importer directement
 */

const { Pool } = require('pg');

// Configuration de la base de données avec timeouts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,      // 5s pour obtenir une connexion
  idleTimeoutMillis: 30000,           // 30s avant de fermer une connexion inactive
  query_timeout: 10000,               // 10s timeout par requête
  statement_timeout: 10000,           // 10s timeout au niveau PostgreSQL
  max: 10                             // Max 10 connexions dans le pool
});

/**
 * Middleware qui injecte req.db dans chaque requête
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express  
 * @param {Function} next - Middleware suivant
 */
function databaseMiddleware(req, res, next) {
  // Injecter le pool de base de données dans la requête
  req.db = pool;
  
  // Logger pour debugging (temporaire)
  console.log('[DATABASE_MIDDLEWARE] DB injected for:', req.method, req.originalUrl);
  
  next();
}

module.exports = databaseMiddleware;
