const guestsService = require('./guests.service');
const { 
  ErrorHandler, 
  ValidationError, 
  NotFoundError, 
  AuthorizationError,
  SecurityErrorHandler,
  ConflictError 
} = require('../../utils/errors');

class GuestsController {
  async createGuest(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Rate limiting check
      if (req.rateLimit && req.rateLimit.remaining === 0) {
        throw SecurityErrorHandler.handleRateLimit(req);
      }

      // Security: Validate email format and check for suspicious patterns
      const { email } = req.body;
      if (email && (email.includes('..') || email.includes('://') || email.length > 255)) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'Suspicious email pattern detected');
      }

      const result = await guestsService.createGuest(req.body, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('already exists')) {
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

  async getGuest(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid guest ID provided');
      }

      const guestId = parseInt(id);
      
      // Security: Check for potential SQL injection patterns
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in guest ID');
      }

      const result = await guestsService.getGuestById(guestId, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Guest');
        }
        throw new ValidationError(result.error, result.details);
      }

      // Security: Log access to sensitive personal data
      console.info('Guest data accessed:', {
        guestId,
        userId: req.user.id,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async getGuests(req, res, next) {
    try {
      // Security: Validate query parameters
      const { page, limit, status, search, event_id } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        throw new ValidationError('Invalid limit parameter (must be between 1 and 100)');
      }

      if (search && search.length > 255) {
        throw new ValidationError('Search query too long (max 255 characters)');
      }

      // Security: Check for XSS patterns in search
      if (search && (search.includes('<script>') || search.includes('javascript:') || search.includes('onload='))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in search query');
      }

      // Security: Validate status parameter
      if (status && !['pending', 'confirmed', 'cancelled'].includes(status)) {
        throw new ValidationError('Invalid status parameter');
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        status,
        search,
        event_id: event_id ? parseInt(event_id) : null,
        userId: req.user.id
      };

      const result = await guestsService.getGuests(options);
      
      if (!result.success) {
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
}

module.exports = new GuestsController();
