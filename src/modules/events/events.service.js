// ========================================
// IMPORT DES DÉPENDANCES
// ========================================
const eventsRepository = require('./events.repository');
const notificationClient = require('../../../../shared/clients/notification-client');
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

  /**
   * Envoie une notification d'annulation d'événement à tous les participants
   * @param {number} eventId - ID de l'événement
   * @param {string} reason - Raison de l'annulation
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendEventCancellationNotification(eventId, reason) {
    try {
      // Récupérer les informations de l'événement
      const event = await eventsRepository.findById(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Événement non trouvé'
        };
      }

      // Récupérer tous les participants à l'événement
      const guestsRepository = require('../guests/guests.repository');
      const participants = await guestsRepository.getEventParticipants(eventId);

      if (participants.length === 0) {
        return {
          success: true,
          message: 'Aucun participant à notifier'
        };
      }

      // Préparer les données pour la notification
      const eventData = {
        title: event.title,
        event_date: event.event_date,
        cancellation_reason: reason,
        refund_info: 'Contactez le support pour plus d\'informations',
        organizer_name: event.organizer_name || 'L\'équipe Event Planner'
      };

      // Envoyer la notification en lot
      const recipients = participants.map(p => ({
        to: p.email,
        data: {
          firstName: p.first_name,
          lastName: p.last_name
        }
      }));

      const result = await notificationClient.sendBulkEmail(
        recipients,
        'event-cancelled',
        `Important : L'événement "${event.title}" a été annulé`,
        eventData,
        'high'
      );

      if (!result.success) {
        console.error('Failed to send event cancellation notification:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending event cancellation notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie un rappel d'événement 24h avant
   * @param {number} eventId - ID de l'événement
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendEventReminderNotification(eventId) {
    try {
      // Récupérer les informations de l'événement
      const event = await eventsRepository.findById(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Événement non trouvé'
        };
      }

      // Récupérer tous les participants à l'événement
      const guestsRepository = require('../guests/guests.repository');
      const participants = await guestsRepository.getEventParticipants(eventId);

      if (participants.length === 0) {
        return {
          success: true,
          message: 'Aucun participant à notifier'
        };
      }

      // Préparer les données pour la notification
      const eventData = {
        eventName: event.title,
        eventDate: new Date(event.event_date).toLocaleDateString('fr-FR'),
        eventTime: new Date(event.event_date).toLocaleTimeString('fr-FR'),
        eventLocation: event.location,
        organizerName: event.organizer_name
      };

      // Envoyer la notification en lot
      const recipients = participants.map(p => ({
        to: p.email,
        data: {
          firstName: p.first_name,
          lastName: p.last_name,
          ticketCount: p.ticket_count || 1
        }
      }));

      const result = await notificationClient.sendBulkEmail(
        recipients,
        'event-reminder',
        `Rappel : ${event.title} demain !`,
        eventData,
        'normal'
      );

      if (!result.success) {
        console.error('Failed to send event reminder notification:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending event reminder notification:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // MÉTHODES D'INTERACTION AVEC LES ÉVÉNEMENTS
  // ========================================

  async getCalendarFile(eventId, userId) {
    try {
      // Vérifier que l'événement existe et que l'utilisateur y a accès
      const event = await eventsRepository.findById(eventId);
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      // Vérifier les permissions (organisateur ou participant)
      const hasAccess = await this.checkEventAccess(eventId, userId);
      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }

      // Générer le fichier ICS
      const icsContent = this.generateICSFile(event);
      
      return {
        success: true,
        data: icsContent
      };
    } catch (error) {
      console.error('Error generating calendar file:', error);
      return { success: false, error: error.message };
    }
  }

  async respondToEvent(eventId, userId, response, message = null) {
    try {
      // Vérifier que l'événement existe
      const event = await eventsRepository.findById(eventId);
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      // Vérifier que l'utilisateur est invité ou a accès
      const hasAccess = await this.checkEventAccess(eventId, userId);
      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }

      // Enregistrer la réponse dans la table des invitations/réponses
      const invitationsRepository = require('../invitations/invitations.repository');
      const result = await invitationsRepository.recordResponse(eventId, userId, response, message);

      if (!result.success) {
        return result;
      }

      // Notifier l'organisateur si nécessaire
      if (event.organizer_id !== userId) {
        await this.notifyOrganizerOfResponse(event, userId, response);
      }

      return {
        success: true,
        data: {
          eventId,
          userId,
          response,
          message,
          recordedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error recording event response:', error);
      return { success: false, error: error.message };
    }
  }

  // Méthodes utilitaires
  generateICSFile(event) {
    const startDate = new Date(event.event_date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 heures par défaut

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Event Planner//Event//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:event-${event.id}@eventplanner.com
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
  }

  async checkEventAccess(eventId, userId) {
    try {
      // Vérifier si l'utilisateur est l'organisateur
      const event = await eventsRepository.findById(eventId);
      if (event && event.organizer_id === userId) {
        return true;
      }

      // Vérifier si l'utilisateur est un participant invité
      const invitationsRepository = require('../invitations/invitations.repository');
      const invitation = await invitationsRepository.findByEventAndUser(eventId, userId);
      
      return !!invitation;
    } catch (error) {
      console.error('Error checking event access:', error);
      return false;
    }
  }

  async notifyOrganizerOfResponse(event, userId, response) {
    try {
      const usersRepository = require('../../shared/repositories/users.repository');
      const user = await usersRepository.findById(userId);
      
      if (!user) return;

      const notificationClient = require('../../../shared/clients/notification-client');
      
      await notificationClient.sendEmail({
        to: event.organizer_email,
        template: 'event-notification',
        data: {
          organizerName: event.organizer_name,
          eventName: event.title,
          participantName: `${user.first_name} ${user.last_name}`,
          response: response,
          eventDate: new Date(event.event_date).toLocaleDateString('fr-FR'),
          eventUrl: `${process.env.FRONTEND_URL}/events/${event.id}`
        }
      });
    } catch (error) {
      console.error('Error notifying organizer:', error);
    }
  }
}

module.exports = new EventsService();
