const { v4: uuidv4 } = require('uuid');
const ticketsRepository = require('./tickets.repository');
const guestsRepository = require('../guests/guests.repository');
const scanValidationClient = require('../../../../shared/clients/scan-validation-client'); // Client pour communiquer avec le service de validation

class TicketsService {
  async createTicketType(ticketTypeData, userId) {
    try {
      const validTypes = ['free', 'paid', 'donation'];
      if (!validTypes.includes(ticketTypeData.type)) {
        return {
          success: false,
          error: 'Invalid ticket type. Must be free, paid, or donation'
        };
      }

      const ticketTypeDataWithCreator = {
        ...ticketTypeData,
        id: uuidv4(),
        organizer_id: userId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const ticketType = await ticketsRepository.createTicketType(ticketTypeDataWithCreator);
      
      return {
        success: true,
        data: ticketType
      };
    } catch (error) {
      console.error('Error creating ticket type:', error);
      return {
        success: false,
        error: error.message || 'Failed to create ticket type'
      };
    }
  }

  async getTicketTypeById(ticketTypeId, userId) {
    try {
      const ticketType = await ticketsRepository.getTicketTypeById(ticketTypeId);
      
      if (!ticketType) {
        return {
          success: false,
          error: 'Ticket type not found'
        };
      }

      // Check if user is the organizer
      if (ticketType.organizer_id !== userId && String(ticketType.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      return {
        success: true,
        data: ticketType
      };
    } catch (error) {
      console.error('Error getting ticket type by ID:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket type'
      };
    }
  }

  async updateTicketType(ticketTypeId, updateData, userId) {
    try {
      const existingTicketType = await ticketsRepository.getTicketTypeById(ticketTypeId);
      
      if (!existingTicketType) {
        return {
          success: false,
          error: 'Ticket type not found'
        };
      }

      // Check if user is the organizer
      if (existingTicketType.organizer_id !== userId && String(existingTicketType.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      const updatedTicketType = await ticketsRepository.updateTicketType(ticketTypeId, {
        ...updateData,
        updated_by: userId,
        updated_at: new Date().toISOString()
      });

      return {
        success: true,
        data: updatedTicketType
      };
    } catch (error) {
      console.error('Error updating ticket type:', error);
      return {
        success: false,
        error: error.message || 'Failed to update ticket type'
      };
    }
  }

  async deleteTicketType(ticketTypeId, userId) {
    try {
      const existingTicketType = await ticketsRepository.getTicketTypeById(ticketTypeId);
      
      if (!existingTicketType) {
        return {
          success: false,
          error: 'Ticket type not found'
        };
      }

      // Check if user is the organizer
      if (existingTicketType.organizer_id !== userId && String(existingTicketType.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Check if tickets have been sold for this type
      if (existingTicketType.tickets_sold > 0) {
        return {
          success: false,
          error: 'Cannot delete ticket type with sold tickets'
        };
      }

      await ticketsRepository.deleteTicketType(ticketTypeId);

      return {
        success: true,
        data: { id: ticketTypeId, deleted: true }
      };
    } catch (error) {
      console.error('Error deleting ticket type:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete ticket type'
      };
    }
  }

  async createTicket(ticketData, userId) {
    try {
      // Récupérer la liaison event_guests
      const eventGuest = await guestsRepository.findEventGuest(ticketData.event_guest_id, 1); // eventId à récupérer du contexte
      
      if (!eventGuest) {
        return {
          success: false,
          error: 'Guest is not linked to this event'
        };
      }

      const ticketDataWithId = {
        ...ticketData,
        event_guest_id: eventGuest.id, // Utiliser l'ID de la liaison event_guests
        created_by: userId,
        updated_by: userId
      };

      const ticket = await ticketsRepository.createTicket(ticketDataWithId);
      
      return {
        success: true,
        data: ticket
      };
    } catch (error) {
      console.error('Error creating ticket:', error);
      return {
        success: false,
        error: error.message || 'Failed to create ticket'
      };
    }
  }

  async processJob(jobId, userId) {
    try {
      // Appeler le service ticket-generator pour traiter le job
      const response = await fetch(`http://localhost:3003/api/jobs/${jobId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TICKET_GENERATOR_TOKEN || 'default-token'}`
        },
        body: JSON.stringify({
          user_id: userId,
          service: 'event-planner-core'
        })
      });

      if (!response.ok) {
        throw new Error(`Ticket generator service error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error processing job:', error);
      return {
        success: false,
        error: error.message || 'Failed to process job'
      };
    }
  }

  async getTickets(options = {}) {
    try {
      const { page, limit, status, event_id, userId } = options;
      const tickets = await ticketsRepository.getTickets({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        event_id,
        user_id: userId
      });
      
      return {
        success: true,
        data: tickets,
        pagination: tickets.pagination
      };
    } catch (error) {
      console.error('Error getting tickets:', error);
      return {
        success: false,
        error: error.message || 'Failed to get tickets'
      };
    }
  }

  async getTicketByCode(ticketCode, userId) {
    try {
      const ticket = await ticketsRepository.findByCode(ticketCode);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      return {
        success: true,
        data: ticket
      };
    } catch (error) {
      console.error('Error getting ticket by code:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket by code'
      };
    }
  }

  async getEventTickets(eventId, options = {}) {
    try {
      const { page, limit, status, userId } = options;
      const tickets = await ticketsRepository.findByEventId(eventId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        userId
      });
      
      return {
        success: true,
        data: tickets,
        pagination: tickets.pagination
      };
    } catch (error) {
      console.error('Error getting event tickets:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event tickets'
      };
    }
  }

  async getTicketTypesByEvent(eventId, options = {}) {
    try {
      const { page, limit, userId } = options;
      const ticketTypes = await ticketsRepository.findTicketTypesByEventId(eventId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        userId
      });
      
      return {
        success: true,
        data: ticketTypes,
        pagination: ticketTypes.pagination
      };
    } catch (error) {
      console.error('Error getting event ticket types:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event ticket types'
      };
    }
  }

  async validateTicket(ticketId, userId, scanContext = {}) {
    try {
      // ÉTAPE 1 : Récupérer le ticket depuis la base de données
      const ticket = await ticketsRepository.findById(ticketId);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      // ÉTAPE 2 : Vérifier que l'utilisateur a le droit de valider ce ticket
      if (ticket.user_id !== userId && !ticket.is_admin) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // ÉTAPE 3 : Préparer le contexte de scan avec valeurs par défaut
      const defaultScanContext = {
        location: scanContext.location || 'default',
        deviceId: scanContext.deviceId || `device_${userId}`,
        timestamp: scanContext.timestamp || new Date().toISOString(),
        operatorId: scanContext.operatorId || userId,
        checkpointId: scanContext.checkpointId || 'main'
      };

      // ÉTAPE 4 : Appeler le service de validation externe
      console.log(`Validation du ticket ${ticketId} via Scan Validation Service`);
      const validationResult = await scanValidationClient.validateTicket(ticket, defaultScanContext);

      // ÉTAPE 5 : Traiter le résultat de la validation
      if (!validationResult.success) {
        // La validation a échoué côté service de validation
        return {
          success: false,
          error: validationResult.error || 'Validation service error',
          code: validationResult.code,
          details: validationResult.details
        };
      }

      // ÉTAPE 6 : Si la validation est réussie, mettre à jour le ticket
      if (validationResult.valid) {
        const updateData = {
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: userId,
          validation_metadata: {
            service: 'scan-validation-service',
            timestamp: validationResult.validation.timestamp,
            fraudFlags: validationResult.validation.fraudFlags || [],
            restrictions: validationResult.validation.restrictions || []
          }
        };

        const updatedTicket = await ticketsRepository.update(ticketId, updateData);

        return {
          success: true,
          data: {
            ...updatedTicket,
            validation: validationResult.validation
          },
          message: 'Ticket validé avec succès'
        };
      } else {
        // Le ticket n'est pas valide selon le service de validation
        return {
          success: false,
          valid: false,
          error: 'Ticket invalide',
          details: validationResult.validation,
          fraudFlags: validationResult.validation.fraudFlags || []
        };
      }

    } catch (error) {
      console.error('Error validating ticket:', error);
      
      // En cas d'erreur de communication avec le service de validation,
      // on peut essayer une validation locale en fallback
      if (error.code === 'VALIDATION_COMMUNICATION_ERROR' || error.code === 'VALIDATION_TIMEOUT') {
        console.log('Fallback vers validation locale pour le ticket', ticketId);
        return this.validateTicketLocally(ticketId, userId, scanContext);
      }

      return {
        success: false,
        error: error.message || 'Failed to validate ticket'
      };
    }
  }

  /**
   * Validation locale en fallback si le service externe est indisponible
   * @param {string} ticketId - ID du ticket
   * @param {string} userId - ID de l'utilisateur qui valide
   * @param {Object} scanContext - Contexte du scan
   * @returns {Object} - Résultat de la validation locale
   */
  async validateTicketLocally(ticketId, userId, scanContext = {}) {
    try {
      console.log(`Validation locale du ticket ${ticketId} (fallback)`);

      const ticket = await ticketsRepository.findById(ticketId);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      // Validation locale simplifiée
      if (ticket.status === 'used' || ticket.status === 'cancelled') {
        return {
          success: false,
          error: `Ticket already ${ticket.status}`
        };
      }

      // Mettre à jour le ticket localement
      const updatedTicket = await ticketsRepository.update(ticketId, {
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: userId,
        validation_metadata: {
          service: 'local-fallback',
          reason: 'scan-validation-service-unavailable',
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        data: updatedTicket,
        warning: 'Validated locally - scan validation service unavailable'
      };

    } catch (error) {
      console.error('Error in local ticket validation:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate ticket locally'
      };
    }
  }

  async validateTicketByCode(ticketCode, userId) {
    try {
      const ticket = await ticketsRepository.findByCode(ticketCode);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      // Check if user owns the ticket or has admin permissions
      if (ticket.user_id !== userId && !ticket.is_admin) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      const validationResult = {
        ticket_id: ticket.id,
        qr_code: ticket.qr_code,
        status: 'validated',
        validated_at: new Date().toISOString(),
        scanner: userId
      };

      const updatedTicket = await ticketsRepository.update(ticket.id, {
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: userId
      });

      return {
        success: true,
        data: updatedTicket
      };
    } catch (error) {
      console.error('Error validating ticket by code:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate ticket by code'
      };
    }
  }

  async bulkGenerateTickets(bulkData, userId) {
    try {
      const { event_id, ticket_type_id, quantity } = bulkData;
      
      // Créer des invités fictifs pour les tickets
      const guestsData = [];
      for (let i = 0; i < quantity; i++) {
        guestsData.push({
          first_name: `Guest`,
          last_name: `${i + 1}`,
          email: `guest${i + 1}@bulk.generated`,
          phone: `+336000000${i.toString().padStart(3, '0')}`
        });
      }

      // Créer les invités et les lier à l'événement
      const createdGuests = await guestsRepository.bulkCreate(guestsData.map(guest => ({
        ...guest,
        created_by: userId,
        updated_by: userId
      })));

      const eventGuestsData = createdGuests.map(guest => ({
        guest_id: guest.id,
        event_id: event_id,
        created_by: userId,
        updated_by: userId
      }));
      
      await guestsRepository.bulkCreateEventGuests(eventGuestsData);

      // Créer les tickets avec les event_guest_id
      const tickets = [];
      for (let i = 0; i < createdGuests.length; i++) {
        const guest = createdGuests[i];
        const eventGuest = await guestsRepository.findEventGuest(guest.id, event_id);
        
        const ticketData = {
          ticket_code: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          qr_code_data: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ticket_type_id,
          event_guest_id: eventGuest.id,
          price: 0, // Prix par défaut pour les tickets bulk
          currency: 'EUR',
          created_by: userId,
          updated_by: userId
        };
        tickets.push(ticketData);
      }

      const createdTickets = await ticketsRepository.bulkCreate(tickets);
      
      return {
        success: true,
        data: createdTickets
      };
    } catch (error) {
      console.error('Error bulk generating tickets:', error);
      return {
        success: false,
        error: error.message || 'Failed to bulk generate tickets'
      };
    }
  }

  async createJob(jobData, userId) {
    try {
      // Appeler le service ticket-generator pour créer le job
      const response = await fetch('http://localhost:3003/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TICKET_GENERATOR_TOKEN || 'default-token'}`
        },
        body: JSON.stringify({
          ...jobData,
          user_id: userId,
          service: 'event-planner-core'
        })
      });

      if (!response.ok) {
        throw new Error(`Ticket generator service error: ${response.status}`);
      }

      const job = await response.json();
      
      return {
        success: true,
        data: job
      };
    } catch (error) {
      console.error('Error creating job:', error);
      return {
        success: false,
        error: error.message || 'Failed to create job'
      };
    }
  }

  async processJob(jobId, userId) {
    try {
      const job = await ticketsRepository.getJobById(jobId);
      
      if (!job) {
        return {
          success: false,
          error: 'Job not found'
        };
      }

      // Check if user owns the job
      if (job.user_id !== userId) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      const processedJob = await ticketsRepository.updateJob(jobId, {
        status: 'processing',
        started_at: new Date().toISOString(),
        started_by: userId
      });

      // Simulate job processing (in real implementation, this would be async)
      setTimeout(async () => {
        try {
          await ticketsRepository.updateJob(jobId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: userId
        });
        } catch (error) {
          console.error('Error completing job:', error);
        }
      }, 1000);

      return {
        success: true,
        data: processedJob
      };
    } catch (error) {
      console.error('Error processing job:', error);
      return {
        success: false,
        error: error.message || 'Failed to process job'
      };
    }
  }

  async getEventTicketStats(eventId, userId) {
    try {
      const stats = await ticketsRepository.getEventStats(eventId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting event ticket statistics:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event ticket statistics'
      };
    }
  }
}

module.exports = new TicketsService();
