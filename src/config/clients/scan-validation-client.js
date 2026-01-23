const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Client HTTP pour le Scan Validation Service
 * Gère les communications avec le service de validation de tickets
 */
class ScanValidationClient {
  constructor() {
    this.baseURL = process.env.SCAN_SERVICE_URL || 'http://localhost:3005';
    this.apiKey = process.env.SCAN_SERVICE_API_KEY;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    });

    // Intercepteurs pour le logging et la gestion d'erreurs
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Scan validation service request', {
          method: config.method,
          url: config.url,
          service: 'scan-validation'
        });
        return config;
      },
      (error) => {
        logger.error('Scan validation service request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Scan validation service response', {
          status: response.status,
          url: response.config.url,
          service: 'scan-validation'
        });
        return response;
      },
      (error) => {
        logger.error('Scan validation service response error', {
          status: error.response?.status,
          message: error.message,
          service: 'scan-validation'
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Valide un ticket par scan
   * @param {string} qrCodeData - Données du QR code scanné
   * @param {Object} scanData - Données du scan
   * @returns {Promise<Object>} Résultat de la validation
   */
  async validateTicket(qrCodeData, scanData = {}) {
    try {
      const response = await this.client.post('/api/scan/validate', {
        qrCodeData,
        scannedAt: new Date().toISOString(),
        ...scanData
      });

      return {
        success: true,
        data: response.data,
        valid: response.data.valid,
        ticketInfo: response.data.ticketInfo,
        scanId: response.data.scanId
      };
    } catch (error) {
      logger.error('Failed to validate ticket scan', {
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message,
        valid: false
      };
    }
  }

  /**
   * Valide des tickets en lot (synchronisation offline)
   * @param {Array} scans - Liste des scans à synchroniser
   * @returns {Promise<Object>} Résultat de la synchronisation
   */
  async validateBatch(scans) {
    try {
      const response = await this.client.post('/api/scan/batch', {
        scans
      });

      return {
        success: true,
        data: response.data,
        processed: response.data.processed,
        valid: response.data.valid,
        invalid: response.data.invalid
      };
    } catch (error) {
      logger.error('Failed to validate batch scans', {
        scansCount: scans.length,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Récupère les statistiques de scan pour un événement
   * @param {string} eventId - ID de l'événement
   * @param {Object} filters - Filtres optionnels
   * @returns {Promise<Object>} Statistiques de scan
   */
  async getEventScanStats(eventId, filters = {}) {
    try {
      const response = await this.client.get(`/api/scan/event/${eventId}/stats`, {
        params: filters
      });

      return {
        success: true,
        data: response.data,
        totalScans: response.data.totalScans,
        uniqueTickets: response.data.uniqueTickets,
        scanRate: response.data.scanRate,
        hourlyStats: response.data.hourlyStats
      };
    } catch (error) {
      logger.error('Failed to get event scan stats', {
        eventId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Récupère l'historique des scans pour un ticket
   * @param {string} ticketCode - Code du ticket
   * @returns {Promise<Object>} Historique des scans
   */
  async getTicketScanHistory(ticketCode) {
    try {
      const response = await this.client.get(`/api/scan/ticket/${ticketCode}/history`);

      return {
        success: true,
        data: response.data,
        scans: response.data.scans,
        firstScan: response.data.firstScan,
        lastScan: response.data.lastScan,
        totalScans: response.data.totalScans
      };
    } catch (error) {
      logger.error('Failed to get ticket scan history', {
        ticketCode,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Télécharge les données pour le mode offline
   * @param {string} eventId - ID de l'événement
   * @param {Object} options - Options de téléchargement
   * @returns {Promise<Object>} Données offline
   */
  async downloadOfflineData(eventId, options = {}) {
    try {
      const response = await this.client.post('/api/sync/download', {
        eventId,
        ...options
      });

      return {
        success: true,
        data: response.data,
        tickets: response.data.tickets,
        checkpoints: response.data.checkpoints,
        lastSync: response.data.lastSync
      };
    } catch (error) {
      logger.error('Failed to download offline data', {
        eventId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Upload les scans effectués en mode offline
   * @param {string} deviceId - ID du device
   * @param {Array} scans - Liste des scans offline
   * @returns {Promise<Object>} Résultat de la synchronisation
   */
  async uploadOfflineScans(deviceId, scans) {
    try {
      const response = await this.client.post('/api/sync/upload', {
        deviceId,
        scans,
        uploadedAt: new Date().toISOString()
      });

      return {
        success: true,
        data: response.data,
        synced: response.data.synced,
        duplicates: response.data.duplicates,
        invalid: response.data.invalid
      };
    } catch (error) {
      logger.error('Failed to upload offline scans', {
        deviceId,
        scansCount: scans.length,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Récupère les points de contrôle d'un événement
   * @param {string} eventId - ID de l'événement
   * @returns {Promise<Object>} Points de contrôle
   */
  async getEventCheckpoints(eventId) {
    try {
      const response = await this.client.get(`/api/checkpoints/${eventId}`);

      return {
        success: true,
        data: response.data,
        checkpoints: response.data.checkpoints
      };
    } catch (error) {
      logger.error('Failed to get event checkpoints', {
        eventId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Crée un point de contrôle pour un événement
   * @param {string} eventId - ID de l'événement
   * @param {Object} checkpointData - Données du point de contrôle
   * @returns {Promise<Object>} Point de contrôle créé
   */
  async createCheckpoint(eventId, checkpointData) {
    try {
      const response = await this.client.post(`/api/checkpoints/${eventId}`, checkpointData);

      return {
        success: true,
        data: response.data,
        checkpointId: response.data.id
      };
    } catch (error) {
      logger.error('Failed to create checkpoint', {
        eventId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Met à jour un point de contrôle
   * @param {string} checkpointId - ID du point de contrôle
   * @param {Object} updateData - Données de mise à jour
   * @returns {Promise<Object>} Point de contrôle mis à jour
   */
  async updateCheckpoint(checkpointId, updateData) {
    try {
      const response = await this.client.put(`/api/checkpoints/${checkpointId}`, updateData);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to update checkpoint', {
        checkpointId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Désactive un point de contrôle
   * @param {string} checkpointId - ID du point de contrôle
   * @returns {Promise<Object>} Résultat de la désactivation
   */
  async deactivateCheckpoint(checkpointId) {
    try {
      const response = await this.client.delete(`/api/checkpoints/${checkpointId}`);

      return {
        success: true,
        data: response.data,
        deactivated: true
      };
    } catch (error) {
      logger.error('Failed to deactivate checkpoint', {
        checkpointId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message,
        deactivated: false
      };
    }
  }

  /**
   * Récupère les scans en temps réel pour un événement
   * @param {string} eventId - ID de l'événement
   * @param {Object} filters - Filtres optionnels
   * @returns {Promise<Object>} Scans en temps réel
   */
  async getRealtimeScans(eventId, filters = {}) {
    try {
      const response = await this.client.get(`/api/scan/event/${eventId}/realtime`, {
        params: filters
      });

      return {
        success: true,
        data: response.data,
        recentScans: response.data.recentScans,
        currentRate: response.data.currentRate,
        peakHour: response.data.peakHour
      };
    } catch (error) {
      logger.error('Failed to get realtime scans', {
        eventId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Génère un rapport de scan pour un événement
   * @param {string} eventId - ID de l'événement
   * @param {Object} options - Options du rapport
   * @returns {Promise<Object>} Rapport de scan
   */
  async generateScanReport(eventId, options = {}) {
    try {
      const response = await this.client.post(`/api/scan/event/${eventId}/report`, options);

      return {
        success: true,
        data: response.data,
        reportUrl: response.data.reportUrl,
        summary: response.data.summary
      };
    } catch (error) {
      logger.error('Failed to generate scan report', {
        eventId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Vérifie la santé du service de validation
   * @returns {Promise<Object>} État de santé du service
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });

      return {
        success: true,
        status: 'healthy',
        data: response.data,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
    } catch (error) {
      logger.error('Scan validation service health check failed', {
        error: error.message
      });
      return {
        success: false,
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Test la connectivité avec le service
   * @returns {Promise<Object>} Résultat du test de connectivité
   */
  async testConnectivity() {
    try {
      const startTime = Date.now();
      const response = await this.client.get('/api/health/ping', { timeout: 3000 });
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        connected: true,
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Scan service connectivity test failed', {
        error: error.message
      });
      return {
        success: false,
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = new ScanValidationClient();
