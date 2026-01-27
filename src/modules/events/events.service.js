const eventsRepository = require('./events.repository');
const { v4: uuidv4 } = require('uuid');

class EventsService {
  async createEvent(eventData, organizerId) {
    try {
      const eventDataWithId = {
        ...eventData,
        id: uuidv4(),
        organizer_id: organizerId,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const event = await eventsRepository.create(eventDataWithId);
      
      return {
        success: true,
        data: event
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
      console.error('Error getting event by ID:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event'
      };
    }
  }

  async getEvents(options = {}) {
    try {
      const { page, limit, status, search, userId } = options;
      const events = await eventsRepository.findByOrganizer(userId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        search
      });
      
      return {
        success: true,
        data: events,
        pagination: events.pagination
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
        return {
          success: false,
          error: 'Event date must be in the future'
        };
      }

      const updatedEvent = await eventsRepository.update(eventId, {
        ...updateData,
        updated_at: new Date().toISOString()
      }, userId);

      return {
        success: true,
        data: updatedEvent
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

      const deletedEvent = await eventsRepository.delete(eventId, userId);

      return {
        success: true,
        data: deletedEvent
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

      return {
        success: true,
        data: publishedEvent
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
        data: archivedEvent
      };
    } catch (error) {
      console.error('Error archiving event:', error);
      return {
        success: false,
        error: error.message || 'Failed to archive event'
      };
    }
  }

  async getEventStats(eventId, userId) {
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

      const stats = await eventsRepository.getEventStats(eventId);

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

  async duplicateEvent(eventId, options, userId) {
    try {
      const originalEvent = await eventsRepository.findById(eventId);
      
      if (!originalEvent) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      if (originalEvent.organizer_id !== userId && String(originalEvent.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      const { title, event_date } = options;
      
      const duplicatedEventData = {
        title: title || `${originalEvent.title} (Copy)`,
        description: originalEvent.description,
        event_date: event_date || originalEvent.event_date,
        location: originalEvent.location,
        organizer_id: userId,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const duplicatedEvent = await eventsRepository.create({
        ...duplicatedEventData,
        id: uuidv4()
      });

      return {
        success: true,
        data: duplicatedEvent
      };
    } catch (error) {
      console.error('Error duplicating event:', error);
      return {
        success: false,
        error: error.message || 'Failed to duplicate event'
      };
    }
  }
}

module.exports = new EventsService();
