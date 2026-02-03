const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Client HTTP pour le Payment Service (aligné diagramme)
 */
class PaymentClient {
  constructor() {
    this.baseURL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';
    this.apiKey = process.env.PAYMENT_SERVICE_API_KEY;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    });

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

  async getAvailableGateways() {
    try {
      const response = await this.client.get('/api/payment-gateways');
      return {
        success: true,
        gateways: response.data.data || []
      };
    } catch (error) {
      logger.error('Failed to get payment gateways', { error: error.message });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

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

  async updatePaymentStatus(paymentId, status) {
    try {
      const response = await this.client.patch(`/api/payments/${paymentId}/status`, { status });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to update payment status', {
        paymentId,
        status,
        error: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async processRefund(paymentId, amount, reason = 'Refund requested') {
    try {
      const response = await this.client.post('/api/refunds', {
        payment_id: paymentId,
        amount,
        reason
      });
      return {
        success: true,
        data: response.data,
        refundId: response.data?.data?.id
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

  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Payment service health check failed', { error: error.message });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new PaymentClient();
