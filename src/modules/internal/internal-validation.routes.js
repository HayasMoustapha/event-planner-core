// Importation des modules nécessaires pour les routes de validation internes
const express = require('express'); // Framework web Node.js
const Joi = require('joi'); // Bibliothèque de validation de schémas
const internalValidationController = require('./internal-validation.controller'); // Contrôleur de validation interne
const { ValidationMiddleware } = require('../../../../shared'); // Middleware de validation partagé

const router = express.Router();

/**
 * Routes Internes de Validation
 * Ces routes sont utilisées par les autres services (scan-validation, payment, etc.)
 * pour communiquer avec le service Core de manière sécurisée
 */

/**
 * ROUTE 1 : Validation de ticket
 * Méthode : POST
 * URL : /api/internal/validation/validate-ticket
 * Description : Valide un ticket pour le scan-validation-service
 * Utilisation : Interne entre services
 */
router.post('/validate-ticket',
  // MIDDLEWARE DE VALIDATION : Vérifie que les données du ticket sont valides
  ValidationMiddleware.validate(Joi.object({
    ticketId: Joi.string().required(), // ID du ticket requis
    eventId: Joi.string().required(), // ID de l'événement requis
    ticketType: Joi.string().required(), // Type de ticket requis
    userId: Joi.string().required(), // ID utilisateur requis
    scanContext: Joi.object({ // Contexte du scan
      location: Joi.string().required(), // Localisation du scan
      deviceId: Joi.string().required(), // ID du device de scan
      timestamp: Joi.string().isoDate().required(), // Timestamp ISO
      operatorId: Joi.string().optional(), // ID de l'opérateur (optionnel)
      checkpointId: Joi.string().optional() // ID du point de contrôle (optionnel)
    }).required(),
    validationMetadata: Joi.object({ // Métadonnées de validation
      qrVersion: Joi.string().optional(), // Version du QR code
      qrAlgorithm: Joi.string().optional(), // Algorithme du QR code
      validatedAt: Joi.string().isoDate().optional() // Date de validation
    }).optional()
  })),
  internalValidationController.validateTicket // Contrôleur qui traite la validation
);

/**
 * ROUTE 2 : Validation de ticket par code
 * Méthode : POST  
 * URL : /api/internal/validation/validate-ticket-by-code
 * Description : Valide un ticket en utilisant son code QR
 * Utilisation : Alternative à validate-ticket pour les scans par code
 */
router.post('/validate-ticket-by-code',
  // VALIDATION : Vérifie le code du ticket et le contexte
  ValidationMiddleware.validate(Joi.object({
    ticketCode: Joi.string().required(), // Code du ticket QR
    scanContext: Joi.object({ // Contexte du scan
      location: Joi.string().required(), // Localisation
      deviceId: Joi.string().required(), // Device ID
      timestamp: Joi.string().isoDate().required(), // Timestamp
      operatorId: Joi.string().optional(), // Opérateur
      checkpointId: Joi.string().optional() // Point de contrôle
    }).required()
  })),
  internalValidationController.validateTicketByCode // Contrôleur de validation par code
);

/**
 * ROUTE 3 : Vérification de statut de ticket
 * Méthode : GET
 * URL : /api/internal/validation/ticket-status/:ticketId
 * Description : Vérifie le statut actuel d'un ticket
 * Utilisation : Pour les scans de suivi et vérifications
 */
router.get('/ticket-status/:ticketId',
  // VALIDATION : Vérifie que l'ID du ticket est valide
  ValidationMiddleware.validateParams(Joi.object({
    ticketId: Joi.string().required() // ID du ticket requis
  })),
  internalValidationController.getTicketStatus // Contrôleur de statut
);

/**
 * ROUTE 4 : Validation multiple de tickets
 * Méthode : POST
 * URL : /api/internal/validation/validate-batch
 * Description : Valide plusieurs tickets en une seule requête
 * Utilisation : Pour les scans en lot et vérifications groupées
 */
router.post('/validate-batch',
  // VALIDATION : Vérifie le tableau de tickets à valider
  ValidationMiddleware.validate(Joi.object({
    tickets: Joi.array().items(Joi.object({ // Tableau de tickets
      ticketId: Joi.string().required(), // ID du ticket
      eventId: Joi.string().required(), // ID événement
      scanContext: Joi.object({ // Contexte de scan
        location: Joi.string().required(), // Localisation
        deviceId: Joi.string().required(), // Device ID
        timestamp: Joi.string().isoDate().required() // Timestamp
      }).required()
    })).min(1).max(50).required(), // 1 à 50 tickets maximum
    batchId: Joi.string().optional(), // ID du batch (optionnel)
    metadata: Joi.object().optional() // Métadonnées additionnelles
  })),
  internalValidationController.validateBatch // Contrôleur de validation en lot
);

/**
 * ROUTE 5 : Health check du service de validation
 * Méthode : GET
 * URL : /api/internal/validation/health
 * Description : Vérifie l'état de santé du service de validation interne
 * Utilisation : Monitoring et health checks inter-services
 */
router.get('/health',
  internalValidationController.healthCheck // Contrôleur de santé
);

module.exports = router; // Exportation des routes
