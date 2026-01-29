/**
 * ========================================
 * MONITORING AVANCÉ - EVENT PLANNER CORE
 * ========================================
 * Métriques Prometheus, health checks, alerting
 * Surveillance complète de la santé et performance du service
 */

const promClient = require('prom-client');
const { database } = require('../config/database');

// ========================================
// REGISTRE DES MÉTRIQUES
// ========================================
const register = new promClient.Registry();

// ========================================
// MÉTRIQUES HTTP
// ========================================
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status_code', 'user_id'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'status_code', 'user_id']
});

const httpRequestErrors = new promClient.Counter({
  name: 'http_request_errors_total',
  help: 'Nombre total d\'erreurs HTTP',
  labelNames: ['method', 'route', 'status_code', 'error_type', 'user_id']
});

// ========================================
// MÉTRIQUES DATABASE
// ========================================
const dbConnectionPool = new promClient.Gauge({
  name: 'db_connection_pool_active',
  help: 'Nombre de connexions actives dans le pool',
  labelNames: ['database']
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Durée des requêtes base de données en secondes',
  labelNames: ['table', 'operation', 'query_type'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

const dbQueryTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: 'Nombre total de requêtes base de données',
  labelNames: ['table', 'operation', 'query_type', 'success']
});

const dbConnectionErrors = new promClient.Counter({
  name: 'db_connection_errors_total',
  help: 'Nombre total d\'erreurs de connexion base de données',
  labelNames: ['error_type', 'database']
});

// ========================================
// MÉTRIQUES BUSINESS
// ========================================
const eventsTotal = new promClient.Gauge({
  name: 'events_total',
  help: 'Nombre total d\'événements',
  labelNames: ['status', 'organizer_id']
});

const guestsTotal = new promClient.Gauge({
  name: 'guests_total',
  help: 'Nombre total d\'invités',
  labelNames: ['status', 'event_id']
});

const ticketsTotal = new promClient.Gauge({
  name: 'tickets_total',
  help: 'Nombre total de tickets',
  labelNames: ['status', 'event_id', 'ticket_type_id']
});

const activeUsers = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Nombre d\'utilisateurs actifs',
  labelNames: ['timeframe'] // 1h, 24h, 7d
});

// ========================================
// MÉTRIQUES PERFORMANCE
// ========================================
const memoryUsage = new promClient.Gauge({
  name: 'memory_usage_bytes',
  help: 'Utilisation mémoire en bytes',
  labelNames: ['type'] // heap, external, rss
});

const cpuUsage = new promClient.Gauge({
  name: 'cpu_usage_percent',
  help: 'Utilisation CPU en pourcentage'
});

const eventQueueSize = new promClient.Gauge({
  name: 'event_queue_size',
  help: 'Taille de la queue d\'événements',
  labelNames: ['queue_name', 'status'] // waiting, active, completed, failed
});

// ========================================
// MÉTRIQUES SÉCURITÉ
// ========================================
const authAttempts = new promClient.Counter({
  name: 'auth_attempts_total',
  help: 'Tentatives d\'authentification',
  labelNames: ['success', 'ip_address', 'user_agent']
});

const rateLimitHits = new promClient.Counter({
  name: 'rate_limit_hits_total',
  help: 'Nombre de hits du rate limiting',
  labelNames: ['ip_address', 'endpoint', 'limit_type']
});

const securityViolations = new promClient.Counter({
  name: 'security_violations_total',
  help: 'Violations de sécurité détectées',
  labelNames: ['violation_type', 'ip_address', 'severity']
});

// ========================================
// COLLECTEUR DE MÉTRIQUES CUSTOM
// ========================================
class MetricsCollector {
  constructor() {
    this.startTime = Date.now();
    this.lastCollection = {};
  }

  /**
   * ========================================
   * COLLECTE LES MÉTRIQUES BUSINESS
   * ========================================
   */
  async collectBusinessMetrics() {
    try {
      const client = await database.pool.connect();
      
      // Nombre d'événements par statut
      const eventStatsQuery = `
        SELECT 
          status,
          COUNT(*) as count,
          COUNT(DISTINCT organizer_id) as unique_organizers
        FROM events 
        WHERE deleted_at IS NULL
        GROUP BY status
      `;
      
      const eventStats = await client.query(eventStatsQuery);
      
      eventStats.rows.forEach(row => {
        eventsTotal.set(
          { status: row.status },
          Number(row.count)
        );
      });

      // Nombre d'invités par statut
      const guestStatsQuery = `
        SELECT 
          status,
          COUNT(*) as count
        FROM guests 
        WHERE deleted_at IS NULL
        GROUP BY status
      `;
      
      const guestStats = await client.query(guestStatsQuery);
      
      guestStats.rows.forEach(row => {
        guestsTotal.set(
          { status: row.status },
          Number(row.count)
        );
      });

      // Nombre de tickets par statut
      const ticketStatsQuery = `
        SELECT 
          is_validated,
          COUNT(*) as count
        FROM tickets 
        WHERE deleted_at IS NULL
        GROUP BY is_validated
      `;
      
      const ticketStats = await client.query(ticketStatsQuery);
      
      ticketStats.rows.forEach(row => {
        ticketsTotal.set(
          { status: row.is_validated ? 'validated' : 'pending' },
          Number(row.count)
        );
      });

      client.release();
      
    } catch (error) {
      console.error('❌ Erreur collecte métriques business:', error);
      dbConnectionErrors.inc({ error_type: 'metrics_collection' });
    }
  }

  /**
   * ========================================
   * COLLECTE LES MÉTRIQUES SYSTEME
   * ========================================
   */
  collectSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      
      memoryUsage.set({ type: 'heap' }, memUsage.heapUsed);
      memoryUsage.set({ type: 'external' }, memUsage.external);
      memoryUsage.set({ type: 'rss' }, memUsage.rss);
      
      // CPU usage (approximatif)
      const cpuUsagePercent = process.cpuUsage();
      const totalUsage = (cpuUsagePercent.user + cpuUsagePercent.system) / 1000000; // Convert microsecondes to percentage
      cpuUsage.set(totalUsage);
      
    } catch (error) {
      console.error('❌ Erreur collecte métriques système:', error);
    }
  }

  /**
   * ========================================
   * COLLECTE LES MÉTRIQUES DATABASE
   * ========================================
   */
  async collectDatabaseMetrics() {
    try {
      const poolInfo = database.pool;
      
      if (poolInfo && poolInfo.totalCount !== undefined) {
        dbConnectionPool.set(
          { database: 'event_planner_core' },
          poolInfo.totalCount - poolInfo.idleCount
        );
      }
      
    } catch (error) {
      console.error('❌ Erreur collecte métriques database:', error);
      dbConnectionErrors.inc({ error_type: 'metrics_collection' });
    }
  }

  /**
   * ========================================
   * COLLECTE LES MÉTRIQUES D'ACTIVITÉ UTILISATEURS
   * ========================================
   */
  async collectActiveUsersMetrics() {
    try {
      const client = await database.pool.connect();
      
      // Utilisateurs actifs dernière heure
      const activeUsers1hQuery = `
        SELECT COUNT(DISTINCT created_by) as count
        FROM events 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        AND deleted_at IS NULL
      `;
      
      const active1h = await client.query(activeUsers1hQuery);
      activeUsers.set({ timeframe: '1h' }, Number(active1h.rows[0].count));
      
      // Utilisateurs actifs dernières 24h
      const activeUsers24hQuery = `
        SELECT COUNT(DISTINCT created_by) as count
        FROM events 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND deleted_at IS NULL
      `;
      
      const active24h = await client.query(activeUsers24hQuery);
      activeUsers.set({ timeframe: '24h' }, Number(active24h.rows[0].count));
      
      // Utilisateurs actifs derniers 7 jours
      const activeUsers7dQuery = `
        SELECT COUNT(DISTINCT created_by) as count
        FROM events 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        AND deleted_at IS NULL
      `;
      
      const active7d = await client.query(activeUsers7dQuery);
      activeUsers.set({ timeframe: '7d' }, Number(active7d.rows[0].count));
      
      client.release();
      
    } catch (error) {
      console.error('❌ Erreur collecte métriques utilisateurs:', error);
    }
  }

  /**
   * ========================================
   * COLLECTE TOUTES LES MÉTRIQUES
   * ========================================
   */
  async collectAllMetrics() {
    const startTime = Date.now();
    
    await Promise.allSettled([
      this.collectBusinessMetrics(),
      this.collectSystemMetrics(),
      this.collectDatabaseMetrics(),
      this.collectActiveUsersMetrics()
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`📊 Métriques collectées en ${duration}ms`);
  }
}

// ========================================
// HEALTH CHECKS AVANCÉS
// ========================================
class HealthChecker {
  constructor() {
    this.checks = {
      database: this.checkDatabase.bind(this),
      memory: this.checkMemory.bind(this),
      disk: this.checkDisk.bind(this),
      external_services: this.checkExternalServices.bind(this),
      queue: this.checkQueue.bind(this)
    };
  }

  /**
   * ========================================
   * VÉRIFICATION CONNEXION DATABASE
   * ========================================
   */
  async checkDatabase() {
    try {
      const startTime = Date.now();
      const client = await database.pool.connect();
      
      // Test simple de connexion
      await client.query('SELECT 1');
      
      // Test de requête plus complexe
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published_events
        FROM events 
        WHERE deleted_at IS NULL
      `);
      
      client.release();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        details: {
          totalEvents: result.rows[0].total_events,
          publishedEvents: result.rows[0].published_events,
          poolInfo: {
            totalCount: database.pool.totalCount,
            idleCount: database.pool.idleCount,
            waitingCount: database.pool.waitingCount
          }
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: 'N/A'
      };
    }
  }

  /**
   * ========================================
   * VÉRIFICATION UTILISATION MÉMOIRE
   * ========================================
   */
  checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      const status = memoryUsagePercent < 90 ? 'healthy' : 'warning';
      
      return {
        status,
        details: {
          heapTotal: `${Math.round(totalMemory / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(usedMemory / 1024 / 1024)}MB`,
          heapUsagePercent: `${memoryUsagePercent.toFixed(2)}%`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * ========================================
   * VÉRIFICATION ESPACE DISQUE
   * ========================================
   */
  async checkDisk() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Vérifier l'espace disponible sur les répertoires critiques
      const criticalPaths = [
        './logs',
        './uploads',
        './database/migrations',
        './temp'
      ];
      
      const diskInfo = {};
      
      for (const dirPath of criticalPaths) {
        try {
          const stats = fs.statSync(dirPath);
          diskInfo[dirPath] = {
            exists: true,
            size: stats.size,
            modified: stats.mtime
          };
        } catch (error) {
          diskInfo[dirPath] = {
            exists: false,
            error: error.message
          };
        }
      }
      
      return {
        status: 'healthy',
        details: diskInfo
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * ========================================
   * VÉRIFICATION SERVICES EXTERNES
   * ========================================
   */
  async checkExternalServices() {
    try {
      const services = {
        auth_service: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
        notification_service: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002',
        ticket_generator_service: process.env.TICKET_GENERATOR_SERVICE_URL || 'http://localhost:3004'
      };
      
      const results = {};
      
      for (const [name, url] of Object.entries(services)) {
        try {
          const startTime = Date.now();
          const response = await fetch(`${url}/health`, {
            method: 'GET',
            timeout: 5000,
            headers: {
              'User-Agent': 'Event-Planner-Core-Health-Check'
            }
          });
          
          const responseTime = Date.now() - startTime;
          
          results[name] = {
            status: response.ok ? 'healthy' : 'unhealthy',
            responseTime: `${responseTime}ms`,
            statusCode: response.status
          };
          
        } catch (error) {
          results[name] = {
            status: 'unhealthy',
            error: error.message,
            responseTime: 'N/A'
          };
        }
      }
      
      const allHealthy = Object.values(results).every(r => r.status === 'healthy');
      
      return {
        status: allHealthy ? 'healthy' : 'degraded',
        details: results
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * ========================================
   * VÉRIFICATION QUEUE REDIS
   * ========================================
   */
  async checkQueue() {
    try {
      // Importer le service de queue
      const eventQueueService = require('../core/queue/event-queue.service');
      
      if (!eventQueueService.isInitialized) {
        return {
          status: 'unhealthy',
          error: 'Queue service not initialized'
        };
      }
      
      const stats = await eventQueueService.getQueueStats();
      
      return {
        status: 'healthy',
        details: {
          queues: stats,
          initialized: true
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * ========================================
   * HEALTH CHECK COMPLET
   * ========================================
   */
  async performFullHealthCheck() {
    const startTime = Date.now();
    
    const results = {};
    
    // Exécuter tous les checks en parallèle
    const checkPromises = Object.entries(this.checks).map(async ([name, checkFn]) => {
      try {
        const result = await checkFn();
        return { [name]: result };
      } catch (error) {
        return { [name]: { status: 'error', error: error.message } };
      }
    });
    
    const checkResults = await Promise.all(checkPromises);
    
    // Combiner les résultats
    checkResults.forEach(result => {
      Object.assign(results, result);
    });
    
    const totalTime = Date.now() - startTime;
    const allHealthy = Object.values(results).every(r => r.status === 'healthy');
    const hasWarnings = Object.values(results).some(r => r.status === 'warning');
    
    let overallStatus = 'healthy';
    if (!allHealthy) {
      overallStatus = 'unhealthy';
    } else if (hasWarnings) {
      overallStatus = 'warning';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${totalTime}ms`,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: results,
      metrics: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      }
    };
  }
}

// ========================================
// EXPORTATIONS
// ========================================
const metricsCollector = new MetricsCollector();
const healthChecker = new HealthChecker();

// Enregistrer les métriques
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);
register.registerMetric(dbConnectionPool);
registerMetric(dbQueryDuration);
registerMetric(dbQueryTotal);
registerMetric(dbConnectionErrors);
registerMetric(eventsTotal);
registerMetric(guestsTotal);
registerMetric(ticketsTotal);
registerMetric(activeUsers);
registerMetric(memoryUsage);
registerMetric(cpuUsage);
registerMetric(eventQueueSize);
registerMetric(authAttempts);
registerMetric(rateLimitHits);
registerMetric(securityViolations);

module.exports = {
  // Métriques
  register,
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    httpRequestErrors,
    dbConnectionPool,
    dbQueryDuration,
    dbQueryTotal,
    dbConnectionErrors,
    eventsTotal,
    guestsTotal,
    ticketsTotal,
    activeUsers,
    memoryUsage,
    cpuUsage,
    eventQueueSize,
    authAttempts,
    rateLimitHits,
    securityViolations
  },
  
  // Collecteurs
  metricsCollector,
  healthChecker,
  
  // Utilitaires
  recordHttpRequest: (req, res, responseTime) => {
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
      user_id: req.user?.id || 'anonymous'
    };
    
    httpRequestTotal.inc(labels);
    httpRequestDuration.observe(labels, responseTime / 1000);
    
    if (res.statusCode >= 400) {
      httpRequestErrors.inc(labels);
    }
  },
  
  recordDatabaseQuery: (table, operation, queryType, duration, success = true) => {
    const labels = { table, operation, query_type: queryType, success: success.toString() };
    
    dbQueryTotal.inc(labels);
    dbQueryDuration.observe(labels, duration / 1000);
    
    if (!success) {
      dbConnectionErrors.inc({ error_type: 'query_failed' });
    }
  },
  
  recordAuthAttempt: (success, ipAddress, userAgent) => {
    authAttempts.inc({ success, ip_address: ipAddress, user_agent: userAgent });
  },
  
  recordRateLimitHit: (ipAddress, endpoint, limitType) => {
    rateLimitHits.inc({ ip_address, endpoint, limit_type });
  },
  
  recordSecurityViolation: (violationType, ipAddress, severity = 'medium') => {
    securityViolations.inc({ violation_type, ip_address, severity });
  }
};
