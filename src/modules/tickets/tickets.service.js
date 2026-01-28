const { v4: uuidv4 } = require('uuid');
const ticketsRepository = require('./tickets.repository');
const guestsRepository = require('../guests/guests.repository');

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

  async validateTicket(ticketId, userId) {
    try {
      const ticket = await ticketsRepository.findById(ticketId);
      
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

      const updatedTicket = await ticketsRepository.update(ticketId, {
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: userId
      });

      return {
        success: true,
        data: updatedTicket
      };
    } catch (error) {
      console.error('Error validating ticket:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate ticket'
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
      const jobDataWithId = {
        ...jobData,
        id: uuidv4(),
        user_id: userId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const job = await ticketsRepository.createJob(jobDataWithId);
      
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
