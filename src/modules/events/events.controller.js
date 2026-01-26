const eventsService = require('./events.service');
const { 
  ErrorHandler, 
  ValidationError, 
  NotFoundError, 
  AuthorizationError,
  SecurityErrorHandler 
} = require('../../utils/errors');
const { 
  createResponse,
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  serverErrorResponse,
  badRequestResponse,
  createdResponse,
  paginatedResponse
} = require('../../utils/response');
const { recordSecurityEvent, recordBusinessOperation } = require('../../middleware/metrics');

class EventsController {
  async createEvent(req, res, next) {
    try {
      // Extraction des données (PLUS de organizer_id dans req.body)
      const { title, description, event_date, location } = req.body;
      
      // INJECTION AUTOMATIQUE du user_id depuis le contexte d'authentification
      const organizerId = req.user.id;

      const result = await eventsService.createEvent({
        title,
        description,
        event_date,
        location
      }, organizerId);
      
      if (!result.success) {
        // Gérer les différents types d'erreurs
        if (result.error && result.error.includes('existe déjà')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        
        // Erreur de validation
        if (result.details) {
          return res.status(400).json(validationErrorResponse(result.details));
        }
        
        // Autre erreur
        return res.status(400).json(badRequestResponse(
          result.error || 'Erreur lors de la création de l\'événement'
        ));
      }

      recordBusinessOperation('event_created', 'success');
      res.status(201).json(createdResponse(
        result.message || 'Événement créé avec succès',
        result.data
      ));
    } catch (error) {
      recordBusinessOperation('event_created', 'error');
      
      // Ne pas lancer de ValidationError avec message vide
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      
      next(error);
    }
  }

  async getEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      // Validation du paramètre ID
      if (!id) {
        return res.status(400).json(badRequestResponse(
          'L\'ID de l\'événement est requis'
        ));
      }
      
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'événement doit être un nombre entier positif'
        }));
      }

      // Sécurité: Détection de tentatives d'injection
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*') || id.toString().includes('DROP') || id.toString().includes('DELETE')) {
        recordSecurityEvent('sql_injection_attempt', 'critical');
        const securityError = SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in event ID');
        return res.status(403).json(errorResponse(
          securityError.message,
          null,
          'SECURITY_VIOLATION'
        ));
      }

      const result = await eventsService.getEventById(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        if (result.error && result.error.includes('accès')) {
          return res.status(403).json(forbiddenResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      // Sécurité: Log accès aux données sensibles
      if (result.data && result.data.organizer_id !== req.user.id) {
        console.warn('Access to non-owned event:', {
          eventId,
          userId: req.user.id,
          organizerId: result.data.organizer_id,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        recordSecurityEvent('unauthorized_event_access', 'medium');
      }

      recordBusinessOperation('event_viewed', 'success');
      res.json(successResponse(
        'Événement récupéré avec succès',
        result.data
      ));
    } catch (error) {
      recordBusinessOperation('event_viewed', 'error');
      next(error);
    }
  }

  async getEvents(req, res, next) {
    try {
      // Validation des paramètres de requête
      const { page, limit, status, search } = req.query;
      
      // Validation du paramètre page
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        return res.status(400).json(validationErrorResponse({
          field: 'page',
          message: 'Le numéro de page doit être un entier positif'
        }));
      }
      
      // Validation du paramètre limit
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        return res.status(400).json(validationErrorResponse({
          field: 'limit',
          message: 'La limite doit être un entier entre 1 et 100'
        }));
      }

      // Validation du paramètre search
      if (search && search.length > 255) {
        return res.status(400).json(validationErrorResponse({
          field: 'search',
          message: 'La recherche ne peut pas dépasser 255 caractères'
        }));
      }

      // Sécurité: Détection XSS dans la recherche
      if (search && (search.includes('<script>') || search.includes('javascript:') || search.includes('onerror=') || search.includes('onclick='))) {
        recordSecurityEvent('xss_attempt', 'high');
        const securityError = SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in search query');
        return res.status(403).json(errorResponse(
          securityError.message,
          null,
          'SECURITY_VIOLATION'
        ));
      }

      // Validation du statut si fourni
      const validStatuses = ['draft', 'published', 'archived'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json(validationErrorResponse({
          field: 'status',
          message: `Le statut doit être l'une des valeurs suivantes: ${validStatuses.join(', ')}`
        }));
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        status,
        search,
        userId: req.user.id
      };

      const result = await eventsService.getEvents(options);
      
      if (!result.success) {
        if (result.error && result.error.includes('non autorisé')) {
          return res.status(403).json(forbiddenResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      // Réponse paginée si pagination
      if (result.pagination) {
        recordBusinessOperation('events_listed', 'success');
        res.json(paginatedResponse(
          'Événements récupérés avec succès',
          result.data,
          result.pagination
        ));
      } else {
        recordBusinessOperation('events_listed', 'success');
        res.json(successResponse(
          'Événements récupérés avec succès',
          result.data
        ));
      }
    } catch (error) {
      recordBusinessOperation('events_listed', 'error');
      next(error);
    }
  }

  async updateEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      // Validation du paramètre ID
      if (!id) {
        return res.status(400).json(badRequestResponse(
          'L\'ID de l\'événement est requis'
        ));
      }
      
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'événement doit être un nombre entier positif'
        }));
      }

      // Validation des données de mise à jour
      const updateData = req.body;
      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json(badRequestResponse(
          'Au moins un champ doit être fourni pour la mise à jour'
        ));
      }

      // Validation du titre si fourni
      if (updateData.title && (typeof updateData.title !== 'string' || updateData.title.trim().length < 3)) {
        return res.status(400).json(validationErrorResponse({
          field: 'title',
          message: 'Le titre doit contenir au moins 3 caractères'
        }));
      }

      // Validation de la date si fournie
      if (updateData.event_date) {
        const eventDate = new Date(updateData.event_date);
        if (isNaN(eventDate.getTime())) {
          return res.status(400).json(validationErrorResponse({
            field: 'event_date',
            message: 'La date de l\'événement est invalide'
          }));
        }
        
        if (eventDate < new Date()) {
          return res.status(400).json(badRequestResponse(
            'La date de l\'événement ne peut pas être dans le passé'
          ));
        }
      }

      // Validation du statut si fourni
      if (updateData.status && !['draft', 'published', 'archived'].includes(updateData.status)) {
        return res.status(400).json(validationErrorResponse({
          field: 'status',
          message: 'Le statut doit être draft, published ou archived'
        }));
      }

      // Validation de la description si fournie
      if (updateData.description && (typeof updateData.description !== 'string' || updateData.description.length > 2000)) {
        return res.status(400).json(validationErrorResponse({
          field: 'description',
          message: 'La description doit être une chaîne de maximum 2000 caractères'
        }));
      }

      // Validation du lieu si fourni
      if (updateData.location && (typeof updateData.location !== 'string' || updateData.location.trim().length < 3)) {
        return res.status(400).json(validationErrorResponse({
          field: 'location',
          message: 'Le lieu doit contenir au moins 3 caractères'
        }));
      }

      // Sécurité: Vérification de l'événement existant
      const existingEvent = await eventsService.getEventById(eventId, req.user.id);
      if (!existingEvent.success) {
        if (existingEvent.error && (existingEvent.error.includes('non trouvé') || existingEvent.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        throw new ValidationError(existingEvent.error, existingEvent.details);
      }

      // Sécurité: Vérification des permissions
      if (existingEvent.data.organizer_id !== req.user.id) {
        recordSecurityEvent('unauthorized_event_update', 'high');
        return res.status(403).json(forbiddenResponse(
          'Seul l\'organisateur peut modifier un événement'
        ));
      }

      const result = await eventsService.updateEvent(eventId, updateData, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      recordBusinessOperation('event_updated', 'success');
      res.json(successResponse(
        result.message || 'Événement mis à jour avec succès',
        result.data
      ));
    } catch (error) {
      recordBusinessOperation('event_updated', 'error');
      next(error);
    }
  }

  async deleteEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      // Validation du paramètre ID
      if (!id) {
        return res.status(400).json(badRequestResponse(
          'L\'ID de l\'événement est requis'
        ));
      }
      
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'événement doit être un nombre entier positif'
        }));
      }

      // Sécurité: Vérification de l'événement existant
      const existingEvent = await eventsService.getEventById(eventId, req.user.id);
      if (!existingEvent.success) {
        if (existingEvent.error && (existingEvent.error.includes('non trouvé') || existingEvent.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        throw new ValidationError(existingEvent.error, existingEvent.details);
      }

      // Sécurité: Vérification des permissions
      if (existingEvent.data.organizer_id !== req.user.id) {
        recordSecurityEvent('unauthorized_event_deletion', 'high');
        return res.status(403).json(forbiddenResponse(
          'Seul l\'organisateur peut supprimer un événement'
        ));
      }

      // Validation: Vérifier si l'événement peut être supprimé
      if (existingEvent.data.status === 'published') {
        return res.status(400).json(badRequestResponse(
          'Impossible de supprimer un événement publié. Archivez-le plutôt.'
        ));
      }

      // Validation: Vérifier s'il y a des billets vendus
      if (existingEvent.data.tickets_sold && existingEvent.data.tickets_sold > 0) {
        return res.status(400).json(badRequestResponse(
          'Impossible de supprimer un événement avec des billets vendus'
        ));
      }

      const result = await eventsService.deleteEvent(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      recordBusinessOperation('event_deleted', 'success');
      res.json(successResponse(
        result.message || 'Événement supprimé avec succès',
        result.data
      ));
    } catch (error) {
      recordBusinessOperation('event_deleted', 'error');
      next(error);
    }
  }

  async publishEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      // Validation du paramètre ID
      if (!id) {
        return res.status(400).json(badRequestResponse(
          'L\'ID de l\'événement est requis'
        ));
      }
      
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'événement doit être un nombre entier positif'
        }));
      }

      // Sécurité: Vérification de l'événement existant
      const existingEvent = await eventsService.getEventById(eventId, req.user.id);
      if (!existingEvent.success) {
        if (existingEvent.error && (existingEvent.error.includes('non trouvé') || existingEvent.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        throw new ValidationError(existingEvent.error, existingEvent.details);
      }

      // Sécurité: Vérification des permissions
      if (existingEvent.data.organizer_id !== req.user.id) {
        recordSecurityEvent('unauthorized_event_publish', 'high');
        return res.status(403).json(forbiddenResponse(
          'Seul l\'organisateur peut publier un événement'
        ));
      }

      // Validation: Vérifier si l'événement peut être publié
      if (existingEvent.data.status !== 'draft') {
        return res.status(400).json(badRequestResponse(
          'Seuls les événements en brouillon peuvent être publiés'
        ));
      }

      // Validation: Vérifier si l'événement est prêt pour la publication
      if (!existingEvent.data.title || !existingEvent.data.location || !existingEvent.data.event_date) {
        return res.status(400).json(badRequestResponse(
          'L\'événement doit avoir un titre, un lieu et une date pour être publié'
        ));
      }

      // Validation: Vérifier si la date est dans le futur
      if (new Date(existingEvent.data.event_date) < new Date()) {
        return res.status(400).json(badRequestResponse(
          'Impossible de publier un événement dont la date est dans le passé'
        ));
      }

      const result = await eventsService.publishEvent(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      recordBusinessOperation('event_published', 'success');
      res.json(successResponse(
        result.message || 'Événement publié avec succès',
        result.data
      ));
    } catch (error) {
      recordBusinessOperation('event_published', 'error');
      next(error);
    }
  }

  async archiveEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      // Validation du paramètre ID
      if (!id) {
        return res.status(400).json(badRequestResponse(
          'L\'ID de l\'événement est requis'
        ));
      }
      
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'événement doit être un nombre entier positif'
        }));
      }

      // Sécurité: Vérification de l'événement existant
      const existingEvent = await eventsService.getEventById(eventId, req.user.id);
      if (!existingEvent.success) {
        if (existingEvent.error && (existingEvent.error.includes('non trouvé') || existingEvent.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        throw new ValidationError(existingEvent.error, existingEvent.details);
      }

      // Sécurité: Vérification des permissions
      if (existingEvent.data.organizer_id !== req.user.id) {
        recordSecurityEvent('unauthorized_event_archive', 'high');
        return res.status(403).json(forbiddenResponse(
          'Seul l\'organisateur peut archiver un événement'
        ));
      }

      // Validation: Vérifier si l'événement est déjà archivé
      if (existingEvent.data.status === 'archived') {
        return res.status(400).json(badRequestResponse(
          'L\'événement est déjà archivé'
        ));
      }

      const result = await eventsService.archiveEvent(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      recordBusinessOperation('event_archived', 'success');
      res.json(successResponse(
        result.message || 'Événement archivé avec succès',
        result.data
      ));
    } catch (error) {
      recordBusinessOperation('event_archived', 'error');
      next(error);
    }
  }

  async getEventStats(req, res, next) {
    try {
      const { id } = req.params;
      
      // Validation du paramètre ID
      if (!id) {
        return res.status(400).json(badRequestResponse(
          'L\'ID de l\'événement est requis'
        ));
      }
      
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'événement doit être un nombre entier positif'
        }));
      }

      // Sécurité: Vérification de l'événement existant
      const existingEvent = await eventsService.getEventById(eventId, req.user.id);
      if (!existingEvent.success) {
        if (existingEvent.error && (existingEvent.error.includes('non trouvé') || existingEvent.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        throw new ValidationError(existingEvent.error, existingEvent.details);
      }

      // Sécurité: Vérification des permissions pour les stats
      if (existingEvent.data.organizer_id !== req.user.id) {
        recordSecurityEvent('unauthorized_stats_access', 'high');
        return res.status(403).json(forbiddenResponse(
          'Seul l\'organisateur peut voir les statistiques d\'un événement'
        ));
      }

      const result = await eventsService.getEventStats(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        if (result.error && result.error.includes('accès')) {
          return res.status(403).json(forbiddenResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      recordBusinessOperation('event_stats_viewed', 'success');
      res.json(successResponse(
        'Statistiques de l\'événement récupérées avec succès',
        result.data
      ));
    } catch (error) {
      recordBusinessOperation('event_stats_viewed', 'error');
      next(error);
    }
  }
}

module.exports = new EventsController();
