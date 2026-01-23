const express = require('express');
const healthService = require('./health.service');
const enhancedHealth = require('./enhanced-health');
const serviceClients = require('../config/clients');

const router = express.Router();

/**
 * @route GET /health
 * @desc Health check simple pour load balancers
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await enhancedHealth.simpleHealthCheck();
    const statusCode = result.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route GET /health/detailed
 * @desc Health check détaillé avec tous les services
 * @access Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const forceCheck = req.query.force === 'true';
    const result = await enhancedHealth.performFullHealthCheck(forceCheck);
    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route GET /health/services
 * @desc Health check de tous les services externes
 * @access Public
 */
router.get('/services', async (req, res) => {
  try {
    const result = await serviceClients.checkAllServicesHealth();
    const statusCode = result.overall.healthy ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route GET /health/connectivity
 * @desc Test de connectivité avec tous les services
 * @access Public
 */
router.get('/connectivity', async (req, res) => {
  try {
    const result = await serviceClients.testAllConnectivity();
    const statusCode = result.overall.connected ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route GET /health/critical
 * @desc Health check des services critiques uniquement
 * @access Public
 */
router.get('/critical', async (req, res) => {
  try {
    const criticalServices = req.query.services 
      ? req.query.services.split(',') 
      : ['auth'];
    
    const result = await serviceClients.checkCriticalServices(criticalServices);
    const statusCode = result.allAvailable ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route GET /ready
 * @desc Readiness probe pour Kubernetes
 * @access Public
 */
router.get('/ready', async (req, res) => {
  try {
    const result = await healthService.readyCheck();
    const statusCode = result.status === 'ready' ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route GET /live
 * @desc Liveness probe pour Kubernetes
 * @access Public
 */
router.get('/live', async (req, res) => {
  try {
    const result = await healthService.liveCheck();
    res.status(200).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'not alive',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route GET /health/components/:component
 * @desc Health check d'un composant spécifique
 * @access Public
 */
router.get('/components/:component', async (req, res) => {
  try {
    const { component } = req.params;
    let result;

    switch (component) {
      case 'database':
        result = await healthService.checkDatabase();
        break;
      case 'auth-service':
        result = await serviceClients.auth.healthCheck();
        break;
      case 'notification-service':
        result = await serviceClients.notification.healthCheck();
        break;
      case 'payment-service':
        result = await serviceClients.payment.healthCheck();
        break;
      case 'ticket-generator':
        result = await serviceClients.ticketGenerator.healthCheck();
        break;
      case 'scan-validation':
        result = await serviceClients.scanValidation.healthCheck();
        break;
      case 'memory':
        result = enhancedHealth.checkMemory();
        break;
      case 'performance':
        result = await enhancedHealth.checkPerformance();
        break;
      default:
        return res.status(404).json({
          error: 'Component not found',
          available: [
            'database',
            'auth-service',
            'notification-service', 
            'payment-service',
            'ticket-generator',
            'scan-validation',
            'memory',
            'performance'
          ]
        });
    }

    const statusCode = result.success || result.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      component,
      checkedAt: new Date().toISOString(),
      ...result
    });
  } catch (error) {
    res.status(503).json({
      component: req.params.component,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route POST /health/cache/clear
 * @desc Nettoie les caches de santé
 * @access Private (nécessite permission admin)
 */
router.post('/cache/clear', async (req, res) => {
  try {
    enhancedHealth.clearCache();
    
    res.json({
      success: true,
      message: 'Health cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /health/config
 * @desc Configuration des services
 * @access Public
 */
router.get('/config', (req, res) => {
  try {
    const config = serviceClients.getServicesConfig();
    
    res.json({
      success: true,
      config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /health/stats
 * @desc Statistiques agrégées des services
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    const [servicesStats, healthStats] = await Promise.all([
      serviceClients.getAllServicesStats(),
      enhancedHealth.performFullHealthCheck(false)
    ]);

    res.json({
      success: true,
      services: servicesStats,
      health: {
        status: healthStats.status,
        summary: healthStats.summary,
        performance: healthStats.performance
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
