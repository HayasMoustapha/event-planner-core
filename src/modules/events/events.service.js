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
    console.log('🧪 [TEST LOG] EventsService.createEvent - ENTRY');
    console.log('🧪 [TEST LOG] EventsService.createEvent - eventData:', eventData);
    console.log('🧪 [TEST LOG] EventsService.createEvent - organizerId:', organizerId);
    
    // Validation des données d'entrée
    if (!eventData.title || typeof eventData.title !== 'string' || eventData.title.trim().length < 3) {
      console.log('🧪 [TEST LOG] EventsService.createEvent - VALIDATION ERROR: Title');
      return {
        success: false,
        error: 'Le titre est requis et doit contenir au moins 3 caractères',
        details: {
          field: 'title',
          message: 'Le titre est requis et doit contenir au moins 3 caractères'
        }
      };
    }

    console.log('🧪 [TEST LOG] EventsService.createEvent - Title validation passed');

    if (!eventData.event_date) {
      console.log('🧪 [TEST LOG] EventsService.createEvent - VALIDATION ERROR: Missing event_date');
      return {
        success: false,
        error: 'La date de l\'événement est requise',
        details: {
          field: 'event_date',
          message: 'La date de l\'événement est requise'
        }
      };
    }

    console.log('🧪 [TEST LOG] EventsService.createEvent - Event date validation passed');

    if (!eventData.location || typeof eventData.location !== 'string' || eventData.location.trim().length < 3) {
      console.log('🧪 [TEST LOG] EventsService.createEvent - VALIDATION ERROR: Location');
      return {
        success: false,
        error: 'Le lieu est requis et doit contenir au moins 3 caractères',
        details: {
          field: 'location',
          message: 'Le lieu est requis et doit contenir au moins 3 caractères'
        }
      };
    }

    console.log('🧪 [TEST LOG] EventsService.createEvent - Location validation passed');

    // Validation de la date
    const eventDate = new Date(eventData.event_date);
    if (isNaN(eventDate.getTime())) {
      console.log('🧪 [TEST LOG] EventsService.createEvent - VALIDATION ERROR: Invalid date format');
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
      console.log('🧪 [TEST LOG] EventsService.createEvent - VALIDATION ERROR: Date in past');
      return {
        success: false,
        error: 'La date de l\'événement ne peut pas être dans le passé',
        details: {
          field: 'event_date',
          message: 'La date de l\'événement ne peut pas être dans le passé'
        }
      };
    }

    console.log('🧪 [TEST LOG] EventsService.createEvent - Date validation passed');

    console.log('🧪 [TEST LOG] EventsService.createEvent - Description validation passed');

    // Validation de l'organizer_id
    if (!organizerId || organizerId <= 0) {
      console.log('🧪 [TEST LOG] EventsService.createEvent - VALIDATION ERROR: Invalid organizerId');
      return {
        success: false,
        error: 'ID d\'organisateur invalide',
        details: {
          field: 'organizer_id',
          message: 'L\'ID de l\'organisateur doit être un nombre entier positif'
        }
      };
    }

    console.log('🧪 [TEST LOG] EventsService.createEvent - Organizer ID validation passed');

    const eventDataWithOrganizer = {
      ...eventData,
      organizer_id: organizerId
    };

    console.log('🧪 [TEST LOG] EventsService.createEvent - Prepared data for repository:', eventDataWithOrganizer);

    try {
      console.log('🧪 [TEST LOG] EventsService.createEvent - Calling repository.create...');
      const result = await eventsRepository.create(eventDataWithOrganizer);
      console.log('🧪 [TEST LOG] EventsService.createEvent - Repository result:', result);
      return result;
    } catch (error) {
      console.log('🧪 [TEST LOG] EventsService.createEvent - REPOSITORY ERROR:', error.message);
      console.log('🧪 [TEST LOG] EventsService.createEvent - REPOSITORY ERROR STACK:', error.stack);
      return {
        success: false,
        error: 'Erreur lors de la création de l\'événement',
        details: error.message
      };
    }
  }

  async getEventById(eventId, userId) {
    console.log('🧪 [TEST LOG] EventsService.getEventById - ENTRY');
    console.log('🧪 [TEST LOG] EventsService.getEventById - eventId:', eventId);
    console.log('🧪 [TEST LOG] EventsService.getEventById - userId:', userId);
    
    console.log('🧪 [TEST LOG] EventsService.getEventById - Calling repository.findById...');
    const event = await eventsRepository.findById(eventId);
    console.log('🧪 [TEST LOG] EventsService.getEventById - Repository result:', event);
    
    if (!event) {
      console.log('🧪 [TEST LOG] EventsService.getEventById - ERROR: Event not found');
      throw new NotFoundError('Event not found');
    }

    console.log('🧪 [TEST LOG] EventsService.getEventById - Checking permissions...');
    console.log('🧪 [TEST LOG] EventsService.getEventById - Event organizer:', event.organizer_id);
    console.log('🧪 [TEST LOG] EventsService.getEventById - Requesting user:', userId);

    // Check if user is the organizer or has admin permissions
    if (event.organizer_id !== userId && String(event.organizer_id) !== String(userId)) {
      console.log('🧪 [TEST LOG] EventsService.getEventById - ERROR: Access denied');
      // TODO: Add admin permission check here
      throw new AuthorizationError('Access denied');
    }

    console.log('🧪 [TEST LOG] EventsService.getEventById - SUCCESS - Access granted');
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
    console.log('🧪 [TEST LOG] EventsService.getEvents - ENTRY');
    console.log('🧪 [TEST LOG] EventsService.getEvents - Options:', options);
    
    const { userId, page, limit, status, search } = options;

    if (!userId) {
      console.log('🧪 [TEST LOG] EventsService.getEvents - ERROR: Missing userId');
      throw new ValidationError('User ID is required');
    }

    console.log('🧪 [TEST LOG] EventsService.getEvents - Calling eventsRepository.findByOrganizer...');
    const result = await eventsRepository.findByOrganizer(userId, {
      page,
      limit,
      status,
      search
    });
    console.log('🧪 [TEST LOG] EventsService.getEvents - Repository result:', result);

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