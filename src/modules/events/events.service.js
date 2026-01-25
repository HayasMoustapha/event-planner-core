const eventsRepository = require('./events.repository');
const { v4: uuidv4 } = require('uuid');

class EventsService {
  async createEvent(eventData, organizerId) {
    try {
      // Validate event date is in the future
      if (new Date(eventData.event_date) <= new Date()) {
        throw new Error('Event date must be in the future');
      }

      const eventDataWithOrganizer = {
        ...eventData,
        organizer_id: organizerId
      };

      const event = await eventsRepository.create(eventDataWithOrganizer);
      
      return {
        success: true,
        data: event,
        message: 'Event created successfully'
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        success: false,
        error: error.message || 'Failed to create event'
      };
    }
  }

  async getEventById(eventId, userId) {
    try {
      const event = await eventsRepository.findById(eventId);
      
      if (!event) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      // Check if user is the organizer or has admin permissions
      if (event.organizer_id !== userId && String(event.organizer_id) !== String(userId)) {
        // TODO: Add admin permission check here
        return {
          success: false,
          error: 'Access denied'
        };
      }

      return {
        success: true,
        data: event
      };
    } catch (error) {
      console.error('Error getting event:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event'
      };
    }
  }

  async getEventsByOrganizer(organizerId, options = {}) {
    try {
      const result = await eventsRepository.findByOrganizer(organizerId, options);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting events:', error);
      return {
        success: false,
        error: error.message || 'Failed to get events'
      };
    }
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
    try {
      const { userId, page, limit, status, search } = options;

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required'
        };
      }

      const result = await eventsRepository.findByOrganizer(userId, {
        page,
        limit,
        status,
        search
      });

      return {
        success: true,
        data: result.events,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error getting events:', error);
      return {
        success: false,
        error: error.message || 'Failed to get events'
      };
    }
  }

  async updateEvent(eventId, updateData, userId) {
    try {
      // First check if event exists and user is the organizer
      const existingEvent = await eventsRepository.findById(eventId);
      
      if (!existingEvent) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      if (existingEvent.organizer_id !== userId && String(existingEvent.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Validate event date if it's being updated
      if (updateData.event_date && new Date(updateData.event_date) <= new Date()) {
        throw new Error('Event date must be in the future');
      }

      const updatedEvent = await eventsRepository.update(eventId, updateData, userId);
      
      return {
        success: true,
        data: updatedEvent,
        message: 'Event updated successfully'
      };
    } catch (error) {
      console.error('Error updating event:', error);
      return {
        success: false,
        error: error.message || 'Failed to update event'
      };
    }
  }

  async deleteEvent(eventId, userId) {
    try {
      // First check if event exists and user is the organizer
      const existingEvent = await eventsRepository.findById(eventId);
      
      if (!existingEvent) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      if (existingEvent.organizer_id !== userId && String(existingEvent.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Don't allow deletion of published events
      if (existingEvent.status === 'published') {
        return {
          success: false,
          error: 'Cannot delete published events. Archive them instead.'
        };
      }

      const deletedEvent = await eventsRepository.delete(eventId);
      
      return {
        success: true,
        data: deletedEvent,
        message: 'Event deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete event'
      };
    }
  }

  async publishEvent(eventId, userId) {
    try {
      const publishedEvent = await eventsRepository.publish(eventId, userId);
      
      if (!publishedEvent) {
        return {
          success: false,
          error: 'Event not found or access denied'
        };
      }

      // TODO: Send notifications to guests
      // TODO: Trigger ticket generation if applicable

      return {
        success: true,
        data: publishedEvent,
        message: 'Event published successfully'
      };
    } catch (error) {
      console.error('Error publishing event:', error);
      return {
        success: false,
        error: error.message || 'Failed to publish event'
      };
    }
  }

  async archiveEvent(eventId, userId) {
    try {
      const archivedEvent = await eventsRepository.archive(eventId, userId);
      
      if (!archivedEvent) {
        return {
          success: false,
          error: 'Event not found or access denied'
        };
      }

      return {
        success: true,
        data: archivedEvent,
        message: 'Event archived successfully'
      };
    } catch (error) {
      console.error('Error archiving event:', error);
      return {
        success: false,
        error: error.message || 'Failed to archive event'
      };
    }
  }

  async getEventStats(organizerId) {
    try {
      const stats = await eventsRepository.getEventStats(organizerId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting event stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event statistics'
      };
    }
  }

  async validateEventAccess(eventId, userId) {
    try {
      const event = await eventsRepository.findById(eventId);
      
      if (!event) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      if (event.organizer_id !== userId && String(event.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      return {
        success: true,
        data: event
      };
    } catch (error) {
      console.error('Error validating event access:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate access'
      };
    }
  }
}

module.exports = new EventsService();