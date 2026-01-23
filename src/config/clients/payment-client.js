const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Client HTTP pour le Payment Service
 * Gère les communications avec le service de paiements
 */
class PaymentClient {
  constructor() {
    this.baseURL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';
    this.apiKey = process.env.PAYMENT_SERVICE_API_KEY;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 15000, // Timeout plus long pour les paiements
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    });

    // Intercepteurs pour le logging et la gestion d'erreurs
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Payment service request', {
          method: config.method,
          url: config.url,
          service: 'payment'
        });
        return config;
      },
      (error) => {
        logger.error('Payment service request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Payment service response', {
          status: response.status,
          url: response.config.url,
          service: 'payment'
        });
        return response;
      },
      (error) => {
        logger.error('Payment service response error', {
          status: error.response?.status,
          message: error.message,
          service: 'payment'
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Crée une intention de paiement
   * @param {number} amount - Montant en centimes
   * @param {string} currency - Devise (EUR, USD, etc.)
   * @param {Object} metadata - Métadonnées du paiement
   * @returns {Promise<Object>} Intention de paiement créée
   */
  async createPaymentIntent(amount, currency = 'EUR', metadata = {}) {
    try {
      const response = await this.client.post('/api/payments/intent', {
        amount,
        currency,
        metadata
      });

      return {
        success: true,
        data: response.data,
        clientSecret: response.data.clientSecret
      };
    } catch (error) {
      logger.error('Failed to create payment intent', {
        amount,
        currency,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Crée une session de checkout Stripe
   * @param {Array} items - Articles à acheter
   * @param {string} successUrl - URL de succès
   * @param {string} cancelUrl - URL d'annulation
   * @param {Object} options - Options additionnelles
   * @returns {Promise<Object>} Session de checkout créée
   */
  async createCheckoutSession(items, successUrl, cancelUrl, options = {}) {
    try {
      const response = await this.client.post('/api/payments/checkout', {
        items,
        successUrl,
        cancelUrl,
        ...options
      });

      return {
        success: true,
        data: response.data,
        checkoutUrl: response.data.url
      };
    } catch (error) {
      logger.error('Failed to create checkout session', {
        itemsCount: items.length,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Récupère les détails d'un paiement
   * @param {string} paymentId - ID du paiement
   * @returns {Promise<Object>} Détails du paiement
   */
  async getPaymentDetails(paymentId) {
    try {
      const response = await this.client.get(`/api/payments/${paymentId}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to get payment details', {
        paymentId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Traite un remboursement
   * @param {string} paymentId - ID du paiement à rembourser
   * @param {number} amount - Montant à rembourser (en centimes)
   * @param {string} reason - Raison du remboursement
   * @returns {Promise<Object>} Résultat du remboursement
   */
  async processRefund(paymentId, amount, reason = 'Refund requested') {
    try {
      const response = await this.client.post(`/api/payments/${paymentId}/refund`, {
        amount,
        reason
      });

      return {
        success: true,
        data: response.data,
        refundId: response.data.id
      };
    } catch (error) {
      logger.error('Failed to process refund', {
        paymentId,
        amount,
        reason,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Récupère la liste des factures d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} options - Options de pagination
   * @returns {Promise<Object>} Liste des factures
   */
  async getUserInvoices(userId, options = {}) {
    try {
      const response = await this.client.get('/api/billing/invoices', {
        params: { userId, ...options }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to get user invoices', {
        userId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Télécharge une facture en PDF
   * @param {string} invoiceId - ID de la facture
   * @returns {Promise<Object>} URL de téléchargement de la facture
   */
  async downloadInvoice(invoiceId) {
    try {
      const response = await this.client.get(`/api/billing/invoices/${invoiceId}/pdf`);

      return {
        success: true,
        data: response.data,
        pdfUrl: response.data.pdfUrl
      };
    } catch (error) {
      logger.error('Failed to download invoice', {
        invoiceId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Crée un abonnement
   * @param {number} userId - ID de l'utilisateur
   * @param {string} planId - ID du plan d'abonnement
   * @param {Object} options - Options de l'abonnement
   * @returns {Promise<Object>} Abonnement créé
   */
  async createSubscription(userId, planId, options = {}) {
    try {
      const response = await this.client.post('/api/subscriptions', {
        userId,
        planId,
        ...options
      });

      return {
        success: true,
        data: response.data,
        subscriptionId: response.data.id
      };
    } catch (error) {
      logger.error('Failed to create subscription', {
        userId,
        planId,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Annule un abonnement
   * @param {string} subscriptionId - ID de l'abonnement
   * @param {string} reason - Raison de l'annulation
   * @returns {Promise<Object>} Résultat de l'annulation
   */
  async cancelSubscription(subscriptionId, reason = 'User requested') {
    try {
      const response = await this.client.delete(`/api/subscriptions/${subscriptionId}`, {
        data: { reason }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to cancel subscription', {
        subscriptionId,
        reason,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Vérifie la santé du service de paiements
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
      logger.error('Payment service health check failed', {
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
   * Traite un webhook de paiement
   * @param {string} provider - Provider (stripe, paypal)
   * @param {Object} payload - Payload du webhook
   * @param {string} signature - Signature du webhook
   * @returns {Promise<Object>} Résultat du traitement
   */
  async processWebhook(provider, payload, signature) {
    try {
      const response = await this.client.post(`/api/webhooks/${provider}`, payload, {
        headers: {
          'X-Webhook-Signature': signature
        }
      });

      return {
        success: true,
        data: response.data,
        processed: true
      };
    } catch (error) {
      logger.error('Failed to process webhook', {
        provider,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message,
        processed: false
      };
    }
  }
}

module.exports = new PaymentClient();
