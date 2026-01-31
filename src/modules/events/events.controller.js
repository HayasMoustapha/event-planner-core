const eventsService = require('./events.service');
const { ResponseFormatter } = require('../../../../shared');

class EventsController {
  async createEvent(req, res, next) {
    try {
      const { title, description, event_date, location } = req.body;
      const organizerId = req.user?.id;
      
      if (!organizerId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await eventsService.createEvent({
        title,
        description,
        event_date,
        location
      }, organizerId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('Event created successfully', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEventById(req, res, next) {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(ResponseFormatter.error('Invalid event ID', null, 'VALIDATION_ERROR'));
      }

      const result = await eventsService.getEventById(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('not found') || result.error.includes('non trouvé'))) {
          return res.status(404).json(ResponseFormatter.notFound('Event'));
        }
        if (result.error && result.error.includes('accès')) {
          return res.status(403).json(ResponseFormatter.forbidden('Access denied'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Event retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req, res, next) {
    try {
      const { page, limit, status, search } = req.query;
      const result = await eventsService.getEvents({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        search,
        userId: req.user.id
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Events retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req, res, next) {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(ResponseFormatter.error('Invalid event ID', null, 'VALIDATION_ERROR'));
      }

      const result = await eventsService.updateEvent(eventId, req.body, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('not found') || result.error.includes('non trouvé'))) {
          return res.status(404).json(ResponseFormatter.notFound('Event'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Event updated', result.data));
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req, res, next) {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(ResponseFormatter.error('Invalid event ID', null, 'VALIDATION_ERROR'));
      }

      const result = await eventsService.deleteEvent(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('not found') || result.error.includes('non trouvé'))) {
          return res.status(404).json(ResponseFormatter.notFound('Event'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Event deleted', result.data));
    } catch (error) {
      next(error);
    }
  }

  async publishEvent(req, res, next) {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(ResponseFormatter.error('Invalid event ID', null, 'VALIDATION_ERROR'));
      }

      const result = await eventsService.publishEvent(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('not found') || result.error.includes('non trouvé'))) {
          return res.status(404).json(ResponseFormatter.notFound('Event'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Event published', result.data));
    } catch (error) {
      next(error);
    }
  }

  async archiveEvent(req, res, next) {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(ResponseFormatter.error('Invalid event ID', null, 'VALIDATION_ERROR'));
      }

      const result = await eventsService.archiveEvent(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('not found') || result.error.includes('non trouvé'))) {
          return res.status(404).json(ResponseFormatter.notFound('Event'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Event archived', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEventStats(req, res, next) {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(ResponseFormatter.error('Invalid event ID', null, 'VALIDATION_ERROR'));
      }

      const result = await eventsService.getEventStats(eventId, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('not found') || result.error.includes('non trouvé'))) {
          return res.status(404).json(ResponseFormatter.notFound('Event'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Event statistics retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async duplicateEvent(req, res, next) {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId) || eventId <= 0) {
        return res.status(400).json(ResponseFormatter.error('Invalid event ID', null, 'VALIDATION_ERROR'));
      }

      const { title, event_date } = req.body;
      const result = await eventsService.duplicateEvent(eventId, { title, event_date }, req.user.id);
      
      if (!result.success) {
        if (result.error && (result.error.includes('not found') || result.error.includes('non trouvé'))) {
          return res.status(404).json(ResponseFormatter.notFound('Event'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('Event duplicated', result.data));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventsController();
