// Importation des modules nécessaires pour les routes de scans internes
const express = require('express'); // Framework web Node.js
const Joi = require('joi'); // Bibliothèque de validation de schémas
const internalScansController = require('./internal-scans.controller'); // Contrôleur de scans interne
const { ValidationMiddleware } = require('../../../../shared'); // Middleware de validation partagé

const router = express.Router();

/**
 * Routes Internes de Scans
 * Ces routes sont utilisées par les autres services pour enregistrer et suivre les scans
 */

/**
 * ROUTE 1 : Enregistrement d'un scan
 * Méthode : POST
 * URL : /api/internal/scans/record
 * Description : Enregistre un scan de ticket dans le système
 * Utilisation : Scan-validation-service après validation réussie
 */
router.post('/record',
  // MIDDLEWARE DE VALIDATION : Vérifie les données du scan
  ValidationMiddleware.validate(Joi.object({
    ticketId: Joi.string().required(), // ID du ticket scanné
    eventId: Joi.string().required(), // ID de l'événement
    userId: Joi.string().required(), // ID du propriétaire du ticket
    scanType: Joi.string().valid('entry', 'exit', 'validation').default('validation'), // Type de scan
    scanContext: Joi.object({ // Contexte détaillé du scan
      location: Joi.string().required(), // Localisation du scan
      deviceId: Joi.string().required(), // ID du device utilisé
      timestamp: Joi.string().isoDate().required(), // Timestamp du scan
      operatorId: Joi.string().optional(), // ID de l'opérateur
      checkpointId: Joi.string().optional(), // ID du point de contrôle
      zone: Joi.string().optional(), // Zone de scan
      coordinates: Joi.object({ // Coordonnées GPS optionnelles
        latitude: Joi.number().optional(),
        longitude: Joi.number().optional(),
        accuracy: Joi.number().optional()
      }).optional()
    }).required(),
    validationResult: Joi.object({ // Résultat de la validation
      valid: Joi.boolean().required(), // Validité du scan
      status: Joi.string().required(), // Statut du scan
      message: Joi.string().optional(), // Message du scan
      fraudFlags: Joi.array().optional(), // Flags de fraude détectés
      restrictions: Joi.array().optional(), // Restrictions appliquées
      processingTime: Joi.number().optional() // Temps de traitement en ms
    }).required(),
    metadata: Joi.object().optional() // Métadonnées additionnelles
  })),
  internalScansController.recordScan // Contrôleur qui enregistre le scan
);

/**
 * ROUTE 2 : Récupération des scans d'un événement
 * Méthode : GET
 * URL : /api/internal/scans/event/:eventId
 * Description : Récupère tous les scans pour un événement spécifique
 * Utilisation : Tableaux de bord et monitoring
 */
router.get('/event/:eventId',
  // VALIDATION : Vérifie l'ID de l'événement et les filtres optionnels
  ValidationMiddleware.validateParams(Joi.object({
    eventId: Joi.string().required() // ID de l'événement requis
  })),
  ValidationMiddleware.validateQuery(Joi.object({
    startDate: Joi.string().isoDate().optional(), // Date de début optionnelle
    endDate: Joi.string().isoDate().optional(), // Date de fin optionnelle
    location: Joi.string().optional(), // Filtre par localisation optionnel
    checkpointId: Joi.string().optional(), // Filtre par point de contrôle optionnel
    scanType: Joi.string().valid('entry', 'exit', 'validation').optional(), // Type de scan optionnel
    limit: Joi.number().integer().min(1).max(1000).default(100), // Limite de résultats
    offset: Joi.number().integer().min(0).default(0) // Offset pour pagination
  })),
  internalScansController.getEventScans // Contrôleur des scans d'événement
);

/**
 * ROUTE 3 : Récupération des scans d'un ticket
 * Méthode : GET
 * URL : /api/internal/scans/ticket/:ticketId
 * Description : Récupère tous les scans pour un ticket spécifique
 * Utilisation : Historique et suivi des tickets
 */
router.get('/ticket/:ticketId',
  // VALIDATION : Vérifie l'ID du ticket et les filtres optionnels
  ValidationMiddleware.validateParams(Joi.object({
    ticketId: Joi.string().required() // ID du ticket requis
  })),
  ValidationMiddleware.validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50), // Limite de résultats
    offset: Joi.number().integer().min(0).default(0), // Offset pour pagination
    startDate: Joi.string().isoDate().optional(), // Date de début optionnelle
    endDate: Joi.string().isoDate().optional() // Date de fin optionnelle
  })),
  internalScansController.getTicketScans // Contrôleur des scans de ticket
);

/**
 * ROUTE 4 : Statistiques de scans en temps réel
 * Méthode : GET
 * URL : /api/internal/scans/stats/realtime
 * Description : Fournit des statistiques en temps réel sur les scans
 * Utilisation : Tableaux de bord et monitoring
 */
router.get('/stats/realtime',
  // VALIDATION : Filtres optionnels pour les statistiques
  ValidationMiddleware.validateQuery(Joi.object({
    eventId: Joi.string().optional(), // Filtre par événement
    location: Joi.string().optional(), // Filtre par localisation
    timeWindow: Joi.number().integer().min(1).max(3600).default(300), // Fenêtre de temps en secondes
    checkpointId: Joi.string().optional() // Filtre par point de contrôle
  })),
  internalScansController.getRealtimeStats // Contrôleur de statistiques temps réel
);

/**
 * ROUTE 5 : Détection de fraudes
 * Méthode : POST
 * URL : /api/internal/scans/detect-fraud
 * Description : Analyse un scan pour détecter des schémas de fraude
 * Utilisation : Validation avancée et sécurité
 */
router.post('/detect-fraud',
  // VALIDATION : Données du scan à analyser
  ValidationMiddleware.validate(Joi.object({
    ticketId: Joi.string().required(), // ID du ticket
    scanContext: Joi.object({ // Contexte du scan
      location: Joi.string().required(), // Localisation
      deviceId: Joi.string().required(), // Device ID
      timestamp: Joi.string().isoDate().required(), // Timestamp
      operatorId: Joi.string().optional() // ID opérateur
    }).required(),
    historicalData: Joi.object({ // Données historiques pour analyse
      recentScans: Joi.array().optional(), // Scans récents du ticket
      ticketHistory: Joi.array().optional(), // Historique complet du ticket
      eventStats: Joi.object().optional() // Statistiques de l'événement
    }).optional()
  })),
  internalScansController.detectFraud // Contrôleur de détection de fraude
);

/**
 * ROUTE 6 : Agrégation des scans
 * Méthode : GET
 * URL : /api/internal/scans/aggregated
 * Description : Fournit des données agrégées sur les scans
 * Utilisation : Rapports et analytiques
 */
router.get('/aggregated',
  // VALIDATION : Paramètres d'agrégation
  ValidationMiddleware.validateQuery(Joi.object({
    eventId: Joi.string().optional(), // Filtre par événement
    groupBy: Joi.string().valid('hour', 'day', 'location', 'checkpoint').default('hour'), // Grouper par
    startDate: Joi.string().isoDate().required(), // Date de début requise
    endDate: Joi.string().isoDate().required(), // Date de fin requise
    metrics: Joi.array().items(Joi.string().valid('count', 'unique_tickets', 'fraud_rate', 'avg_time')).default(['count']) // Métriques
  })),
  internalScansController.getAggregatedScans // Contrôleur d'agrégation
);

/**
 * ROUTE 7 : Health check du service de scans interne
 * Méthode : GET
 * URL : /api/internal/scans/health
 * Description : Vérifie l'état de santé du service de scans
 * Utilisation : Monitoring inter-services
 */
router.get('/health',
  internalScansController.healthCheck // Contrôleur de santé
);

module.exports = router; // Exportation des routes
