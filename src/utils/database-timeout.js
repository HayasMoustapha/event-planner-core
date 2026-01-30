/**
 * Utilitaire pour les requêtes base de données avec timeout
 * Prévient les blocages indéfinis avec PostgreSQL
 */

/**
 * Exécute une requête avec timeout par défaut
 * @param {Object} db - Instance de base de données
 * @param {string} query - Requête SQL
 * @param {Array} params - Paramètres de la requête
 * @param {number} timeoutMs - Timeout en millisecondes (défaut: 5000ms)
 * @returns {Promise} Résultat de la requête
 */
async function queryWithTimeout(db, query, params = [], timeoutMs = 5000) {
  return Promise.race([
    db.query(query, params),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Database query timeout after ${timeoutMs}ms: ${query.substring(0, 50)}...`));
      }, timeoutMs);
    })
  ]);
}

/**
 * Wrapper pour les controllers avec timeout DB
 * @param {Function} controllerFn - Fonction du controller
 * @param {number} timeoutMs - Timeout par défaut pour les requêtes DB
 * @returns {Function} Controller wrappé
 */
function withDatabaseTimeout(controllerFn, timeoutMs = 5000) {
  return async (req, res, next) => {
    try {
      // Injecter la méthode queryWithTimeout dans req.db
      const originalQuery = req.db.query;
      req.db.query = (query, params) => queryWithTimeout(req.db, query, params, timeoutMs);
      
      // Appeler le controller original
      await controllerFn(req, res, next);
      
      // Restaurer la méthode originale (au cas où)
      req.db.query = originalQuery;
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  queryWithTimeout,
  withDatabaseTimeout
};
