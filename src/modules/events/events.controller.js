const eventsService = require('./events.service');
const { 
  ErrorHandler, 
  ValidationError, 
  NotFoundError, 
  AuthorizationError,
  SecurityErrorHandler 
} = require('../../utils/errors');

class EventsController {
  async createEvent(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Rate limiting check (would be implemented by middleware)
      if (req.rateLimit && req.rateLimit.remaining === 0) {
        throw SecurityErrorHandler.handleRateLimit(req);
      }

      const result = await eventsService.createEvent(req.body, req.user.id);
      
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

  async getEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventId = parseInt(id);
      
      // Security: Check for potential SQL injection patterns
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in event ID');
      }

      const result = await eventsService.getEventById(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event');
        }
        throw new ValidationError(result.error, result.details);
      }

      // Security: Log access to sensitive data
      if (result.data && result.data.organizer_id !== req.user.id) {
        console.warn('Access to non-owned event:', {
          eventId,
          userId: req.user.id,
          organizerId: result.data.organizer_id,
          ip: req.ip
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req, res, next) {
    try {
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

      // Security: Check for XSS patterns in search
      if (search && (search.includes('<script>') || search.includes('javascript:'))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in search query');
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

  async updateEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventId = parseInt(id);
      
      // Security: Check ownership before update
      const existingEvent = await eventsService.getEventById(eventId, req.user.id);
      if (!existingEvent.success) {
        throw new NotFoundError('Event');
      }

      if (existingEvent.data.organizer_id !== req.user.id) {
        throw new AuthorizationError('Only event organizers can update events');
      }

      // Security: Validate update data
      const updateData = req.body;
      if (updateData.status && !['draft', 'published', 'archived'].includes(updateData.status)) {
        throw new ValidationError('Invalid event status');
      }

      if (updateData.event_date && new Date(updateData.event_date) < new Date()) {
        throw new ValidationError('Event date cannot be in the past');
      }

      const result = await eventsService.updateEvent(eventId, updateData, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event');
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

  async deleteEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventId = parseInt(id);
      
      // Security: Check ownership before deletion
      const existingEvent = await eventsService.getEventById(eventId, req.user.id);
      if (!existingEvent.success) {
        throw new NotFoundError('Event');
      }

      if (existingEvent.data.organizer_id !== req.user.id) {
        throw new AuthorizationError('Only event organizers can delete events');
      }

      // Security: Check if event can be deleted (no tickets sold, etc.)
      if (existingEvent.data.status === 'published') {
        throw new ValidationError('Cannot delete published events. Archive them instead.');
      }

      const result = await eventsService.deleteEvent(eventId, req.user.id);
      
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

  async publishEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventId = parseInt(id);
      
      // Security: Check ownership and business rules
      const existingEvent = await eventsService.getEventById(eventId, req.user.id);
      if (!existingEvent.success) {
        throw new NotFoundError('Event');
      }

      if (existingEvent.data.organizer_id !== req.user.id) {
        throw new AuthorizationError('Only event organizers can publish events');
      }

      if (existingEvent.data.status !== 'draft') {
        throw new ValidationError('Only draft events can be published');
      }

      // Security: Validate event is ready for publication
      if (!existingEvent.data.title || !existingEvent.data.location || !existingEvent.data.event_date) {
        throw new ValidationError('Event must have title, location, and date to be published');
      }

      const result = await eventsService.publishEvent(eventId, req.user.id);
      
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

  async archiveEvent(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventId = parseInt(id);
      
      // Security: Check ownership
      const existingEvent = await eventsService.getEventById(eventId, req.user.id);
      if (!existingEvent.success) {
        throw new NotFoundError('Event');
      }

      if (existingEvent.data.organizer_id !== req.user.id) {
        throw new AuthorizationError('Only event organizers can archive events');
      }

      if (existingEvent.data.status === 'archived') {
        throw new ValidationError('Event is already archived');
      }

      const result = await eventsService.archiveEvent(eventId, req.user.id);
      
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

  async getEventStats(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventId = parseInt(id);
      
      // Security: Check ownership for stats access
      const existingEvent = await eventsService.getEventById(eventId, req.user.id);
      if (!existingEvent.success) {
        throw new NotFoundError('Event');
      }

      if (existingEvent.data.organizer_id !== req.user.id) {
        throw new AuthorizationError('Only event organizers can view event statistics');
      }

      const result = await eventsService.getEventStats(eventId, req.user.id);
      
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
}

module.exports = new EventsController();
