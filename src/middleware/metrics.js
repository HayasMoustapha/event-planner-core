const client = require('prom-client');
const config = require('../config');

/**
 * Middleware de métriques Prometheus pour Event Planner Core
 * Collecte des métriques sur les performances et l'utilisation
 */

// Créer un registre de métriques
const register = new client.Registry();

// Ajouter des métriques par défaut
client.collectDefaultMetrics({ register });

// Métriques personnalisées
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const securityEvents = new client.Counter({
  name: 'security_events_total',
  help: 'Total number of security events',
  labelNames: ['event_type', 'risk_level']
});

const authenticationAttempts = new client.Counter({
  name: 'authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result', 'method']
});

const databaseOperations = new client.Counter({
  name: 'database_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'table', 'result']
});

const businessOperations = new client.Counter({
  name: 'business_operations_total',
  help: 'Total number of business operations',
  labelNames: ['operation', 'result']
});

const errorRate = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'severity']
});

// Enregistrer les métriques
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(securityEvents);
register.registerMetric(authenticationAttempts);
register.registerMetric(databaseOperations);
register.registerMetric(businessOperations);
register.registerMetric(errorRate);

// Suivi des connexions actives
let activeConnectionsCount = 0;

/**
 * Middleware pour collecter les métriques HTTP
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  activeConnectionsCount++;
  activeConnections.set(activeConnectionsCount);

  // Flag pour éviter le double décrément
  let connectionClosed = false;

  // Fonction pour décrémenter le compteur une seule fois
  const decrementConnection = () => {
    if (!connectionClosed) {
      connectionClosed = true;
      activeConnectionsCount = Math.max(0, activeConnectionsCount - 1);
      activeConnections.set(activeConnectionsCount);
    }
  };

  // Intercepter la fin de la requête
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const statusCode = res.statusCode.toString();

    // Enregistrer les métriques
    httpRequestDuration
      .labels(req.method, route, statusCode)
      .observe(duration);

    httpRequestTotal
      .labels(req.method, route, statusCode)
      .inc();

    // Enregistrer les erreurs
    if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
      errorRate
        .labels('http_error', statusCode.startsWith('5') ? 'high' : 'medium')
        .inc();
    }

    decrementConnection();
  });

  // Intercepter la fermeture de connexion (client disconnect)
  res.on('close', decrementConnection);

  next();
};

/**
 * Enregistre un événement de sécurité
 */
const recordSecurityEvent = (eventType, riskLevel = 'medium') => {
  securityEvents.labels(eventType, riskLevel).inc();
};

/**
 * Enregistre une tentative d'authentification
 */
const recordAuthAttempt = (result, method = 'token') => {
  authenticationAttempts.labels(result, method).inc();
};

/**
 * Enregistre une opération de base de données
 */
const recordDatabaseOperation = (operation, table, result = 'success') => {
  databaseOperations.labels(operation, table, result).inc();
};

/**
 * Enregistre une opération métier
 */
const recordBusinessOperation = (operation, result = 'success') => {
  businessOperations.labels(operation, result).inc();
};

/**
 * Endpoint pour exposer les métriques
 */
const metricsEndpoint = (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
};

/**
 * Nettoyage périodique des anciennes métriques
 */
const cleanupMetrics = () => {
  // Réinitialiser les métriques de gauge si nécessaire
  console.log('Metrics cleanup completed');
};

// Nettoyer les métriques toutes les heures
setInterval(cleanupMetrics, 3600000);

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  recordSecurityEvent,
  recordAuthAttempt,
  recordDatabaseOperation,
  recordBusinessOperation,
  register
};
