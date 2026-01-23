const ticketsRepository = require('./tickets.repository');
const { v4: uuidv4 } = require('uuid');

class TicketsService {
  async createTicketType(ticketTypeData, userId) {
    try {
      // Validate ticket type
      const validTypes = ['free', 'paid', 'donation'];
      if (!validTypes.includes(ticketTypeData.type)) {
        return {
          success: false,
          error: 'Invalid ticket type. Must be free, paid, or donation'
        };
      }

      // Validate availability dates
      if (ticketTypeData.available_from && ticketTypeData.available_to) {
        if (new Date(ticketTypeData.available_from) >= new Date(ticketTypeData.available_to)) {
          return {
            success: false,
            error: 'Available from date must be before available to date'
          };
        }
      }

      const ticketTypeDataWithCreator = {
        ...ticketTypeData,
        created_by: userId
      };

      const ticketType = await ticketsRepository.createTicketType(ticketTypeDataWithCreator);
      
      return {
        success: true,
        data: ticketType,
        message: 'Ticket type created successfully'
      };
    } catch (error) {
      console.error('Error creating ticket type:', error);
      return {
        success: false,
        error: error.message || 'Failed to create ticket type'
      };
    }
  }

  async getTicketTypeById(ticketTypeId) {
    try {
      const ticketType = await ticketsRepository.findTicketTypeById(ticketTypeId);
      
      if (!ticketType) {
        return {
          success: false,
          error: 'Ticket type not found'
        };
      }

      return {
        success: true,
        data: ticketType
      };
    } catch (error) {
      console.error('Error getting ticket type:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket type'
      };
    }
  }

  async getTicketTypesByEvent(eventId, options = {}) {
    try {
      const result = await ticketsRepository.getTicketTypesByEvent(eventId, options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting ticket types:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket types'
      };
    }
  }

  async updateTicketType(ticketTypeId, updateData, userId) {
    try {
      // First check if ticket type exists
      const existingTicketType = await ticketsRepository.findTicketTypeById(ticketTypeId);
      
      if (!existingTicketType) {
        return {
          success: false,
          error: 'Ticket type not found'
        };
      }

      // Validate ticket type if being updated
      if (updateData.type) {
        const validTypes = ['free', 'paid', 'donation'];
        if (!validTypes.includes(updateData.type)) {
          return {
            success: false,
            error: 'Invalid ticket type. Must be free, paid, or donation'
          };
        }
      }

      const updatedTicketType = await ticketsRepository.updateTicketType(ticketTypeId, updateData, userId);
      
      return {
        success: true,
        data: updatedTicketType,
        message: 'Ticket type updated successfully'
      };
    } catch (error) {
      console.error('Error updating ticket type:', error);
      return {
        success: false,
        error: error.message || 'Failed to update ticket type'
      };
    }
  }

  async deleteTicketType(ticketTypeId) {
    try {
      const existingTicketType = await ticketsRepository.findTicketTypeById(ticketTypeId);
      
      if (!existingTicketType) {
        return {
          success: false,
          error: 'Ticket type not found'
        };
      }

      const deletedTicketType = await ticketsRepository.deleteTicketType(ticketTypeId);
      
      return {
        success: true,
        data: deletedTicketType,
        message: 'Ticket type deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting ticket type:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete ticket type'
      };
    }
  }

  async generateTicket(eventGuestId, ticketTypeId, userId) {
    try {
      // Generate unique ticket code
      const ticketCode = await ticketsRepository.generateTicketCode();
      
      // TODO: Generate QR code data (integrate with ticket-generator service)
      const qrCodeData = `TICKET:${ticketCode}:${Date.now()}`;
      
      const ticketData = {
        ticket_code: ticketCode,
        qr_code_data: qrCodeData,
        ticket_type_id: ticketTypeId,
        event_guest_id: eventGuestId,
        price: 0, // Will be set based on ticket type
        currency: 'EUR',
        created_by: userId
      };

      const ticket = await ticketsRepository.createTicket(ticketData);
      
      // TODO: Send ticket notification
      
      return {
        success: true,
        data: ticket,
        message: 'Ticket generated successfully'
      };
    } catch (error) {
      console.error('Error generating ticket:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate ticket'
      };
    }
  }

  async getTicketById(ticketId) {
    try {
      const ticket = await ticketsRepository.findTicketById(ticketId);
      
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
      console.error('Error getting ticket:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket'
      };
    }
  }

  async getTicketByCode(ticketCode) {
    try {
      const ticket = await ticketsRepository.findTicketByCode(ticketCode);
      
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
        error: error.message || 'Failed to get ticket'
      };
    }
  }

  async getTicketsByEvent(eventId, options = {}) {
    try {
      const result = await ticketsRepository.getTicketsByEvent(eventId, options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting tickets:', error);
      return {
        success: false,
        error: error.message || 'Failed to get tickets'
      };
    }
  }

  async validateTicket(ticketId) {
    try {
      const ticket = await ticketsRepository.findTicketById(ticketId);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      if (ticket.is_validated) {
        return {
          success: false,
          error: 'Ticket already validated'
        };
      }

      const validatedTicket = await ticketsRepository.validateTicket(ticketId);
      
      // TODO: Send validation notification
      // TODO: Update scan-validation service
      
      return {
        success: true,
        data: validatedTicket,
        message: 'Ticket validated successfully'
      };
    } catch (error) {
      console.error('Error validating ticket:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate ticket'
      };
    }
  }

  async validateTicketByCode(ticketCode) {
    try {
      const ticket = await ticketsRepository.findTicketByCode(ticketCode);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      if (ticket.is_validated) {
        return {
          success: false,
          error: 'Ticket already validated'
        };
      }

      const validatedTicket = await ticketsRepository.validateTicketByCode(ticketCode);
      
      // TODO: Send validation notification
      // TODO: Update scan-validation service
      
      return {
        success: true,
        data: validatedTicket,
        message: 'Ticket validated successfully'
      };
    } catch (error) {
      console.error('Error validating ticket by code:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate ticket'
      };
    }
  }

  async getTicketStats(eventId) {
    try {
      const stats = await ticketsRepository.getTicketStats(eventId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting ticket stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket statistics'
      };
    }
  }

  async bulkGenerateTickets(eventGuestIds, ticketTypeId, userId) {
    try {
      const results = [];
      
      for (const eventGuestId of eventGuestIds) {
        const result = await this.generateTicket(eventGuestId, ticketTypeId, userId);
        results.push({
          event_guest_id: eventGuestId,
          success: result.success,
          ticket: result.data || null,
          error: result.error || null
        });
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      return {
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            success: successCount,
            failures: failureCount
          }
        },
        message: `Generated ${successCount} tickets out of ${results.length} requests`
      };
    } catch (error) {
      console.error('Error bulk generating tickets:', error);
      return {
        success: false,
        error: error.message || 'Failed to bulk generate tickets'
      };
    }
  }
}

module.exports = new TicketsService();
