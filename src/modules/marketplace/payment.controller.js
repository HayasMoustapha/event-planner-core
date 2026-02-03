/**
 * Contrôleur de Paiement pour Event Planner Core
 * Gère les routes de paiement pour l'achat de templates et autres transactions
 * 
 * @author Event Planner Team
 * @version 1.0.0
 */

const paymentService = require('../../services/payment.service');
const { success, error } = require('../../../../shared');
const logger = require('../../utils/logger');

/**
 * Contrôleur de Paiement
 * Gère toutes les requêtes HTTP liées aux paiements
 */
class PaymentController {
  /**
   * Traite l'achat d'un template
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP
   */
  async purchaseTemplate(req, res) {
    try {
      const {
        templateId,
        userId,
        paymentMethod = 'stripe',
        customerEmail,
        customerName,
        customerPhone,
        returnUrl,
        preferredGateways = ['stripe'],
        metadata = {}
      } = req.body;

      // Validation des données requises
      if (!templateId || !userId || !customerEmail) {
        return res.status(400).json(
          error('Missing required fields', 'templateId, userId, and customerEmail are required')
        );
      }

      // Récupérer les détails du template (à implémenter avec le service de templates)
      // Pour l'instant, nous utilisons les données de la requête
      const templateDetails = {
        templateId,
        name: metadata.templateName || 'Template Name',
        category: metadata.category || 'general',
        price: metadata.price || 2500, // Prix par défaut en centimes
        designerId: metadata.designerId || 'default_designer'
      };

      logger.payment('Processing template purchase request', {
        templateId,
        userId,
        amount: templateDetails.price,
        customerEmail
      });

      // Traiter l'achat via le Payment Service
      const result = await paymentService.purchaseTemplate({
        templateId,
        userId,
        designerId: templateDetails.designerId,
        amount: templateDetails.price,
        currency: 'EUR',
        paymentMethod,
        customerEmail,
        customerName,
        customerPhone,
        returnUrl,
        preferredGateways,
        templateName: templateDetails.name,
        category: templateDetails.category,
        metadata
      });

      if (result.success) {
        return res.status(201).json({
          success: true,
          message: 'Template purchase initiated successfully',
          data: {
            transactionId: result.transactionId,
            status: result.status,
            amount: result.amount,
            currency: result.currency,
            templateId: result.templateId,
            paymentDetails: result.paymentDetails
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Template purchase failed',
          details: result.error
        });
      }
    } catch (error) {
      logger.error('Template purchase controller error:', error.message);
      return res.status(500).json(
        error('Template purchase processing failed', error.message)
      );
    }
  }

  /**
   * Traite un paiement standard
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP
   */
  async processPayment(req, res) {
    try {
      const {
        userId,
        eventId,
        amount,
        currency = 'EUR',
        paymentMethod = 'stripe',
        description,
        customerEmail,
        customerName,
        customerPhone,
        returnUrl,
        preferredGateways = ['stripe'],
        metadata = {}
      } = req.body;

      // Validation des données requises
      if (!userId || !amount || !customerEmail) {
        return res.status(400).json(
          error('Missing required fields', 'userId, amount, and customerEmail are required')
        );
      }

      logger.payment('Processing payment request', {
        userId,
        eventId,
        amount,
        customerEmail
      });

      // Traiter le paiement via le Payment Service
      const result = await paymentService.processPayment({
        userId,
        eventId,
        amount,
        currency,
        paymentMethod,
        description,
        customerEmail,
        customerName,
        customerPhone,
        returnUrl,
        preferredGateways,
        metadata
      });

      if (result.success) {
        return res.status(201).json(
          success('Payment initiated successResponsefully', {
            transactionId: result.transactionId,
            status: result.status,
            amount: result.amount,
            currency: result.currency,
            gateway: result.gateway,
            paymentDetails: result.paymentDetails
          })
        );
      } else {
        return res.status(400).json(
          error('Payment processing failed', result.error)
        );
      }
    } catch (error) {
      logger.error('Payment processing controller error:', error.message);
      return res.status(500).json(
        error('Payment processing failed', error.message)
      );
    }
  }

  /**
   * Récupère le statut d'une transaction
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP
   */
  async getPaymentStatus(req, res) {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        return res.status(400).json(
          error('Missing transaction ID', 'transactionId is required')
        );
      }

      logger.payment('Getting payment status', { transactionId });

      const result = await paymentService.getPaymentStatus(transactionId);

      if (result.success) {
        return res.status(200).json(
          success('Payment status retrieved successResponsefully', {
            transactionId: result.transactionId,
            status: result.status,
            amount: result.amount,
            currency: result.currency,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
          })
        );
      } else {
        return res.status(404).json(
          error('Payment status not found', result.error)
        );
      }
    } catch (error) {
      logger.error('Get payment status controller error:', error.message);
      return res.status(500).json(
        error('Failed to get payment status', error.message)
      );
    }
  }

  /**
   * Récupère les statistiques des paiements
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP
   */
  async getPaymentStatistics(req, res) {
    try {
      const {
        userId,
        startDate,
        endDate,
        status
      } = req.query;

      logger.payment('Getting payment statistics', { userId, startDate, endDate, status });

      const filters = {};
      if (userId) filters.userId = userId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (status) filters.status = status;

      const result = await paymentService.getPaymentStatistics(filters);

      if (result.success) {
        return res.status(200).json(
          success('Payment statistics retrieved successResponsefully', {
            transactions: result.transactions,
            gatewayStats: result.gatewayStats
          })
        );
      } else {
        return res.status(400).json(
          error('Failed to get payment statistics', result.error)
        );
      }
    } catch (error) {
      logger.error('Get payment statistics controller error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to get payment statistics',
        details: error.message
      });
    }
  }

  /**
   * Récupère les passerelles de paiement disponibles
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP
   */
  async getAvailableGateways(req, res) {
    try {
      logger.payment('Getting available payment gateways');

      const result = await paymentService.getAvailableGateways();

      if (result.success) {
        return res.status(200).json(
          success('Available gateways retrieved successResponsefully', {
            gateways: result.gateways
          })
        );
      } else {
        return res.status(400).json(
          error('Failed to get available gateways', result.error)
        );
      }
    } catch (error) {
      logger.error('Get available gateways controller error:', error.message);
      return res.status(500).json(
        error('Failed to get available gateways', error.message)
      );
    }
  }

  /**
   * Génère une facture
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP
   */
  async generateInvoice(req, res) {
    try {
      const {
        transactionId,
        templateId = 'default',
        includeTax = true,
        metadata = {}
      } = req.body;

      if (!transactionId) {
        return res.status(400).json(
          error('Missing transaction ID', 'transactionId is required')
        );
      }

      logger.payment('Generating invoice', { transactionId, templateId });

      const result = await paymentService.generateInvoice({
        transactionId,
        templateId,
        includeTax,
        metadata
      });

      if (result.success) {
        return res.status(201).json(
          success('Invoice generated successResponsefully', {
            invoiceId: result.invoiceId,
            downloadUrl: result.downloadUrl
          })
        );
      } else {
        return res.status(400).json(
          error('Failed to generate invoice', result.error)
        );
      }
    } catch (error) {
      logger.error('Generate invoice controller error:', error.message);
      return res.status(500).json(
        error('Failed to generate invoice', error.message)
      );
    }
  }

  /**
   * Vérifie la santé du service de paiement
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP
   */
  async healthCheck(req, res) {
    try {
      const result = await paymentService.healthCheck();

      return res.status(result.success ? 200 : 503).json(
        result.success ? 
          success('Payment service is healthy', result) :
          error('Payment service is unhealthy', result.error)
      );
    } catch (error) {
      logger.error('Payment service health check error:', error.message);
      return res.status(500).json(
        error('Payment service health check failed', error.message)
      );
    }
  }
}

// Exportation d'une instance singleton
module.exports = new PaymentController();
