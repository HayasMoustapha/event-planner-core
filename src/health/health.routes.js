const express = require('express');
const healthService = require('./health.service');

const router = express.Router();

/**
 * @route GET /health
 * @desc Health check simple
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await healthService.simpleCheck();
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
 * @desc Health check détaillé de tous les composants
 * @access Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const result = await healthService.runAllChecks();
    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'warning' ? 200 : 503;
    
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
        result = await healthService.checkAuthService();
        break;
      case 'filesystem':
        result = await healthService.checkFileSystem();
        break;
      case 'memory':
        result = await healthService.checkMemory();
        break;
      case 'cpu':
        result = await healthService.checkCPU();
        break;
      case 'disk':
        result = await healthService.checkDiskSpace();
        break;
      default:
        return res.status(404).json({
          error: 'Component not found',
          available: ['database', 'auth-service', 'filesystem', 'memory', 'cpu', 'disk']
        });
    }

    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json({
      component,
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

module.exports = router;
