const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Client HTTP pour le Ticket Generator Service
 * Gère les communications avec le service de génération de tickets
 */
class TicketGeneratorClient {
  constructor() {
    this.baseURL = process.env.TICKET_GENERATOR_URL || 'http://localhost:3004';
    this.apiKey = process.env.TICKET_GENERATOR_API_KEY;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // Timeout plus long pour la génération de PDF
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    });

    // Intercepteurs pour le logging et la gestion d'erreurs
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Ticket generator service request', {
          method: config.method,
          url: config.url,
          service: 'ticket-generator'
        });
        return config;
      },
      (error) => {
        logger.error('Ticket generator service request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Ticket generator service response', {
          status: response.status,
          url: response.config.url,
          service: 'ticket-generator'
        });
        return response;
      },
      (error) => {
        logger.error('Ticket generator service response error', {
          status: error.response?.status,
          message: error.message,
          service: 'ticket-generator'
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Génère un ticket unique
   * @param {Object} ticketData - Données du ticket
   * @param {Object} options - Options de génération
   * @returns {Promise<Object>} Ticket généré
   */
  async generateTicket(ticketData, options = {}) {
    try {
      const response = await this.client.post('/api/tickets/generate', {
        ticketData,
        ...options
      });

      return {
        success: true,
        data: response.data,
        ticketId: response.data.ticketId,
        qrCode: response.data.qrCode,
        pdfUrl: response.data.pdfUrl
      };
    } catch (error) {
      logger.error('Failed to generate ticket', {
        ticketId: ticketData.id,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Génère des tickets en lot (batch processing)
   * @param {Array} tickets - Liste des données de tickets
   * @param {Object} options - Options de génération
   * @returns {Promise<Object>} Job de génération créé
   */
  async generateBatch(tickets, options = {}) {
    try {
      const response = await this.client.post('/api/tickets/batch', {
        tickets,
        ...options
      });

      return {
        success: true,
        data: response.data,
        jobId: response.data.jobId,
        totalTickets: tickets.length
      };
    } catch (error) {
      logger.error('Failed to generate batch tickets', {
        ticketsCount: tickets.length,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Télécharge un ticket au format PDF
   * @param {string} ticketId - ID du ticket
   * @returns {Promise<Object>} URL de téléchargement du PDF
   */
  async downloadTicketPDF(ticketId) {
    try {
      const response = await this.client.get(`/api/tickets/${ticketId}/download`);

      return {
        success: true,
        data: response.data,
        pdfUrl: response.data.pdfUrl,
        downloadUrl: response.data.downloadUrl
      };
    } catch (error) {
      logger.error('Failed to download ticket PDF', {
        ticketId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Récupère le QR code d'un ticket
   * @param {string} ticketId - ID du ticket
   * @param {Object} options - Options du QR code
   * @returns {Promise<Object>} Données du QR code
   */
  async getTicketQRCode(ticketId, options = {}) {
    try {
      const response = await this.client.get(`/api/tickets/${ticketId}/qrcode`, {
        params: options
      });

      return {
        success: true,
        data: response.data,
        qrCode: response.data.qrCode,
        qrCodeUrl: response.data.qrCodeUrl
      };
    } catch (error) {
      logger.error('Failed to get ticket QR code', {
        ticketId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Récupère le statut d'un job de génération batch
   * @param {string} jobId - ID du job
   * @returns {Promise<Object>} Statut du job
   */
  async getJobStatus(jobId) {
    try {
      const response = await this.client.get(`/api/jobs/${jobId}`);

      return {
        success: true,
        data: response.data,
        status: response.data.status,
        progress: response.data.progress,
        completed: response.data.completed,
        failed: response.data.failed
      };
    } catch (error) {
      logger.error('Failed to get job status', {
        jobId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Annule un job de génération
   * @param {string} jobId - ID du job à annuler
   * @returns {Promise<Object>} Résultat de l'annulation
   */
  async cancelJob(jobId) {
    try {
      const response = await this.client.delete(`/api/jobs/${jobId}`);

      return {
        success: true,
        data: response.data,
        cancelled: true
      };
    } catch (error) {
      logger.error('Failed to cancel job', {
        jobId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message,
        cancelled: false
      };
    }
  }

  /**
   * Récupère les résultats d'un job complété
   * @param {string} jobId - ID du job
   * @returns {Promise<Object>} Résultats du job
   */
  async getJobResults(jobId) {
    try {
      const response = await this.client.get(`/api/jobs/${jobId}/results`);

      return {
        success: true,
        data: response.data,
        tickets: response.data.tickets,
        downloadUrls: response.data.downloadUrls
      };
    } catch (error) {
      logger.error('Failed to get job results', {
        jobId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Valide un ticket (vérifie l'authenticité du QR code)
   * @param {string} qrCodeData - Données du QR code
   * @param {string} signature - Signature du ticket
   * @returns {Promise<Object>} Résultat de la validation
   */
  async validateTicket(qrCodeData, signature) {
    try {
      const response = await this.client.post('/api/tickets/validate', {
        qrCodeData,
        signature
      });

      return {
        success: true,
        data: response.data,
        valid: response.data.valid,
        ticketInfo: response.data.ticketInfo
      };
    } catch (error) {
      logger.error('Failed to validate ticket', {
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
   * Régénère un ticket (nouveau QR code et PDF)
   * @param {string} ticketId - ID du ticket à régénérer
   * @param {Object} options - Options de régénération
   * @returns {Promise<Object>} Ticket régénéré
   */
  async regenerateTicket(ticketId, options = {}) {
    try {
      const response = await this.client.post(`/api/tickets/${ticketId}/regenerate`, options);

      return {
        success: true,
        data: response.data,
        newQRCode: response.data.qrCode,
        newPdfUrl: response.data.pdfUrl
      };
    } catch (error) {
      logger.error('Failed to regenerate ticket', {
        ticketId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Vérifie la santé du service de génération de tickets
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
      logger.error('Ticket generator service health check failed', {
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
   * Récupère les statistiques de génération
   * @param {Object} filters - Filtres pour les stats
   * @returns {Promise<Object>} Statistiques de génération
   */
  async getGenerationStats(filters = {}) {
    try {
      const response = await this.client.get('/api/stats/generation', {
        params: filters
      });

      return {
        success: true,
        data: response.data,
        totalGenerated: response.data.totalGenerated,
        averageTime: response.data.averageTime,
        successRate: response.data.successRate
      };
    } catch (error) {
      logger.error('Failed to get generation stats', {
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new TicketGeneratorClient();
