const express = require('express');
const Joi = require('joi');
const eventsController = require('./events.controller');
const { SecurityMiddleware, ValidationMiddleware, ContextInjector } = require('../../../../shared');
const { eventsErrorHandler } = require('./events.errorHandler');

const router = express.Router();

// Apply authentication to all routes
router.use(SecurityMiddleware.authenticated());

// Apply context injection for all routes
router.use(ContextInjector.injectEventContext());

// Apply error handler for all routes
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
router.post('/', ValidationMiddleware.createEventsValidator('createEvent'), eventsController.createEvent);

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Lister les événements de l'utilisateur
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filtrer par statut
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Terme de recherche
 *     responses:
 *       200:
 *         description: Liste des événements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes
 */
// GET routes - validation simple et cohérente
router.get('/', ValidationMiddleware.validateQuery({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('draft', 'published', 'archived').optional(),
  search: Joi.string().max(100).optional()
}), eventsController.getEvents);

router.get('/stats', ValidationMiddleware.validateQuery({
  event_id: Joi.number().integer().positive().optional()
}), eventsController.getEventStats);

router.get('/:id', ValidationMiddleware.validateParams({
  id: Joi.number().integer().positive().required()
}), eventsController.getEventById);

router.put('/:id', ValidationMiddleware.createEventsValidator('updateEvent'), eventsController.updateEvent);

router.delete('/:id', ValidationMiddleware.createEventsValidator('deleteEvent'), eventsController.deleteEvent);

// Event Lifecycle Management
router.post('/:id/publish', ValidationMiddleware.createEventsValidator('publishEvent'), eventsController.publishEvent);

router.post('/:id/archive', ValidationMiddleware.createEventsValidator('archiveEvent'), eventsController.archiveEvent);

module.exports = router;