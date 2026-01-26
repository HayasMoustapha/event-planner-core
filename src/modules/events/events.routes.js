const express = require('express');
const eventsController = require('./events.controller');
const { AuthMiddleware } = require("../../../../shared");
const { validate, schemas } = require("../../middleware/validation");
const { normalizeContext, normalizeIdContext } = require("../../middleware/context-normalization");

// Utiliser le vrai middleware stateless
const { authenticate, requirePermission } = AuthMiddleware;

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

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
router.post('/', 
  normalizeContext(),
  validate(schemas.createEvent),
  requirePermission('events.create'),
  eventsController.createEvent
);

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
router.get('/', 
  normalizeContext(),
  validate(schemas.pagination, 'query'),
  requirePermission('events.read'),
  eventsController.getEvents
);

router.get('/stats', 
  normalizeContext(),
  requirePermission('events.read'),
  eventsController.getEventStats
);

router.get('/:id', 
  normalizeIdContext(),
  validate(schemas.idParam, 'params'),
  requirePermission('events.read'),
  eventsController.getEvent
);

router.put('/:id', 
  normalizeIdContext(),
  validate(schemas.idParam, 'params'),
  validate(schemas.updateEvent),
  requirePermission('events.update'),
  eventsController.updateEvent
);

router.delete('/:id', 
  normalizeIdContext(),
  validate(schemas.idParam, 'params'),
  requirePermission('events.delete'),
  eventsController.deleteEvent
);

// Event Lifecycle Management
router.post('/:id/publish', 
  normalizeIdContext(),
  validate(schemas.idParam, 'params'),
  requirePermission('events.publish'),
  eventsController.publishEvent
);

router.post('/:id/archive', 
  normalizeIdContext(),
  validate(schemas.idParam, 'params'),
  requirePermission('events.archive'),
  eventsController.archiveEvent
);

module.exports = router;