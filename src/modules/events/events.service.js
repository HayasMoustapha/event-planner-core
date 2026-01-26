const eventsRepository = require('./events.repository');
const { v4: uuidv4 } = require('uuid');

// Custom error classes for better error handling
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

class EventsService {
  async createEvent(eventData, organizerId) {
    // Validation des données d'entrée
    if (!eventData.title || typeof eventData.title !== 'string' || eventData.title.trim().length < 3) {
      return {
        success: false,
        error: 'Le titre est requis et doit contenir au moins 3 caractères',
        details: {
          field: 'title',
          message: 'Le titre est requis et doit contenir au moins 3 caractères'
        }
      };
    }

    if (!eventData.event_date) {
      return {
        success: false,
        error: 'La date de l\'événement est requise',
        details: {
          field: 'event_date',
          message: 'La date de l\'événement est requise'
        }
      };
    }

    if (!eventData.location || typeof eventData.location !== 'string' || eventData.location.trim().length < 3) {
      return {
        success: false,
        error: 'Le lieu est requis et doit contenir au moins 3 caractères',
        details: {
          field: 'location',
          message: 'Le lieu est requis et doit contenir au moins 3 caractères'
        }
      };
    }

    // Validation de la date
    const eventDate = new Date(eventData.event_date);
    if (isNaN(eventDate.getTime())) {
      return {
        success: false,
        error: 'La date de l\'événement est invalide',
        details: {
          field: 'event_date',
          message: 'La date de l\'événement est invalide'
        }
      };
    }

    if (eventDate <= new Date()) {
      return {
        success: false,
        error: 'La date de l\'événement ne peut pas être dans le passé',
        details: {
          field: 'event_date',
          message: 'La date de l\'événement ne peut pas être dans le passé'
        }
      };
    }

    // Validation de la description si présente
    if (eventData.description && (typeof eventData.description !== 'string' || eventData.description.length > 2000)) {
      return {
        success: false,
        error: 'La description doit être une chaîne de caractères de maximum 2000 caractères',
        details: {
          field: 'description',
          message: 'La description doit être une chaîne de caractères de maximum 2000 caractères'
        }
      };
    }

    // Validation de l'organizer_id
    if (!organizerId || organizerId <= 0) {
      return {
        success: false,
        error: 'ID d\'organisateur invalide',
        details: {
          field: 'organizer_id',
          message: 'L\'ID de l\'organisateur doit être un nombre entier positif'
        }
      };
    }

    const eventDataWithOrganizer = {
      ...eventData,
      organizer_id: organizerId
    };

    try {
      return await eventsRepository.create(eventDataWithOrganizer);
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la création de l\'événement',
        details: error.message
      };
    }
  }

  async getEventById(eventId, userId) {
    const event = await eventsRepository.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Check if user is the organizer or has admin permissions
    if (event.organizer_id !== userId && String(event.organizer_id) !== String(userId)) {
      // TODO: Add admin permission check here
      throw new AuthorizationError('Access denied');
    }

    return event;
  }

  async getEventsByOrganizer(organizerId, options = {}) {
    return await eventsRepository.findByOrganizer(organizerId, options);
  }

  /**
   * Get events with pagination and filters
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.status - Filter by status
   * @param {string} options.search - Search term
   * @param {number} options.userId - User ID (organizer)
   */
  async getEvents(options = {}) {
    const { userId, page, limit, status, search } = options;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const result = await eventsRepository.findByOrganizer(userId, {
      page,
      limit,
      status,
      search
    });

    return {
      events: result.events,
      pagination: result.pagination
    };
  }

  async updateEvent(eventId, updateData, userId) {
    // First check if event exists and user is the organizer
    const existingEvent = await eventsRepository.findById(eventId);
    
    if (!existingEvent) {
      throw new NotFoundError('Event not found');
    }

    if (existingEvent.organizer_id !== userId && String(existingEvent.organizer_id) !== String(userId)) {
      throw new AuthorizationError('Access denied');
    }

    // Validate event date if it's being updated
    if (updateData.event_date && new Date(updateData.event_date) <= new Date()) {
      throw new ValidationError('Event date must be in the future');
    }

    return await eventsRepository.update(eventId, updateData, userId);
  }

  async deleteEvent(eventId, userId) {
    // First check if event exists and user is the organizer
    const existingEvent = await eventsRepository.findById(eventId);
    
    if (!existingEvent) {
      throw new NotFoundError('Event not found');
    }

    if (existingEvent.organizer_id !== userId && String(existingEvent.organizer_id) !== String(userId)) {
      throw new AuthorizationError('Access denied');
    }

    // Don't allow deletion of published events
    if (existingEvent.status === 'published') {
      throw new ConflictError('Cannot delete published events. Archive them instead.');
    }

    return await eventsRepository.delete(eventId, userId);
  }

  async publishEvent(eventId, userId) {
    const publishedEvent = await eventsRepository.publish(eventId, userId);
    
    if (!publishedEvent) {
      throw new NotFoundError('Event not found or access denied');
    }

    // TODO: Send notifications to guests
    // TODO: Trigger ticket generation if applicable

    return publishedEvent;
  }

  async archiveEvent(eventId, userId) {
    const archivedEvent = await eventsRepository.archive(eventId, userId);
    
    if (!archivedEvent) {
      throw new NotFoundError('Event not found or access denied');
    }

    return archivedEvent;
  }

  async getEventStats(organizerId) {
    return await eventsRepository.getEventStats(organizerId);
  }

  async validateEventAccess(eventId, userId) {
    const event = await eventsRepository.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.organizer_id !== userId && String(event.organizer_id) !== String(userId)) {
      throw new AuthorizationError('Access denied');
    }

    return event;
  }
}

module.exports = new EventsService();