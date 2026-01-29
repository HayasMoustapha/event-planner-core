// Importation des modules nécessaires pour les routes d'événements internes
const express = require('express'); // Framework web Node.js
const Joi = require('joi'); // Bibliothèque de validation de schémas
const internalEventsController = require('./internal-events.controller'); // Contrôleur d'événements interne
const { ValidationMiddleware } = require('../../../../shared'); // Middleware de validation partagé

const router = express.Router();

/**
 * Routes Internes d'Événements
 * Ces routes sont utilisées par les autres services pour interagir avec les événements
 */

/**
 * ROUTE 1 : Validation d'événement
 * Méthode : GET
 * URL : /api/internal/events/:eventId/validate
 * Description : Valide qu'un événement est actif et accessible pour les scans
 * Utilisation : Scan-validation-service pour vérifier la validité d'un événement
 */
router.get('/:eventId/validate',
  // MIDDLEWARE DE VALIDATION : Vérifie que l'ID de l'événement est valide
  ValidationMiddleware.validateParams(Joi.object({
    eventId: Joi.string().required() // ID de l'événement requis
  })),
  internalEventsController.validateEvent // Contrôleur qui traite la validation
);

/**
 * ROUTE 2 : Informations d'événement pour scan
 * Méthode : GET
 * URL : /api/internal/events/:eventId/scan-info
 * Description : Récupère les informations nécessaires pour le scan d'un événement
 * Utilisation : Scan-validation-service pour obtenir les règles de scan
 */
router.get('/:eventId/scan-info',
  // VALIDATION : Vérifie l'ID de l'événement
  ValidationMiddleware.validateParams(Joi.object({
    eventId: Joi.string().required() // ID de l'événement requis
  })),
  internalEventsController.getScanInfo // Contrôleur d'informations de scan
);

/**
 * ROUTE 3 : Statistiques d'un événement
 * Méthode : GET
 * URL : /api/internal/events/:eventId/stats
 * Description : Récupère les statistiques de scans pour un événement
 * Utilisation : Tableaux de bord et monitoring
 */
router.get('/:eventId/stats',
  // VALIDATION : Vérifie l'ID de l'événement et les filtres optionnels
  ValidationMiddleware.validateParams(Joi.object({
    eventId: Joi.string().required() // ID de l'événement requis
  })),
  ValidationMiddleware.validateQuery(Joi.object({
    startDate: Joi.string().isoDate().optional(), // Date de début optionnelle
    endDate: Joi.string().isoDate().optional(), // Date de fin optionnelle
    location: Joi.string().optional(), // Filtre par localisation optionnel
    checkpointId: Joi.string().optional() // Filtre par point de contrôle optionnel
  })),
  internalEventsController.getEventStats // Contrôleur de statistiques
);

/**
 * ROUTE 4 : Mise à jour de statut d'événement
 * Méthode : PATCH
 * URL : /api/internal/events/:eventId/status
 * Description : Met à jour le statut d'un événement (actif/inactif)
 * Utilisation : Administration et gestion des événements
 */
router.patch('/:eventId/status',
  // VALIDATION : Vérifie l'ID et le nouveau statut
  ValidationMiddleware.validateParams(Joi.object({
    eventId: Joi.string().required() // ID de l'événement requis
  })),
  ValidationMiddleware.validate(Joi.object({
    status: Joi.string().valid('active', 'inactive', 'cancelled', 'completed').required(), // Statut valide requis
    reason: Joi.string().optional(), // Raison du changement optionnelle
    updatedBy: Joi.string().optional() // ID de l'utilisateur qui fait la mise à jour
  })),
  internalEventsController.updateEventStatus // Contrôleur de mise à jour de statut
);

/**
 * ROUTE 5 : Health check du service d'événements internes
 * Méthode : GET
 * URL : /api/internal/events/health
 * Description : Vérifie l'état de santé du service d'événements interne
 * Utilisation : Monitoring inter-services
 */
router.get('/health',
  internalEventsController.healthCheck // Contrôleur de santé
);

module.exports = router; // Exportation des routes
