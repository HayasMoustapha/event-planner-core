const authClient = require('../auth-client');
const notificationClient = require('./notification-client');
const paymentClient = require('./payment-client');
const ticketGeneratorClient = require('./ticket-generator-client');
const scanValidationClient = require('./scan-validation-client');

/**
 * Centralisation de tous les clients HTTP pour les services externes
 * Fournit un point d'accès unique et des méthodes utilitaires
 */
class ServiceClients {
  constructor() {
    this.auth = authClient;
    this.notification = notificationClient;
    this.payment = paymentClient;
    this.ticketGenerator = ticketGeneratorClient;
    this.scanValidation = scanValidationClient;
  }

  /**
   * Vérifie la santé de tous les services
   * @returns {Promise<Object>} État de santé de tous les services
   */
  async checkAllServicesHealth() {
    const services = {
      auth: { name: 'Auth Service', client: this.auth },
      notification: { name: 'Notification Service', client: this.notification },
      payment: { name: 'Payment Service', client: this.payment },
      ticketGenerator: { name: 'Ticket Generator', client: this.ticketGenerator },
      scanValidation: { name: 'Scan Validation', client: this.scanValidation }
    };

    const healthChecks = {};
    let overallHealthy = true;

    // Exécuter tous les health checks en parallèle
    const promises = Object.entries(services).map(async ([key, service]) => {
      try {
        const health = await service.client.healthCheck();
        healthChecks[key] = {
          name: service.name,
          ...health,
          checkedAt: new Date().toISOString()
        };
        
        if (!health.success) {
          overallHealthy = false;
        }
      } catch (error) {
        healthChecks[key] = {
          name: service.name,
          success: false,
          status: 'error',
          error: error.message,
          checkedAt: new Date().toISOString()
        };
        overallHealthy = false;
      }
    });

    await Promise.all(promises);

    return {
      overall: {
        healthy: overallHealthy,
        checkedAt: new Date().toISOString(),
        servicesCount: Object.keys(services).length,
        healthyCount: Object.values(healthChecks).filter(h => h.success).length
      },
      services: healthChecks
    };
  }

  /**
   * Test la connectivité avec tous les services
   * @returns {Promise<Object>} Résultat des tests de connectivité
   */
  async testAllConnectivity() {
    const services = {
      auth: { name: 'Auth Service', client: this.auth },
      notification: { name: 'Notification Service', client: this.notification },
      payment: { name: 'Payment Service', client: this.payment },
      ticketGenerator: { name: 'Ticket Generator', client: this.ticketGenerator },
      scanValidation: { name: 'Scan Validation', client: this.scanValidation }
    };

    const connectivityTests = {};
    let overallConnected = true;

    for (const [key, service] of Object.entries(services)) {
      try {
        // Utiliser la méthode de test de connectivité si disponible, sinon health check
        const test = service.client.testConnectivity 
          ? await service.client.testConnectivity()
          : await service.client.healthCheck();
          
        connectivityTests[key] = {
          name: service.name,
          connected: test.success || test.connected,
          responseTime: test.responseTime,
          testedAt: new Date().toISOString()
        };

        if (!test.success && !test.connected) {
          overallConnected = false;
        }
      } catch (error) {
        connectivityTests[key] = {
          name: service.name,
          connected: false,
          error: error.message,
          testedAt: new Date().toISOString()
        };
        overallConnected = false;
      }
    }

    return {
      overall: {
        connected: overallConnected,
        testedAt: new Date().toISOString(),
        servicesCount: Object.keys(services).length,
        connectedCount: Object.values(connectivityTests).filter(t => t.connected).length
      },
      services: connectivityTests
    };
  }

  /**
   * Récupère les statistiques de tous les services qui le supportent
   * @returns {Promise<Object>} Statistiques agrégées
   */
  async getAllServicesStats() {
    const stats = {};

    // Stats du ticket generator
    try {
      stats.ticketGenerator = await this.ticketGenerator.getGenerationStats();
    } catch (error) {
      stats.ticketGenerator = { error: error.message };
    }

    // Stats du scan validation
    try {
      // Pourrait ajouter une méthode getStats dans le client de scan
      stats.scanValidation = { available: true };
    } catch (error) {
      stats.scanValidation = { error: error.message };
    }

    return {
      retrievedAt: new Date().toISOString(),
      services: stats
    };
  }

  /**
   * Vérifie si les services critiques sont disponibles
   * @param {Array} criticalServices - Liste des services critiques
   * @returns {Promise<Object>} Disponibilité des services critiques
   */
  async checkCriticalServices(criticalServices = ['auth']) {
    const health = await this.checkAllServicesHealth();
    const criticalStatus = {};

    for (const service of criticalServices) {
      if (health.services[service]) {
        criticalStatus[service] = {
          available: health.services[service].success,
          status: health.services[service].status
        };
      } else {
        criticalStatus[service] = {
          available: false,
          status: 'not_found'
        };
      }
    }

    const allCriticalAvailable = Object.values(criticalStatus).every(s => s.available);

    return {
      allAvailable: allCriticalAvailable,
      checkedAt: new Date().toISOString(),
      services: criticalStatus
    };
  }

  /**
   * Obtient la configuration actuelle des services
   * @returns {Object} Configuration des services
   */
  getServicesConfig() {
    return {
      auth: {
        url: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
        configured: !!process.env.AUTH_SERVICE_TOKEN
      },
      notification: {
        url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002',
        configured: !!process.env.NOTIFICATION_SERVICE_API_KEY
      },
      payment: {
        url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003',
        configured: !!process.env.PAYMENT_SERVICE_API_KEY
      },
      ticketGenerator: {
        url: process.env.TICKET_GENERATOR_URL || 'http://localhost:3004',
        configured: !!process.env.TICKET_GENERATOR_API_KEY
      },
      scanValidation: {
        url: process.env.SCAN_SERVICE_URL || 'http://localhost:3005',
        configured: !!process.env.SCAN_SERVICE_API_KEY
      }
    };
  }

  /**
   * Recharge un client spécifique (utile pour les changements de config)
   * @param {string} serviceName - Nom du service à recharger
   * @returns {boolean} True si rechargé avec succès
   */
  async reloadService(serviceName) {
    try {
      switch (serviceName) {
        case 'auth':
          // Le client auth est un singleton, pas besoin de recharger
          return true;
        case 'notification':
          // Pourrait implémenter une méthode de rechargement si nécessaire
          return true;
        case 'payment':
          return true;
        case 'ticketGenerator':
          return true;
        case 'scanValidation':
          return true;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}

// Exporter une instance singleton
module.exports = new ServiceClients();
