/**
 * ========================================
 * ABOONNEMENT EVENT PLANNER CORE AU SYSTÈME PARTAGÉ
 * ========================================
 * Configuration et utilisation du système centralisé
 * Remplace la gestion locale des erreurs et réponses
 */

const { 
  sharedSystem, 
  configureService,
  middlewares,
  createController,
  log,
  createResponse,
  validate,
  asyncWrapper,
  
  // Système d'erreurs
  errorHandler,
  ERROR_CODES,
  createError,
  formatApiError,
  getErrorMessage,
  
  // Système de réponses
  success,
  error,
  validationError,
  unauthorized,
  forbidden,
  notFound
} = require('../../../shared');

// ========================================
// CONFIGURATION DU SERVICE EVENT PLANNER CORE
// ========================================
const eventPlannerCoreConfig = configureService('event-planner-core', {
  enableErrorHandling: true,
  enableResponseHandling: true,
  customizations: {
    serviceName: 'Event Planner Core',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  }
});

// ========================================
// CONTRÔLEUR AVEC SYSTÈME PARTAGÉ
// ========================================
const eventController = createController();

// ========================================
// EXEMPLE D'UTILISATION DANS LES ROUTES
// ========================================

/**
 * ========================================
 * ROUTE AVEC SYSTÈME PARTAGÉ - EXEMPLE
 * ========================================
 */
const exampleRouteWithSharedSystem = async (req, res) => {
  try {
    // Utilisation du système de validation partagé
    const validatedData = validate(
      eventController.res.validation.schema.eventCreate,
      req.body
    );
    
    // Log avec système partagé
    log('info', 'Création d\'événement demandée', {
      userId: req.user?.id,
      eventData: validatedData
    });
    
    // Logique métier...
    const createdEvent = await createEventInDatabase(validatedData, req.user.id);
    
    // Réponse avec système partagé
    return success(res, createdEvent, null, 'created', 'Événement');
    
  } catch (err) {
    // Gestion d'erreur avec système partagé
    if (err.code === 'VALIDATION_ERROR') {
      return validationError(res, err.details);
    }
    
    if (err.code === 'EVENT_NOT_FOUND') {
      return notFound(res, 'Événement', { id: req.params.id });
    }
    
    // Erreur générique
    return error(res, err.code || 'INTERNAL_SERVER_ERROR', {
      message: err.message
    });
  }
};

/**
 * ========================================
 * MIDDLEWARE PERSONNALISÉ AVEC SYSTÈME PARTAGÉ
 * ========================================
 */
const customEventMiddleware = (req, res, next) => {
  // Les méthodes de réponse sont déjà attachées par responseMiddleware
  // On peut utiliser res.apiSuccess, res.apiError, etc.
  
  // Exemple: validation personnalisée
  if (!req.user) {
    return res.apiUnauthorized('Utilisateur non authentifié');
  }
  
  if (!req.user.hasPermission('event:create')) {
    return res.apiForbidden('Permission insuffisante pour créer un événement');
  }
  
  next();
};

/**
 * ========================================
 * WRAPPER ASYNCHRONE AVEC SYSTÈME PARTAGÉ
 * ========================================
 */
const asyncEventHandler = (handler) => {
  return asyncWrapper(handler, {
    returnResponse: false, // On gère la réponse manuellement
    logErrors: true,
    throwErrors: false,
    serviceName: 'event-planner-core'
  });
};

// ========================================
// CONFIGURATION EXPRESS AVEC SYSTÈME PARTAGÉ
// ========================================
const configureExpressWithSharedSystem = (app) => {
  // Application des middlewares du système partagé
  app.use(middlewares);
  
  // Middleware de logging personnalisé
  app.use((req, res, next) => {
    log('info', 'Requête reçue', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
    next();
  });
  
  // Routes avec système partagé
  app.post('/api/events', customEventMiddleware, asyncEventHandler(exampleRouteWithSharedSystem));
  
  // Health check avec système partagé
  app.get('/health', (req, res) => {
    const healthData = {
      status: 'healthy',
      service: 'event-planner-core',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'healthy' },
        redis: { status: 'healthy' },
        external_services: { status: 'healthy' }
      }
    };
    
    return res.apiHealthCheck(healthData);
  });
  
  // Metrics avec système partagé
  app.get('/metrics', (req, res) => {
    const metricsData = '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total 1234';
    return res.apiMetrics(metricsData, 'prometheus');
  });
};

// ========================================
// UTILITAIRE DE CRÉATION D'ERREURS SPÉCIFIQUES
// ========================================
const createEventError = (errorCode, details) => {
  return createError(errorCode, {
    service: 'event-planner-core',
    ...details
  });
};

// ========================================
// UTILITAIRE DE VALIDATION SPÉCIFIQUE
// ========================================
const validateEventData = (data) => {
  const Joi = require('joi');
  
  const eventSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(5000).optional(),
    event_date: Joi.date().iso().greater('now').required(),
    location: Joi.string().min(3).max(255).required()
  });
  
  return validate(eventSchema, data);
};

// ========================================
// EXPORTATIONS
// ========================================
module.exports = {
  // Configuration
  config: eventPlannerCoreConfig,
  
  // Contrôleur avec système partagé
  controller: eventController,
  
  // Middlewares
  middlewares,
  customEventMiddleware,
  asyncEventHandler,
  
  // Configuration Express
  configureExpressWithSharedSystem,
  
  // Utilitaires spécifiques
  createEventError,
  validateEventData,
  
  // Routes exemples
  exampleRouteWithSharedSystem,
  
  // Accès direct au système partagé
  sharedSystem,
  log,
  createResponse,
  
  // Codes d'erreur (pour référence)
  ERROR_CODES
};
