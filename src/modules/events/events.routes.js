// ========================================
// IMPORT DES DÉPENDANCES
// ========================================
const express = require('express'); // Framework Express.js
const Joi = require('joi'); // Bibliothèque de validation (gardée pour compatibilité)
const eventsController = require('./events.controller'); // Contrôleur des événements
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared'); // Middlewares partagés
const eventsErrorHandler = require('./events.errorHandler'); // Gestionnaire d'erreurs spécifique

// ========================================
// INITIALISATION DU ROUTEUR
// ========================================
const router = express.Router();

// ========================================
// MIDDLEWARES GLOBAUX
// ========================================

// Application de l'authentification à toutes les routes
// Seuls les utilisateurs authentifiés peuvent accéder aux routes d'événements
router.use(SecurityMiddleware.authenticated());

// Injection du contexte événementiel pour toutes les routes
// Ajoute des informations contextuelles utiles (utilisateur, permissions, etc.)
router.use(ContextInjector.injectEventContext());

// Application du gestionnaire d'erreurs spécifique aux événements
// Gère les erreurs de manière centralisée pour ce module
router.use(eventsErrorHandler);

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Créer un nouvel événement
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - event_date
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *                 example: "Conférence Tech 2025"
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *                 example: "Une conférence sur les dernières technologies"
 *               event_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-15T10:00:00Z"
 *               location:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Paris Expo Porte de Versailles"
 *     responses:
 *       201:
 *         description: Événement créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes
 */
// ========================================
// ROUTES DE GESTION DES ÉVÉNEMENTS
// ========================================

/**
 * ========================================
 * CRÉATION D'UN NOUVEL ÉVÉNEMENT
 * ========================================
 * POST /api/events
 * 
 * Permissions requises: events.create
 * Validation: Schéma createEvent du middleware partagé
 * 
 * Crée un nouvel événement avec les données fournies:
 * - title (requis): Titre de l'événement
 * - description (optionnel): Description détaillée
 * - event_date (requis): Date et heure de l'événement
 * - location (requis): Lieu de l'événement
 */
router.post('/', 
  SecurityMiddleware.withPermissions('events.create'), 
  ValidationMiddleware.createEventsValidator('createEvent'), 
  eventsController.createEvent
);

/**
 * ========================================
 * LISTE DES ÉVÉNEMENTS
 * ========================================
 * GET /api/events
 * 
 * Permissions requises: events.read
 * 
 * Paramètres de query optionnels:
 * - page: Numéro de page (défaut: 1)
 * - limit: Nombre par page (défaut: 20, max: 100)
 * - status: Filtrer par statut (draft, published, archived)
 * - search: Terme de recherche
 */
router.get('/', 
  SecurityMiddleware.withPermissions('events.read'), 
  eventsController.getEvents
);

/**
 * ========================================
 * STATISTIQUES D'UN ÉVÉNEMENT
 * ========================================
 * GET /api/events/:id/stats
 * 
 * Permissions requises: events.stats.read
 * 
 * Retourne les statistiques d'un événement:
 * - Nombre total d'invités
 * - Nombre de participants confirmés
 * - Taux de participation
 * - etc.
 */
router.get('/:id/stats', 
  SecurityMiddleware.withPermissions('events.stats.read'), 
  eventsController.getEventStats
);

/**
 * ========================================
 * DÉTAILS D'UN ÉVÉNEMENT
 * ========================================
 * GET /api/events/:id
 * 
 * Permissions requises: events.read
 * 
 * Retourne les détails complets d'un événement spécifique
 */
router.get('/:id', 
  SecurityMiddleware.withPermissions('events.read'), 
  eventsController.getEventById
);

/**
 * ========================================
 * MISE À JOUR D'UN ÉVÉNEMENT
 * ========================================
 * PUT /api/events/:id
 * 
 * Permissions requises: events.update
 * Validation: Schéma updateEvent du middleware partagé
 * 
 * Met à jour les informations d'un événement existant
 */
router.put('/:id', 
  SecurityMiddleware.withPermissions('events.update'), 
  ValidationMiddleware.createEventsValidator('updateEvent'), 
  eventsController.updateEvent
);

/**
 * ========================================
 * SUPPRESSION D'UN ÉVÉNEMENT
 * ========================================
 * DELETE /api/events/:id
 * 
 * Permissions requises: events.delete
 * Validation: Schéma deleteEvent du middleware partagé
 * 
 * Supprime un événement (soft delete)
 */
router.delete('/:id', 
  SecurityMiddleware.withPermissions('events.delete'), 
  ValidationMiddleware.createEventsValidator('deleteEvent'), 
  eventsController.deleteEvent
);

// ========================================
// ROUTES DE CYCLE DE VIE DES ÉVÉNEMENTS
// ========================================

/**
 * ========================================
 * PUBLICATION D'UN ÉVÉNEMENT
 * ========================================
 * POST /api/events/:id/publish
 * 
 * Permissions requises: events.publish
 * 
 * Change le statut d'un événement de 'draft' à 'published'
 * Rend l'événement visible et accessible au public
 */
router.post('/:id/publish', 
  SecurityMiddleware.withPermissions('events.publish'), 
  eventsController.publishEvent
);

/**
 * ========================================
 * ARCHIVAGE D'UN ÉVÉNEMENT
 * ========================================
 * POST /api/events/:id/archive
 * 
 * Permissions requises: events.archive
 * 
 * Change le statut d'un événement vers 'archived'
 * L'événement n'est plus actif mais reste consultable
 */
router.post('/:id/archive', 
  SecurityMiddleware.withPermissions('events.archive'), 
  eventsController.archiveEvent
);

// ========================================
// EXPORTATION DU ROUTEUR
// ========================================
module.exports = router;