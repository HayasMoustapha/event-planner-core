/**
 * Routes de Paiement pour Event Planner Core
 * Définit toutes les routes API pour les opérations de paiement
 * 
 * @author Event Planner Team
 * @version 1.0.0
 */

const express = require('express');
const Joi = require('joi');
const router = express.Router();
const paymentController = require('./payment.controller');
const { ValidationMiddleware } = require('../../../../shared');

/**
 * ROUTES DE PAIEMENT
 * Ces routes permettent aux utilisateurs d'acheter des templates et de traiter des paiements
 */

/**
 * ROUTE 1 : Acheter un template
 * Méthode : POST
 * URL : /api/marketplace/templates/purchase
 * Description : Achète un template via le Payment Service
 */
router.post('/templates/purchase',
  // Validation des données d'achat de template
  ValidationMiddleware.validate(Joi.object({
    templateId: Joi.string().required().description('ID du template à acheter'),
    userId: Joi.string().required().description('ID de l\'utilisateur acheteur'),
    paymentMethod: Joi.string().default('stripe').valid('stripe', 'paypal').description('Méthode de paiement'),
    customerEmail: Joi.string().email().required().description('Email du client'),
    customerName: Joi.string().optional().description('Nom du client'),
    customerPhone: Joi.string().optional().description('Téléphone du client'),
    returnUrl: Joi.string().uri().optional().description('URL de retour après paiement'),
    preferredGateways: Joi.array().items(Joi.string().valid('stripe', 'paypal')).default(['stripe']).description('Passerelles préférées'),
    metadata: Joi.object().optional().description('Métadonnées additionnelles')
  })),
  paymentController.purchaseTemplate
);

/**
 * ROUTE 2 : Traiter un paiement standard
 * Méthode : POST
 * URL : /api/marketplace/payments/process
 * Description : Traite un paiement standard (événements, billets, etc.)
 */
router.post('/payments/process',
  // Validation des données de paiement
  ValidationMiddleware.validate(Joi.object({
    userId: Joi.string().required().description('ID de l\'utilisateur'),
    eventId: Joi.string().optional().description('ID de l\'événement (optionnel)'),
    amount: Joi.number().positive().required().description('Montant en centimes'),
    currency: Joi.string().default('EUR').description('Devise'),
    paymentMethod: Joi.string().default('stripe').valid('stripe', 'paypal').description('Méthode de paiement'),
    description: Joi.string().optional().description('Description du paiement'),
    customerEmail: Joi.string().email().required().description('Email du client'),
    customerName: Joi.string().optional().description('Nom du client'),
    customerPhone: Joi.string().optional().description('Téléphone du client'),
    returnUrl: Joi.string().uri().optional().description('URL de retour après paiement'),
    preferredGateways: Joi.array().items(Joi.string().valid('stripe', 'paypal')).default(['stripe']).description('Passerelles préférées'),
    metadata: Joi.object().optional().description('Métadonnées additionnelles')
  })),
  paymentController.processPayment
);

/**
 * ROUTE 3 : Récupérer le statut d'une transaction
 * Méthode : GET
 * URL : /api/marketplace/payments/status/:transactionId
 * Description : Récupère le statut d'une transaction de paiement
 */
router.get('/payments/status/:transactionId',
  // Validation du paramètre transactionId
  ValidationMiddleware.validate(Joi.object({
    transactionId: Joi.string().required().description('ID de la transaction')
  }), 'params'),
  paymentController.getPaymentStatus
);

/**
 * ROUTE 4 : Récupérer les statistiques des paiements
 * Méthode : GET
 * URL : /api/marketplace/payments/statistics
 * Description : Récupère les statistiques des paiements avec filtres optionnels
 */
router.get('/payments/statistics',
  // Validation des paramètres de requête
  ValidationMiddleware.validate(Joi.object({
    userId: Joi.string().optional().description('Filtrer par utilisateur'),
    startDate: Joi.string().isoDate().optional().description('Date de début (ISO)'),
    endDate: Joi.string().isoDate().optional().description('Date de fin (ISO)'),
    status: Joi.string().optional().description('Filtrer par statut')
  }), 'query'),
  paymentController.getPaymentStatistics
);

/**
 * ROUTE 5 : Récupérer les passerelles de paiement disponibles
 * Méthode : GET
 * URL : /api/marketplace/payments/gateways
 * Description : Liste les passerelles de paiement disponibles
 */
router.get('/payments/gateways',
  paymentController.getAvailableGateways
);

/**
 * ROUTE 6 : Générer une facture
 * Méthode : POST
 * URL : /api/marketplace/payments/invoices/generate
 * Description : Génère une facture pour une transaction
 */
router.post('/payments/invoices/generate',
  // Validation des données de facture
  ValidationMiddleware.validate(Joi.object({
    transactionId: Joi.string().required().description('ID de la transaction'),
    templateId: Joi.string().default('default').description('Template de facture'),
    includeTax: Joi.boolean().default(true).description('Inclure les taxes'),
    metadata: Joi.object().optional().description('Métadonnées additionnelles')
  })),
  paymentController.generateInvoice
);

/**
 * ROUTE 7 : Health check du service de paiement
 * Méthode : GET
 * URL : /api/marketplace/payments/health
 * Description : Vérifie la santé du service de paiement
 */
router.get('/payments/health',
  paymentController.healthCheck
);

/**
 * ROUTE 8 : Notification d'achat de template (webhook interne)
 * Méthode : POST
 * URL : /api/marketplace/templates/purchase-notification
 * Description : Reçoit les notifications d'achat du Payment Service
 */
router.post('/templates/purchase-notification',
  // Validation des données de notification
  ValidationMiddleware.validate(Joi.object({
    templateId: Joi.string().required().description('ID du template'),
    userId: Joi.string().required().description('ID de l\'utilisateur'),
    transactionId: Joi.string().required().description('ID de la transaction'),
    amount: Joi.number().positive().required().description('Montant payé'),
    currency: Joi.string().required().description('Devise'),
    purchaseDate: Joi.string().isoDate().required().description('Date d\'achat'),
    metadata: Joi.object().optional().description('Métadonnées additionnelles')
  })),
  async (req, res) => {
    try {
      const notificationData = req.body;
      
      // Log de la notification reçue
      console.log('📢 Purchase notification received:', {
        templateId: notificationData.templateId,
        userId: notificationData.userId,
        transactionId: notificationData.transactionId,
        amount: notificationData.amount
      });

      // TODO: Implémenter la logique de traitement de la notification
      // - Mettre à jour le statut du template
      // - Envoyer une confirmation email
      // - Mettre à jour les statistiques
      // - Notifier le designer

      return res.status(200).json({
        success: true,
        message: 'Purchase notification processed successfully',
        notificationId: `notif_${Date.now()}`,
        processedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Purchase notification processing failed:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to process purchase notification',
        message: error.message
      });
    }
  }
);

/**
 * ROUTE 9 : Vérifier la disponibilité d'un template
 * Méthode : GET
 * URL : /api/marketplace/templates/:templateId/availability
 * Description : Vérifie si un template est disponible à l'achat
 */
router.get('/templates/:templateId/availability',
  // Validation du paramètre templateId
  ValidationMiddleware.validate(Joi.object({
    templateId: Joi.string().required().description('ID du template')
  }), 'params'),
  async (req, res) => {
    try {
      const { templateId } = req.params;
      
      // TODO: Implémenter la logique de vérification de disponibilité
      // - Vérifier si le template existe
      // - Vérifier s'il est en stock
      // - Vérifier s'il n'est pas déjà acheté par l'utilisateur
      
      // Pour l'instant, nous simulons une réponse positive
      return res.status(200).json({
        success: true,
        available: true,
        template: {
          id: templateId,
          name: 'Template Name',
          price: 2500,
          currency: 'EUR',
          category: 'general',
          available: true
        },
        message: 'Template is available for purchase'
      });
    } catch (error) {
      console.error('❌ Template availability check failed:', error.message);
      return res.status(500).json({
        success: false,
        available: false,
        error: 'Failed to check template availability',
        message: error.message
      });
    }
  }
);

module.exports = router;
