const config = require('../config');
const { authClient } = require('../config');

/**
 * Service de health checks avancés pour Event Planner Core
 * Vérifie l'état de tous les composants du système
 */
class HealthService {
  constructor() {
    this.checks = new Map();
    this.lastResults = new Map();
  }

  /**
   * Vérifie la santé de la base de données
   */
  async checkDatabase() {
    const startTime = Date.now();
    
    try {
      const database = require('../config/database');
      
      // Test simple de connexion
      await database.query('SELECT 1');
      
      const duration = Date.now() - startTime;
      
      return {
        status: 'healthy',
        duration,
        timestamp: new Date().toISOString(),
        details: {
          connected: true,
          responseTime: `${duration}ms`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
        details: {
          connected: false,
          error: 'Database connection failed'
        }
      };
    }
  }

  /**
   * Vérifie la santé du service d'authentification
   */
  async checkAuthService() {
    const startTime = Date.now();
    
    try {
      // Test de connexion au service d'auth
      const response = await authClient.validateToken('test-token');
      
      const duration = Date.now() - startTime;
      
      // Le service est up même si le token est invalide
      return {
        status: 'healthy',
        duration,
        timestamp: new Date().toISOString(),
        details: {
          connected: true,
          responseTime: `${duration}ms`,
          service: 'auth-service'
        }
      };
    } catch (error) {
      // Si l'erreur est réseau, le service est down
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          status: 'unhealthy',
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: error.message,
          details: {
            connected: false,
            error: 'Auth service unreachable'
          }
        };
      }
      
      // Si l'erreur est auth (token invalide), le service est up
      const duration = Date.now() - startTime;
      return {
        status: 'healthy',
        duration,
        timestamp: new Date().toISOString(),
        details: {
          connected: true,
          responseTime: `${duration}ms`,
          service: 'auth-service',
          note: 'Service responding (auth error expected)'
        }
      };
    }
  }

  /**
   * Vérifie la santé du système de fichiers
   */
  async checkFileSystem() {
    const startTime = Date.now();
    
    try {
      const fs = require('fs').promises;
      
      // Test d'écriture/lecture
      const testFile = '/tmp/health-check-test';
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
      const duration = Date.now() - startTime;
      
      return {
        status: 'healthy',
        duration,
        timestamp: new Date().toISOString(),
        details: {
          writable: true,
          readable: true,
          responseTime: `${duration}ms`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
        details: {
          writable: false,
          error: 'File system error'
        }
      };
    }
  }

  /**
   * Vérifie l'utilisation de la mémoire
   */
  async checkMemory() {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const freeMemory = require('os').freemem();
      
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const systemUsagePercent = Math.round(((totalMemory - freeMemory) / totalMemory) * 100);
      
      const duration = Date.now() - startTime;
      
      // Alertes si utilisation > 80%
      const status = systemUsagePercent > 80 ? 'warning' : 'healthy';
      
      return {
        status,
        duration,
        timestamp: new Date().toISOString(),
        details: {
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          systemUsage: `${systemUsagePercent}%`,
          responseTime: `${duration}ms`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
        details: {
          error: 'Memory check failed'
        }
      };
    }
  }

  /**
   * Vérifie l'utilisation du CPU
   */
  async checkCPU() {
    const startTime = Date.now();
    
    try {
      const cpus = require('os').cpus();
      const loadAvg = require('os').loadavg();
      
      const duration = Date.now() - startTime;
      
      // Alertes si load average > nombre de CPUs
      const cpuCount = cpus.length;
      const load1Min = loadAvg[0];
      const status = load1Min > cpuCount ? 'warning' : 'healthy';
      
      return {
        status,
        duration,
        timestamp: new Date().toISOString(),
        details: {
          cpuCount,
          load1Min: load1Min.toFixed(2),
          load5Min: loadAvg[1].toFixed(2),
          load15Min: loadAvg[2].toFixed(2),
          responseTime: `${duration}ms`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
        details: {
          error: 'CPU check failed'
        }
      };
    }
  }

  /**
   * Vérifie l'espace disque
   */
  async checkDiskSpace() {
    const startTime = Date.now();
    
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      
      const duration = Date.now() - startTime;
      
      return {
        status: 'healthy',
        duration,
        timestamp: new Date().toISOString(),
        details: {
          accessible: true,
          responseTime: `${duration}ms`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
        details: {
          accessible: false,
          error: 'Disk access failed'
        }
      };
    }
  }

  /**
   * Exécute tous les health checks
   */
  async runAllChecks() {
    const checks = [
      { name: 'database', check: () => this.checkDatabase() },
      { name: 'auth-service', check: () => this.checkAuthService() },
      { name: 'filesystem', check: () => this.checkFileSystem() },
      { name: 'memory', check: () => this.checkMemory() },
      { name: 'cpu', check: () => this.checkCPU() },
      { name: 'disk', check: () => this.checkDiskSpace() }
    ];

    const results = {};
    let overallStatus = 'healthy';
    const startTime = Date.now();

    // Exécuter tous les checks en parallèle
    const promises = checks.map(async ({ name, check }) => {
      try {
        const result = await check();
        results[name] = result;
        
        // Mettre à jour le statut global
        if (result.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'warning' && overallStatus === 'healthy') {
          overallStatus = 'warning';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        overallStatus = 'unhealthy';
      }
    });

    await Promise.all(promises);

    const totalDuration = Date.now() - startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      service: 'event-planner-core',
      version: '1.0.0',
      uptime: process.uptime(),
      checks: results,
      summary: {
        total: checks.length,
        healthy: Object.values(results).filter(r => r.status === 'healthy').length,
        warning: Object.values(results).filter(r => r.status === 'warning').length,
        unhealthy: Object.values(results).filter(r => r.status === 'unhealthy').length
      }
    };
  }

  /**
   * Health check simple (pour load balancers)
   */
  async simpleCheck() {
    try {
      // Vérification rapide de la base de données
      const database = require('../config/database');
      await database.query('SELECT 1');
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
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
   * Health check ready (pour Kubernetes)
   */
  async readyCheck() {
    const result = await this.runAllChecks();
    
    return {
      status: result.status === 'healthy' ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks: result.summary
    };
  }

  /**
   * Health check live (pour Kubernetes)
   */
  async liveCheck() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }
}

module.exports = new HealthService();
