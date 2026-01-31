/**
 * Service d'enrichissement des données de tickets
 * Récupère toutes les informations nécessaires pour la génération
 */

const ticketsRepository = require('../modules/tickets/tickets.repository');
const guestsRepository = require('../modules/guests/guests.repository');
const eventsRepository = require('../modules/events/events.repository');

class TicketDataEnrichmentService {
  /**
   * Enrichit les données des tickets avec toutes les informations nécessaires
   * @param {Array} ticketIds - IDs des tickets à enrichir
   * @param {Object} db - Instance de base de données
   * @returns {Promise<Array>} Tickets enrichis
   */
  async enrichTicketData(ticketIds, db) {
    try {
      const enrichedTickets = [];

      for (const ticketId of ticketIds) {
        // Récupérer le ticket avec ses relations
        const ticket = await ticketsRepository.findTicketById(ticketId);
        if (!ticket) {
          console.warn(`Ticket ${ticketId} non trouvé`);
          continue;
        }

        // Récupérer les informations de l'invité
        const guest = await guestsRepository.findById(ticket.guest_id);
        if (!guest) {
          console.warn(`Invité ${ticket.guest_id} non trouvé pour le ticket ${ticketId}`);
          continue;
        }

        // Récupérer le type de ticket
        const ticketType = await ticketsRepository.findTicketTypeById(ticket.ticket_type_id);
        if (!ticketType) {
          console.warn(`Type de ticket ${ticket.ticket_type_id} non trouvé pour le ticket ${ticketId}`);
          continue;
        }

        // Récupérer le template si disponible
        let template = null;
        if (ticket.ticket_template_id) {
          template = await ticketsRepository.findTicketTemplateById(ticket.ticket_template_id);
        }

        // Récupérer l'événement
        const event = await eventsRepository.findById(ticketType.event_id);
        if (!event) {
          console.warn(`Événement ${ticketType.event_id} non trouvé pour le ticket ${ticketId}`);
          continue;
        }

        // Construire l'objet enrichi
        const enrichedTicket = {
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          guest: {
            name: `${guest.first_name} ${guest.last_name}`,
            phone: guest.phone || null,
            email: guest.email
          },
          ticket_type: {
            id: ticketType.id,
            name: ticketType.name
          },
          template: template ? {
            id: template.id,
            preview_url: template.preview_url || null,
            source_files_path: template.source_files_path || '/templates/default/'
          } : {
            id: null,
            preview_url: null,
            source_files_path: '/templates/default/'
          },
          event: {
            id: event.id, // Ajouter l'ID de l'événement
            title: event.title,
            location: event.location || 'Non spécifié',
            date: (event.event_date || event.created_at).toISOString()
          }
        };

        enrichedTickets.push(enrichedTicket);
      }

      return {
        success: true,
        data: enrichedTickets
      };
    } catch (error) {
      console.error('Erreur lors de l\'enrichissement des données:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enrichit les données pour un seul ticket
   * @param {number} ticketId - ID du ticket
   * @param {Object} db - Instance de base de données
   * @returns {Promise<Object>} Ticket enrichi
   */
  async enrichSingleTicket(ticketId, db) {
    const result = await this.enrichTicketData([ticketId], db);
    return result.success && result.data.length > 0 ? result.data[0] : null;
  }

  /**
   * Valide que toutes les données nécessaires sont présentes
   * @param {Array} enrichedTickets - Tickets enrichis
   * @returns {Object} Résultat de la validation
   */
  validateEnrichedData(enrichedTickets) {
    const errors = [];

    for (const ticket of enrichedTickets) {
      if (!ticket.guest.email) {
        errors.push(`Ticket ${ticket.ticket_id}: Email de l'invité manquant`);
      }
      if (!ticket.template.source_files_path) {
        errors.push(`Ticket ${ticket.ticket_id}: Chemin des fichiers template manquant`);
      }
      if (!ticket.event.title) {
        errors.push(`Ticket ${ticket.ticket_id}: Titre de l'événement manquant`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new TicketDataEnrichmentService();
