const serviceClients = require('../config/clients');
const database = require('../config/database');
const logger = require('../utils/logger');

/**
 * Service de santé amélioré pour le Core Service
 * Vérifie la santé de tous les services dépendants
 */
class EnhancedHealthService {
  constructor() {
    this.lastHealthCheck = null;
    this.healthCache = new Map();
    this.cacheTimeout = 30000; // 30 secondes de cache
  }

  /**
   * Effectue un health check complet
   * @param {boolean} forceCheck - Force le check sans utiliser le cache
   * @returns {Promise<Object>} État de santé complet
   */
  async performFullHealthCheck(forceCheck = false) {
    const now = Date.now();
    
    // Utiliser le cache si disponible et pas de force
    if (!forceCheck && this.lastHealthCheck && (now - this.lastHealthCheck < this.cacheTimeout)) {
      return this.healthCache.get('full') || this.generateErrorResponse('Cache error');
    }

    try {
      const healthResults = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        checks: {},
        dependencies: {},
        performance: {},
        summary: {
          totalChecks: 0,
          passedChecks: 0,
          failedChecks: 0
        }
      };

      // Check de la base de données
      const dbHealth = await this.checkDatabase();
      healthResults.dependencies.database = dbHealth;
      healthResults.summary.totalChecks++;
      if (dbHealth.status === 'healthy') {
        healthResults.summary.passedChecks++;
      } else {
        healthResults.summary.failedChecks++;
        healthResults.status = 'degraded';
      }

      // Check des services externes
      const servicesHealth = await serviceClients.checkAllServicesHealth();
      healthResults.dependencies.services = servicesHealth;
      
      // Compter les services
      Object.values(servicesHealth.services).forEach(service => {
        healthResults.summary.totalChecks++;
        if (service.success) {
          healthResults.summary.passedChecks++;
        } else {
          healthResults.summary.failedChecks++;
        }
      });

      // Check des performances
      const performanceHealth = await this.checkPerformance();
      healthResults.performance = performanceHealth;

      // Check de la mémoire
      const memoryHealth = this.checkMemory();
      healthResults.checks.memory = memoryHealth;
      healthResults.summary.totalChecks++;
      if (memoryHealth.status === 'healthy') {
        healthResults.summary.passedChecks++;
      } else {
        healthResults.summary.failedChecks++;
        if (memoryHealth.status === 'critical') {
          healthResults.status = 'unhealthy';
        }
      }

      // Déterminer le statut final
      if (healthResults.summary.failedChecks === 0) {
        healthResults.status = 'healthy';
      } else if (healthResults.summary.failedChecks <= healthResults.summary.totalChecks / 2) {
        healthResults.status = 'degraded';
      } else {
        healthResults.status = 'unhealthy';
      }

      // Mettre en cache
      this.lastHealthCheck = now;
      this.healthCache.set('full', healthResults);

      return healthResults;

    } catch (error) {
      logger.error('Full health check failed', { error: error.message });
      return this.generateErrorResponse(error.message);
    }
  }

  /**
   * Vérifie la santé de la base de données
   * @returns {Promise<Object>} État de santé de la BDD
   */
  async checkDatabase() {
    try {
      const startTime = Date.now();
      
      // Test de connexion simple
      await database.query('SELECT 1');
      
      const responseTime = Date.now() - startTime;
      
      // Test plus approfondi si possible
      const poolStats = await this.getDatabasePoolStats();
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        connected: true,
        pool: poolStats,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        checkedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Récupère les statistiques du pool de connexions
   * @returns {Promise<Object>} Stats du pool
   */
  async getDatabasePoolStats() {
    try {
      const pool = database.pool;
      if (!pool) {
        return { available: false };
      }

      return {
        available: true,
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Vérifie les performances du système
   * @returns {Promise<Object>} État des performances
   */
  async checkPerformance() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Calculer le pourcentage de mémoire utilisée
      const totalMemory = require('os').totalmem();
      const memoryUsagePercent = (memUsage.heapUsed / totalMemory) * 100;

      // Test de performance simple
      const perfStartTime = Date.now();
      await this.performPerformanceTest();
      const perfResponseTime = Date.now() - perfStartTime;

      return {
        status: 'healthy',
        memory: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
          usagePercent: memoryUsagePercent.toFixed(2)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        performance: {
          responseTime: perfResponseTime,
          status: perfResponseTime < 100 ? 'excellent' : perfResponseTime < 500 ? 'good' : 'degraded'
        },
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        checkedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Test de performance simple
   * @returns {Promise<void>}
   */
  async performPerformanceTest() {
    // Opération simple pour mesurer la performance
    const testArray = new Array(1000).fill(0).map((_, i) => i * 2);
    testArray.reduce((sum, val) => sum + val, 0);
  }

  /**
   * Vérifie l'utilisation de la mémoire
   * @returns {Object} État de la mémoire
   */
  checkMemory() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const systemMemoryPercent = ((totalMemory - freeMemory) / totalMemory) * 100;

    let status = 'healthy';
    if (heapUsedPercent > 90 || systemMemoryPercent > 90) {
      status = 'critical';
    } else if (heapUsedPercent > 80 || systemMemoryPercent > 80) {
      status = 'degraded';
    }

    return {
      status,
      heap: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        usagePercent: heapUsedPercent.toFixed(2)
      },
      system: {
        total: totalMemory,
        free: freeMemory,
        usagePercent: systemMemoryPercent.toFixed(2)
      },
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Génère une réponse d'erreur pour le health check
   * @param {string} error - Message d'erreur
   * @returns {Object} Réponse d'erreur
   */
  generateErrorResponse(error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error,
      checks: {},
      dependencies: {},
      performance: {},
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 1
      }
    };
  }

  /**
   * Health check simple pour les load balancers
   * @returns {Promise<Object>} Health check simple
   */
  async simpleHealthCheck() {
    try {
      // Vérification rapide de la BDD
      await database.query('SELECT 1');
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Health check détaillé pour le monitoring
   * @returns {Promise<Object>} Health check détaillé
   */
  async detailedHealthCheck() {
    const fullHealth = await this.performFullHealthCheck();
    
    // Ajouter des informations détaillées
    return {
      ...fullHealth,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
        uptimeFormatted: this.formatUptime(process.uptime())
      },
      environment: process.env.NODE_ENV || 'unknown',
      version: require('../../package.json').version
    };
  }

  /**
   * Formate le temps d'exécution en format lisible
   * @param {number} seconds - Secondes
   * @returns {string} Temps formaté
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Nettoie le cache des health checks
   */
  clearCache() {
    this.healthCache.clear();
    this.lastHealthCheck = null;
  }

  /**
   * Force le prochain health check à ignorer le cache
   */
  forceNextCheck() {
    this.lastHealthCheck = 0;
  }
}

module.exports = new EnhancedHealthService();
