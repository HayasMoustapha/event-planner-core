// ========================================
// IMPORT DES DÉPENDANCES
// ========================================
const eventsRepository = require('./events.repository');
// Plus besoin d'UUID - la base de données utilise des SERIAL IDs automatiques

class EventsService {
  /**
   * ========================================
   * CRÉATION D'UN NOUVEL ÉVÉNEMENT
   * ========================================
   * @param {Object} eventData - Données de l'événement
   * @param {number} organizerId - ID de l'organisateur
   * @returns {Promise<Object>} Résultat de la création
   */
  async createEvent(eventData, organizerId) {
    try {
      // Préparation des données avec valeurs par défaut
      const eventDataWithCreator = {
        ...eventData,
        organizer_id: organizerId,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Création de l'événement via le repository
      const event = await eventsRepository.create(eventDataWithCreator);
      
      return {
        success: true,
        data: event
      };
      
    } catch (error) {
      console.error('❌ Erreur création événement:', error);
      return {
        success: false,
        error: error.message || 'Échec de la création de l\'événement'
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

  /**
   * ========================================
   * MISE À JOUR D'UN ÉVÉNEMENT
   * ========================================
   * @param {number} eventId - ID de l'événement à mettre à jour
   * @param {Object} updateData - Données de mise à jour
   * @param {number} userId - ID de l'utilisateur qui fait la mise à jour
   * @returns {Promise<Object>} Résultat de la mise à jour
   */
  async updateEvent(eventId, updateData, userId) {
    try {
      // Récupération de l'événement existant pour vérification
      const existingEvent = await eventsRepository.findById(eventId);
      
      if (!existingEvent) {
        return {
          success: false,
          error: 'Événement non trouvé'
        };
      }

      // Vérification des permissions (seul l'organisateur peut modifier)
      if (existingEvent.organizer_id !== userId && String(existingEvent.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Accès refusé'
        };
      }

      // Validation de la date de l'événement si elle est mise à jour
      if (updateData.event_date && new Date(updateData.event_date) <= new Date()) {
        return {
          success: false,
          error: 'La date de l\'événement doit être dans le futur'
        };
      }

      // Mise à jour via le repository
      const updatedEvent = await eventsRepository.update(eventId, updateData, userId);

      return {
        success: true,
        data: updatedEvent
      };
      
    } catch (error) {
      console.error('❌ Erreur mise à jour événement:', error);
      return {
        success: false,
        error: error.message || 'Échec de la mise à jour de l\'événement'
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
      // If eventId is provided, verify access to that specific event
      if (eventId) {
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
      }

      // Get organizer-wide stats (repository expects organizerId, not eventId)
      const stats = await eventsRepository.getEventStats(userId);

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

  /**
   * ========================================
   * DUPLICATION D'UN ÉVÉNEMENT
   * ========================================
   * @param {number} eventId - ID de l'événement à dupliquer
   * @param {Object} options - Options de duplication
   * @param {number} userId - ID de l'utilisateur qui duplique
   * @returns {Promise<Object>} Événement dupliqué
   */
  async duplicateEvent(eventId, options, userId) {
    try {
      // Récupération de l'événement original
      const originalEvent = await eventsRepository.findById(eventId);
      
      if (!originalEvent) {
        return {
          success: false,
          error: 'Événement source non trouvé'
        };
      }

      // Vérification des permissions
      if (originalEvent.organizer_id !== userId && String(originalEvent.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Accès refusé'
        };
      }

      // Extraction des options de duplication
      const { title, event_date } = options;
      
      // Préparation des données de l'événement dupliqué
      const duplicatedEventData = {
        title: title || `${originalEvent.title} (Copie)`,
        description: originalEvent.description,
        event_date: event_date || originalEvent.event_date,
        location: originalEvent.location,
        organizer_id: userId,
        status: 'draft'
        // L'ID sera généré automatiquement par la base de données (SERIAL)
      };

      // Création de l'événement dupliqué
      const duplicatedEvent = await eventsRepository.create(duplicatedEventData);

      return {
        success: true,
        data: duplicatedEvent
      };
      
    } catch (error) {
      console.error('❌ Erreur duplication événement:', error);
      return {
        success: false,
        error: error.message || 'Échec de la duplication de l\'événement'
      };
    }
  }
}

module.exports = new EventsService();
