const guestsService = require('./guests.service');
const { 
  ErrorHandler, 
  ValidationError, 
  NotFoundError, 
  AuthorizationError,
  SecurityErrorHandler,
  ConflictError 
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

class GuestsController {
  async createGuest(req, res, next) {
    try {
      // Validation des entrées
      const { first_name, last_name, email, phone } = req.body;
      
      // Validation du prénom
      if (!first_name || typeof first_name !== 'string' || first_name.trim().length < 2) {
        return res.status(400).json(validationErrorResponse({
          field: 'first_name',
          message: 'Le prénom est requis et doit contenir au moins 2 caractères'
        }));
      }
      
      if (first_name.length > 100) {
        return res.status(400).json(validationErrorResponse({
          field: 'first_name',
          message: 'Le prénom ne peut pas dépasser 100 caractères'
        }));
      }
      
      // Validation du nom
      if (!last_name || typeof last_name !== 'string' || last_name.trim().length < 2) {
        return res.status(400).json(validationErrorResponse({
          field: 'last_name',
          message: 'Le nom est requis et doit contenir au moins 2 caractères'
        }));
      }
      
      if (last_name.length > 100) {
        return res.status(400).json(validationErrorResponse({
          field: 'last_name',
          message: 'Le nom ne peut pas dépasser 100 caractères'
        }));
      }
      
      // Validation de l'email
      if (!email) {
        return res.status(400).json(validationErrorResponse({
          field: 'email',
          message: 'L\'email est requis'
        }));
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json(validationErrorResponse({
          field: 'email',
          message: 'L\'email n\'est pas valide'
        }));
      }
      
      if (email.length > 255) {
        return res.status(400).json(validationErrorResponse({
          field: 'email',
          message: 'L\'email ne peut pas dépasser 255 caractères'
        }));
      }
      
      // Validation du téléphone si fourni
      if (phone) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phone)) {
          return res.status(400).json(validationErrorResponse({
            field: 'phone',
            message: 'Le numéro de téléphone n\'est pas valide (format international)'
          }));
        }
      }
      
      // Sécurité: Validation utilisateur
      if (!req.user || !req.user.id) {
        recordSecurityEvent('unauthorized_guest_creation', 'high');
        return res.status(401).json(unauthorizedResponse(
          'Utilisateur non authentifié'
        ));
      }

      // Sécurité: Vérification rate limiting
      if (req.rateLimit && req.rateLimit.remaining === 0) {
        recordSecurityEvent('rate_limit_exceeded', 'medium');
        const rateLimitError = SecurityErrorHandler.handleRateLimit(req);
        return res.status(429).json(errorResponse(
          rateLimitError.message,
          null,
          'RATE_LIMIT_EXCEEDED'
        ));
      }

      // Sécurité: Détection de patterns suspects dans l'email
      if (email && (email.includes('..') || email.includes('://') || email.includes('<script>') || email.includes('javascript:'))) {
        recordSecurityEvent('suspicious_email_pattern', 'high');
        const securityError = SecurityErrorHandler.handleInvalidInput(req, 'Suspicious email pattern detected');
        return res.status(403).json(errorResponse(
          securityError.message,
          null,
          'SECURITY_VIOLATION'
        ));
      }

      const result = await guestsService.createGuest(req.body, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('existe déjà')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        if (result.error && result.error.includes('validation')) {
          return res.status(400).json(validationErrorResponse(result.details || result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      recordBusinessOperation('guest_created', 'success');
      res.status(201).json(createdResponse(
        result.message || 'Invité créé avec succès',
        result.data
      ));
    } catch (error) {
      recordBusinessOperation('guest_created', 'error');
      next(error);
    }
  }

  async getGuest(req, res, next) {
    try {
      const { id } = req.params;
      
      // Validation du paramètre ID
      if (!id) {
        return res.status(400).json(badRequestResponse(
          'L\'ID de l\'invité est requis'
        ));
      }
      
      const guestId = parseInt(id);
      
      if (isNaN(guestId) || guestId <= 0) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'invité doit être un nombre entier positif'
        }));
      }

      // Sécurité: Détection de tentatives d'injection
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*') || id.toString().includes('DROP') || id.toString().includes('DELETE')) {
        recordSecurityEvent('sql_injection_attempt', 'critical');
        const securityError = SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in guest ID');
        return res.status(403).json(errorResponse(
          securityError.message,
          null,
          'SECURITY_VIOLATION'
        ));
      }

      const result = await guestsService.getGuestById(guestId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Invité'));
        }
        if (result.error && result.error.includes('accès')) {
          return res.status(403).json(forbiddenResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      recordBusinessOperation('guest_viewed', 'success');
      res.json(successResponse(
        'Invité récupéré avec succès',
        result.data
      ));
    } catch (error) {
      recordBusinessOperation('guest_viewed', 'error');
      next(error);
    }
  }

  async getGuests(req, res, next) {
    try {
      // Validation des paramètres de requête
      const { page, limit, status, search, event_id } = req.query;
      
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
        const securityError = SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in guest search');
        return res.status(403).json(errorResponse(
          securityError.message,
          null,
          'SECURITY_VIOLATION'
        ));
      }

      // Validation du statut si fourni
      const validStatuses = ['pending', 'confirmed', 'cancelled'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json(validationErrorResponse({
          field: 'status',
          message: `Le statut doit être l'une des valeurs suivantes: ${validStatuses.join(', ')}`
        }));
      }

      // Validation de event_id si fourni
      if (event_id) {
        const eventId = parseInt(event_id);
        if (isNaN(eventId) || eventId <= 0) {
          return res.status(400).json(validationErrorResponse({
            field: 'event_id',
            message: 'L\'ID de l\'événement doit être un nombre entier positif'
          }));
        }
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        status,
        search,
        event_id: event_id ? parseInt(event_id) : undefined,
        userId: req.user.id
      };

      const result = await guestsService.getGuests(options);
      
      if (!result.success) {
        if (result.error && result.error.includes('non autorisé')) {
          return res.status(403).json(forbiddenResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      // Réponse paginée si pagination
      if (result.pagination) {
        recordBusinessOperation('guests_listed', 'success');
        res.json(paginatedResponse(
          'Invités récupérés avec succès',
          result.data,
          result.pagination
        ));
      } else {
        recordBusinessOperation('guests_listed', 'success');
        res.json(successResponse(
          'Invités récupérés avec succès',
          result.data
        ));
      }
    } catch (error) {
      recordBusinessOperation('guests_listed', 'error');
      next(error);
    }
  }

  async updateGuest(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid guest ID provided');
      }

      const guestId = parseInt(id);
      
      // Security: Check if guest exists and user has access
      const existingGuest = await guestsService.getGuestById(guestId, req.user.id);
      if (!existingGuest.success) {
        throw new NotFoundError('Guest');
      }

      // Security: Validate update data
      const updateData = req.body;
      
      if (updateData.email) {
        // Security: Validate email format and check for suspicious patterns
        if (updateData.email.includes('..') || updateData.email.includes('://') || updateData.email.length > 255) {
          throw SecurityErrorHandler.handleInvalidInput(req, 'Suspicious email pattern detected');
        }
      }

      if (updateData.phone) {
        // Security: Validate phone format
        if (!/^[\+]?[1-9][\d]{0,14}$/.test(updateData.phone.replace(/\s/g, ''))) {
          throw new ValidationError('Invalid phone number format');
        }
      }

      if (updateData.status && !['pending', 'confirmed', 'cancelled'].includes(updateData.status)) {
        throw new ValidationError('Invalid guest status');
      }

      const result = await guestsService.updateGuest(guestId, updateData, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Guest');
        }
        if (result.error && result.error.includes('already exists')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteGuest(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid guest ID provided');
      }

      const guestId = parseInt(id);
      
      // Security: Check if guest exists and user has access
      const existingGuest = await guestsService.getGuestById(guestId, req.user.id);
      if (!existingGuest.success) {
        throw new NotFoundError('Guest');
      }

      // Security: Check business rules - can't delete guests with active tickets
      if (existingGuest.data.has_active_tickets) {
        throw new ValidationError('Cannot delete guest with active tickets. Cancel tickets first.');
      }

      const result = await guestsService.deleteGuest(guestId, req.user.id);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async addGuestToEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      
      // Security: Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventIdInt = parseInt(eventId);
      
      // Security: Validate request data
      const { guest_id, invitation_code } = req.body;
      
      if (!guest_id || isNaN(parseInt(guest_id))) {
        throw new ValidationError('Valid guest ID is required');
      }

      if (invitation_code && (invitation_code.length < 6 || invitation_code.length > 50)) {
        throw new ValidationError('Invitation code must be between 6 and 50 characters');
      }

      // Security: Check for suspicious patterns in invitation code
      if (invitation_code && (invitation_code.includes(';') || invitation_code.includes('--') || invitation_code.includes('/*'))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in invitation code');
      }

      const result = await guestsService.addGuestToEvent(eventIdInt, guest_id, invitation_code, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event or Guest');
        }
        if (result.error && result.error.includes('already added')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async checkInGuest(req, res, next) {
    try {
      const { eventId, guestId } = req.params;
      
      // Security: Validate IDs
      if (!eventId || isNaN(parseInt(eventId))) {
        throw new ValidationError('Invalid event ID provided');
      }
      
      if (!guestId || isNaN(parseInt(guestId))) {
        throw new ValidationError('Invalid guest ID provided');
      }

      const eventIdInt = parseInt(eventId);
      const guestIdInt = parseInt(guestId);
      
      // Security: Validate request data
      const { invitation_code } = req.body;
      
      if (!invitation_code || invitation_code.length < 6) {
        throw new ValidationError('Valid invitation code is required');
      }

      const result = await guestsService.checkInGuest(eventIdInt, guestIdInt, invitation_code, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event guest');
        }
        if (result.error && result.error.includes('already checked in')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkAddGuests(req, res, next) {
    try {
      const { eventId } = req.params;
      
      // Security: Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventIdInt = parseInt(eventId);
      
      // Security: Validate guests array
      const { guests } = req.body;
      
      if (!guests || !Array.isArray(guests)) {
        throw new ValidationError('Guests array is required');
      }

      if (guests.length === 0) {
        throw new ValidationError('At least one guest must be provided');
      }

      if (guests.length > 100) {
        throw new ValidationError('Cannot add more than 100 guests at once');
      }

      // Security: Validate each guest
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        
        if (!guest.first_name || guest.first_name.length < 2 || guest.first_name.length > 255) {
          throw new ValidationError(`Invalid first name for guest at index ${i}`);
        }
        
        if (!guest.last_name || guest.last_name.length < 2 || guest.last_name.length > 255) {
          throw new ValidationError(`Invalid last name for guest at index ${i}`);
        }
        
        if (!guest.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) {
          throw new ValidationError(`Invalid email for guest at index ${i}`);
        }

        // Security: Check for suspicious patterns
        if (guest.email.includes('..') || guest.email.includes('://')) {
          throw SecurityErrorHandler.handleInvalidInput(req, `Suspicious email pattern for guest at index ${i}`);
        }
      }

      const result = await guestsService.bulkAddGuests(eventIdInt, guests, req.user.id);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getGuestStats(req, res, next) {
    try {
      const { eventId } = req.params;
      
      // Security: Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventIdInt = parseInt(eventId);
      
      // Security: Check user permissions for stats access
      const result = await guestsService.getGuestStats(eventIdInt, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event');
        }
        if (result.error && result.error.includes('access denied')) {
          throw new AuthorizationError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventGuests(req, res, next) {
    try {
      const { eventId } = req.params;
      
      // Security: Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventIdInt = parseInt(eventId);
      
      // Security: Validate query parameters
      const { page, limit, status, search } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        throw new ValidationError('Invalid limit parameter (must be between 1 and 100)');
      }

      if (search && search.length > 255) {
        throw new ValidationError('Search query too long (max 255 characters)');
      }

      // Security: Check for XSS in search
      if (search && (search.includes('<script>') || search.includes('javascript:') || search.includes('onerror=') || search.includes('onclick='))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in guest search');
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        status,
        search
      };

      const result = await guestsService.getEventGuests(eventIdInt, options, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async checkInGuestById(req, res, next) {
    try {
      const { eventId, guestId } = req.params;
      
      // Security: Validate IDs
      if (!eventId || isNaN(parseInt(eventId))) {
        throw new ValidationError('Invalid event ID provided');
      }
      
      if (!guestId || isNaN(parseInt(guestId))) {
        throw new ValidationError('Invalid guest ID provided');
      }

      const eventIdInt = parseInt(eventId);
      const guestIdInt = parseInt(guestId);
      
      // Security: Validate request data
      const { invitation_code } = req.body;
      
      if (!invitation_code || invitation_code.length < 6) {
        throw new ValidationError('Valid invitation code is required');
      }

      const result = await guestsService.checkInGuest(eventIdInt, guestIdInt, invitation_code, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event guest');
        }
        if (result.error && result.error.includes('already checked in')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      recordBusinessOperation('guest_checked_in', 'success');
      res.json(successResponse(
        'Guest checked in successfully',
        result.data
      ));
    } catch (error) {
      recordBusinessOperation('guest_checked_in', 'error');
      next(error);
    }
  }

  async bulkAddGuestsToEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const { guests } = req.body;
      
      // Security: Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventIdInt = parseInt(eventId);
      
      // Security: Validate guests array
      if (!guests || !Array.isArray(guests)) {
        throw new ValidationError('Guests array is required');
      }

      if (guests.length === 0) {
        throw new ValidationError('At least one guest must be provided');
      }

      if (guests.length > 100) {
        throw new ValidationError('Cannot add more than 100 guests at once');
      }

      // Security: Validate each guest
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        
        if (!guest.guest_id || isNaN(parseInt(guest.guest_id))) {
          throw new ValidationError(`Invalid guest_id at index ${i}`);
        }

        if (guest.invitation_code && (guest.invitation_code.length < 6 || guest.invitation_code.length > 255)) {
          throw new ValidationError(`Invalid invitation code at index ${i}`);
        }

        // Security: Check for SQL injection
        if (guest.guest_id.toString().includes(';') || guest.guest_id.toString().includes('--') || guest.guest_id.toString().includes('/*')) {
          throw SecurityErrorHandler.handleInvalidInput(req, `SQL injection attempt in guest_id at index ${i}`);
        }

        if (guest.invitation_code && (guest.invitation_code.includes(';') || guest.invitation_code.includes('--') || guest.invitation_code.includes('/*'))) {
          throw SecurityErrorHandler.handleInvalidInput(req, `SQL injection attempt in invitation code at index ${i}`);
        }
      }

      const result = await guestsService.bulkAddGuestsToEvent(eventIdInt, guests, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GuestsController();
