const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Client HTTP pour le Notification Service
 * Gère les communications avec le service de notifications
 */
class NotificationClient {
  constructor() {
    this.baseURL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';
    this.apiKey = process.env.NOTIFICATION_SERVICE_API_KEY;
    
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
        logger.debug('Notification service request', {
          method: config.method,
          url: config.url,
          service: 'notification'
        });
        return config;
      },
      (error) => {
        logger.error('Notification service request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Notification service response', {
          status: response.status,
          url: response.config.url,
          service: 'notification'
        });
        return response;
      },
      (error) => {
        logger.error('Notification service response error', {
          status: error.response?.status,
          message: error.message,
          service: 'notification'
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Envoie un email transactionnel
   * @param {string} to - Email du destinataire
   * @param {string} template - Template à utiliser
   * @param {Object} data - Données du template
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendEmail(to, template, data) {
    try {
      const response = await this.client.post('/api/email/send', {
        to,
        template,
        data
      });

      return {
        success: true,
        data: response.data,
        messageId: response.data.messageId
      };
    } catch (error) {
      logger.error('Failed to send email via notification service', {
        to,
        template,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Met en file d'attente des emails en masse
   * @param {Array} recipients - Liste des destinataires
   * @param {string} template - Template à utiliser
   * @param {Object} data - Données du template
   * @returns {Promise<Object>} Résultat de la mise en queue
   */
  async queueBulkEmail(recipients, template, data) {
    try {
      const response = await this.client.post('/api/email/queue', {
        recipients,
        template,
        data
      });

      return {
        success: true,
        data: response.data,
        jobId: response.data.jobId
      };
    } catch (error) {
      logger.error('Failed to queue bulk email', {
        recipientsCount: recipients.length,
        template,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Envoie un SMS
   * @param {string} to - Numéro de téléphone du destinataire
   * @param {string} message - Message à envoyer
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendSMS(to, message) {
    try {
      const response = await this.client.post('/api/sms/send', {
        to,
        message
      });

      return {
        success: true,
        data: response.data,
        messageId: response.data.messageId
      };
    } catch (error) {
      logger.error('Failed to send SMS via notification service', {
        to: this.maskPhoneNumber(to),
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Met en file d'attente des SMS en masse
   * @param {Array} recipients - Liste des destinataires
   * @param {string} message - Message à envoyer
   * @returns {Promise<Object>} Résultat de la mise en queue
   */
  async queueBulkSMS(recipients, message) {
    try {
      const response = await this.client.post('/api/sms/queue', {
        recipients,
        message
      });

      return {
        success: true,
        data: response.data,
        jobId: response.data.jobId
      };
    } catch (error) {
      logger.error('Failed to queue bulk SMS', {
        recipientsCount: recipients.length,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Récupère le statut d'une notification
   * @param {string} notificationId - ID de la notification
   * @returns {Promise<Object>} Statut de la notification
   */
  async getNotificationStatus(notificationId) {
    try {
      const response = await this.client.get(`/api/notifications/${notificationId}/status`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to get notification status', {
        notificationId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Récupère l'historique des notifications
   * @param {Object} filters - Filtres de recherche
   * @returns {Promise<Object>} Historique des notifications
   */
  async getNotificationHistory(filters = {}) {
    try {
      const response = await this.client.get('/api/notifications/history', {
        params: filters
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to get notification history', {
        filters,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Récupère les statistiques des notifications
   * @param {Object} filters - Filtres pour les stats
   * @returns {Promise<Object>} Statistiques des notifications
   */
  async getNotificationStatistics(filters = {}) {
    try {
      const response = await this.client.get('/api/notifications/statistics', {
        params: filters
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to get notification statistics', {
        filters,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Liste les templates disponibles
   * @returns {Promise<Object>} Liste des templates
   */
  async listTemplates() {
    try {
      const response = await this.client.get('/api/templates');

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to list templates', {
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Vérifie la santé du service de notifications
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
      logger.error('Notification service health check failed', {
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
   * Masque partiellement un numéro de téléphone pour les logs
   * @param {string} phoneNumber - Numéro à masquer
   * @returns {string} Numéro masqué
   */
  maskPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 4) {
      return '***';
    }
    
    const visible = phoneNumber.substring(0, 2) + '***' + phoneNumber.substring(phoneNumber.length - 2);
    return visible;
  }
}

module.exports = new NotificationClient();
