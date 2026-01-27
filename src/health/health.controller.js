/**
 * HEALTH CHECK CONTROLLER
 * Vérifie l'état de santé du service et de ses dépendances
 */

class HealthController {
  async checkHealth(req, res) {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: process.env.SERVICE_NAME || 'unknown',
        version: process.env.SERVICE_VERSION || '1.0.0',
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development',
        dependencies: {
          database: 'unknown',
          redis: 'unknown'
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      // Vérifier la connexion à la base de données
      try {
        const { database } = require('../config');
        await database.query('SELECT 1');
        healthStatus.dependencies.database = 'connected';
      } catch (dbError) {
        healthStatus.dependencies.database = 'error';
        healthStatus.status = 'degraded';
      }

      // Vérifier Redis si disponible
      try {
        const redis = require('../config/redis');
        await redis.ping();
        healthStatus.dependencies.redis = 'connected';
      } catch (redisError) {
        healthStatus.dependencies.redis = 'error';
        healthStatus.status = 'degraded';
      }

      // Si le service est en dégradation, retourner 503
      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({
        success: healthStatus.status === 'healthy',
        data: healthStatus
      });

    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Service unavailable',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async checkReadiness(req, res) {
    try {
      // Vérifier que le service est prêt à accepter du trafic
      const readyStatus = {
        ready: true,
        timestamp: new Date().toISOString(),
        checks: {
          database: false
        }
      };

      // Vérifier la base de données
      try {
        const { database } = require('../config');
        await database.query('SELECT 1');
        readyStatus.checks.database = true;
      } catch (error) {
        readyStatus.ready = false;
        readyStatus.checks.database = false;
      }

      const statusCode = readyStatus.ready ? 200 : 503;
      
      res.status(statusCode).json({
        success: readyStatus.ready,
        data: readyStatus
      });

    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Service not ready',
        message: error.message
      });
    }
  }

  async checkLiveness(req, res) {
    try {
      // Vérifier que le service est en vie (pas figé)
      const livenessStatus = {
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      // Si le service est en vie depuis moins de 5 secondes, on considère qu'il démarre
      if (process.uptime() < 5) {
        livenessStatus.alive = false;
        livenessStatus.status = 'starting';
      } else {
        livenessStatus.status = 'running';
      }

      const statusCode = livenessStatus.alive ? 200 : 503;
      
      res.status(statusCode).json({
        success: livenessStatus.alive,
        data: livenessStatus
      });

    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Service not alive',
        message: error.message
      });
    }
  }
}

module.exports = new HealthController();
