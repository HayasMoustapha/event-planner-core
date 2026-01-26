/**
 * HEALTH CHECK CONTROLLER
 * Vérifie l'état de santé du service et de ses dépendances
 */

class HealthController {
  async checkHealth(req, res) {
    try {
      console.log('🧪 [TEST LOG] HealthController.checkHealth - ENTRY');
      
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: process.env.SERVICE_NAME || 'unknown',
        version: process.env.SERVICE_VERSION || '1.0.0',
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development',
        security: {
          disabled: process.env.DISABLE_SECURITY === 'true'
        },
        dependencies: {
          database: 'unknown',
          redis: 'unknown'
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      console.log('🧪 [TEST LOG] HealthController.checkHealth - Checking dependencies...');

      // Vérifier la connexion à la base de données
      try {
        const { database } = require('../config');
        await database.query('SELECT 1');
        healthStatus.dependencies.database = 'connected';
        console.log('🧪 [TEST LOG] HealthController.checkHealth - Database OK');
      } catch (dbError) {
        healthStatus.dependencies.database = 'error';
        healthStatus.status = 'degraded';
        console.log('🧪 [TEST LOG] HealthController.checkHealth - Database ERROR:', dbError.message);
      }

      // Vérifier Redis si disponible
      try {
        const redis = require('../config/redis');
        await redis.ping();
        healthStatus.dependencies.redis = 'connected';
        console.log('🧪 [TEST LOG] HealthController.checkHealth - Redis OK');
      } catch (redisError) {
        healthStatus.dependencies.redis = 'error';
        healthStatus.status = 'degraded';
        console.log('🧪 [TEST LOG] HealthController.checkHealth - Redis ERROR:', redisError.message);
      }

      console.log('🧪 [TEST LOG] HealthController.checkHealth - Final status:', healthStatus);

      // Si le service est en dégradation, retourner 503
      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({
        success: healthStatus.status === 'healthy',
        data: healthStatus
      });

    } catch (error) {
      console.log('🧪 [TEST LOG] HealthController.checkHealth - CRITICAL ERROR:', error.message);
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
      console.log('🧪 [TEST LOG] HealthController.checkReadiness - ENTRY');
      
      // Vérifier que le service est prêt à accepter du trafic
      const readyStatus = {
        ready: true,
        timestamp: new Date().toISOString(),
        checks: {
          database: false,
          security: process.env.DISABLE_SECURITY === 'true' ? 'disabled' : 'enabled'
        }
      };

      // Vérifier la base de données
      try {
        const { database } = require('../config');
        await database.query('SELECT 1');
        readyStatus.checks.database = true;
        console.log('🧪 [TEST LOG] HealthController.checkReadiness - Database ready');
      } catch (error) {
        readyStatus.ready = false;
        readyStatus.checks.database = false;
        console.log('🧪 [TEST LOG] HealthController.checkReadiness - Database not ready:', error.message);
      }

      const statusCode = readyStatus.ready ? 200 : 503;
      
      console.log('🧪 [TEST LOG] HealthController.checkReadiness - Ready status:', readyStatus);
      
      res.status(statusCode).json({
        success: readyStatus.ready,
        data: readyStatus
      });

    } catch (error) {
      console.log('🧪 [TEST LOG] HealthController.checkReadiness - ERROR:', error.message);
      res.status(503).json({
        success: false,
        error: 'Service not ready',
        message: error.message
      });
    }
  }

  async checkLiveness(req, res) {
    try {
      console.log('🧪 [TEST LOG] HealthController.checkLiveness - ENTRY');
      
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

      console.log('🧪 [TEST LOG] HealthController.checkLiveness - Liveness status:', livenessStatus);

      const statusCode = livenessStatus.alive ? 200 : 503;
      
      res.status(statusCode).json({
        success: livenessStatus.alive,
        data: livenessStatus
      });

    } catch (error) {
      console.log('🧪 [TEST LOG] HealthController.checkLiveness - ERROR:', error.message);
      res.status(503).json({
        success: false,
        error: 'Service not alive',
        message: error.message
      });
    }
  }
}

module.exports = new HealthController();
