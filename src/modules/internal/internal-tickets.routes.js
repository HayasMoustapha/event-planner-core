// Importation des modules nécessaires pour les routes de tickets internes
const express = require('express'); // Framework web Node.js
const Joi = require('joi'); // Bibliothèque de validation de schémas
const internalTicketsController = require('./internal-tickets.controller'); // Contrôleur de tickets interne
const { ValidationMiddleware } = require('../../../../shared'); // Middleware de validation partagé

const router = express.Router();

/**
 * Routes Internes de Tickets
 * Ces routes sont utilisées par les autres services pour interagir avec les tickets
 */

/**
 * ROUTE 1 : Vérification du statut d'un ticket
 * Méthode : GET
 * URL : /api/internal/tickets/:ticketId/status
 * Description : Vérifie le statut actuel d'un ticket
 * Utilisation : Scan-validation-service pour vérifier avant validation
 */
router.get('/:ticketId/status',
  // MIDDLEWARE DE VALIDATION : Vérifie que l'ID du ticket est valide
  ValidationMiddleware.validateParams(Joi.object({
    ticketId: Joi.string().required() // ID du ticket requis
  })),
  internalTicketsController.getTicketStatus // Contrôleur qui traite la vérification
);

/**
 * ROUTE 2 : Enregistrement d'un scan
 * Méthode : POST
 * URL : /api/internal/tickets/record-scan
 * Description : Enregistre un scan de ticket dans l'historique
 * Utilisation : Scan-validation-service après validation réussie
 */
router.post('/record-scan',
  // MIDDLEWARE DE VALIDATION : Vérifie les données du scan
  ValidationMiddleware.validate(Joi.object({
    ticketId: Joi.string().required(), // ID du ticket requis
    eventId: Joi.string().required(), // ID de l'événement requis
    userId: Joi.string().required(), // ID utilisateur requis
    scanContext: Joi.object({ // Contexte du scan
      location: Joi.string().required(), // Localisation du scan
      deviceId: Joi.string().required(), // ID du device de scan
      timestamp: Joi.string().isoDate().required(), // Timestamp du scan
      operatorId: Joi.string().optional(), // ID de l'opérateur (optionnel)
      checkpointId: Joi.string().optional() // ID du point de contrôle (optionnel)
    }).required(),
    validationMetadata: Joi.object({ // Métadonnées de validation
      qrVersion: Joi.string().optional(), // Version du QR code
      qrAlgorithm: Joi.string().optional(), // Algorithme du QR code
      validatedAt: Joi.string().isoDate().optional(), // Date de validation
      validationResult: Joi.object().optional() // Résultat de la validation
    }).optional(),
    scanResult: Joi.object({ // Résultat du scan
      valid: Joi.boolean().required(), // Validité du scan
      status: Joi.string().required(), // Statut du scan
      message: Joi.string().optional(), // Message du scan
      fraudFlags: Joi.array().optional() // Indicateurs de fraude
    }).required()
  })),
  internalTicketsController.recordScan // Contrôleur qui enregistre le scan
);

/**
 * ROUTE 3 : Historique des scans d'un ticket
 * Méthode : GET
 * URL : /api/internal/tickets/:ticketId/scan-history
 * Description : Récupère l'historique complet des scans d'un ticket
 * Utilisation : Audit et suivi des tickets
 */
router.get('/:ticketId/scan-history',
  // VALIDATION : Vérifie l'ID du ticket et les filtres optionnels
  ValidationMiddleware.validateParams(Joi.object({
    ticketId: Joi.string().required() // ID du ticket requis
  })),
  ValidationMiddleware.validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50), // Limite de résultats
    offset: Joi.number().integer().min(0).default(0), // Offset pour pagination
    startDate: Joi.string().isoDate().optional(), // Date de début optionnelle
    endDate: Joi.string().isoDate().optional(), // Date de fin optionnelle
    location: Joi.string().optional() // Filtre par localisation optionnel
  })),
  internalTicketsController.getScanHistory // Contrôleur d'historique
);

/**
 * ROUTE 4 : Mise à jour du statut d'un ticket
 * Méthode : PATCH
 * URL : /api/internal/tickets/:ticketId/status
 * Description : Met à jour le statut d'un ticket
 * Utilisation : Après validation réussie ou annulation
 */
router.patch('/:ticketId/status',
  // VALIDATION : Vérifie l'ID et le nouveau statut
  ValidationMiddleware.validateParams(Joi.object({
    ticketId: Joi.string().required() // ID du ticket requis
  })),
  ValidationMiddleware.validate(Joi.object({
    status: Joi.string().valid('active', 'used', 'cancelled', 'expired', 'void').required(), // Statut valide requis
    reason: Joi.string().optional(), // Raison du changement optionnelle
    updatedBy: Joi.string().optional(), // ID du service ou utilisateur qui fait la mise à jour
    metadata: Joi.object().optional() // Métadonnées additionnelles
  })),
  internalTicketsController.updateTicketStatus // Contrôleur de mise à jour
);

/**
 * ROUTE 5 : Vérification multiple de tickets
 * Méthode : POST
 * URL : /api/internal/tickets/verify-batch
 * Description : Vérifie plusieurs tickets en une seule requête
 * Utilisation : Traitement en lot et vérifications groupées
 */
router.post('/verify-batch',
  // VALIDATION : Vérifie le tableau de tickets à vérifier
  ValidationMiddleware.validate(Joi.object({
    ticketIds: Joi.array().items(Joi.string()).min(1).max(50).required(), // 1 à 50 tickets maximum
    eventId: Joi.string().optional(), // Filtre par événement optionnel
    includeHistory: Joi.boolean().default(false), // Inclure l'historique optionnel
    metadata: Joi.object().optional() // Métadonnées additionnelles
  })),
  internalTicketsController.verifyBatch // Contrôleur de vérification en lot
);

/**
 * ROUTE 6 : Health check du service de tickets interne
 * Méthode : GET
 * URL : /api/internal/tickets/health
 * Description : Vérifie l'état de santé du service de tickets interne
 * Utilisation : Monitoring inter-services
 */
router.get('/health',
  internalTicketsController.healthCheck // Contrôleur de santé
);

module.exports = router; // Exportation des routes
