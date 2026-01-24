const ticketsRepository = require('./tickets.repository');
const { ticketGeneratorClient, scanValidationClient } = require('../../config/clients');
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
      // 1. Generate unique ticket code (LOGIQUE MÉTIER)
      const ticketCode = await ticketsRepository.generateTicketCode();
      
      // 2. Create ticket in database (PERSISTANCE MÉTIER)
      const ticketData = {
        ticket_code: ticketCode,
        qr_code_data: null, // Will be populated by ticket-generator service
        ticket_type_id: ticketTypeId,
        event_guest_id: eventGuestId,
        price: 0, // Will be set based on ticket type
        currency: 'EUR',
        created_by: userId
      };

      const ticket = await ticketsRepository.createTicket(ticketData);
      
      // 3. Call ticket-generator service for QR code generation (APPEL SERVICE TECHNIQUE)
      try {
        // Récupérer l'event_id depuis le ticket créé via une jointure
        const ticketWithEvent = await ticketsRepository.findTicketWithEvent(ticket.id);
        
        const qrResult = await ticketGeneratorClient.generateQRCode({
          ticketCode: ticketCode,
          ticketId: ticket.id,
          eventId: ticketWithEvent?.event_id || null
        });
        
        if (qrResult.success) {
          // Update ticket with QR code data
          await ticketsRepository.updateTicketQRCode(ticket.id, qrResult.qrCodeData);
        }
      } catch (qrError) {
        console.warn('QR code generation failed, continuing without QR:', qrError.message);
        // Continue without QR code - ticket is still valid
      }
      
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
      // 1. Get ticket from database (LOGIQUE MÉTIER)
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

      // 2. Call scan-validation service for technical validation (APPEL SERVICE TECHNIQUE)
      let validationResult = { valid: true, reason: 'No QR code to validate' };
      
      if (ticket.qr_code_data) {
        try {
          validationResult = await scanValidationClient.validateTicket(ticket.qr_code_data, {
            ticketId: ticket.id,
            validationTime: new Date().toISOString()
          });
        } catch (validationError) {
          console.warn('Scan validation service unavailable, proceeding with business validation:', validationError.message);
          // Continue with business validation even if technical validation fails
        }
      }

      // 3. Apply business rules based on technical validation (LOGIQUE MÉTIER)
      if (!validationResult.valid) {
        return {
          success: false,
          error: 'Ticket validation failed',
          reason: validationResult.reason || 'Technical validation failed'
        };
      }

      // 4. Update ticket validation status in database (PERSISTANCE MÉTIER)
      const validatedTicket = await ticketsRepository.validateTicket(ticketId);
      
      return {
        success: true,
        data: validatedTicket,
        message: 'Ticket validated successfully',
        technicalValidation: validationResult
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
      // 1. Get ticket from database (LOGIQUE MÉTIER)
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

      // 2. Call scan-validation service for technical validation (APPEL SERVICE TECHNIQUE)
      let validationResult = { valid: true, reason: 'No QR code to validate' };
      
      if (ticket.qr_code_data) {
        try {
          validationResult = await scanValidationClient.validateTicket(ticket.qr_code_data, {
            ticketId: ticket.id,
            validationTime: new Date().toISOString()
          });
        } catch (validationError) {
          console.warn('Scan validation service unavailable, proceeding with business validation:', validationError.message);
          // Continue with business validation even if technical validation fails
        }
      }

      // 3. Apply business rules based on technical validation (LOGIQUE MÉTIER)
      if (!validationResult.valid) {
        return {
          success: false,
          error: 'Ticket validation failed',
          reason: validationResult.reason || 'Technical validation failed'
        };
      }

      // 4. Update ticket validation status in database (PERSISTANCE MÉTIER)
      const validatedTicket = await ticketsRepository.validateTicketByCode(ticketCode);
      
      return {
        success: true,
        data: validatedTicket,
        message: 'Ticket validated successfully',
        technicalValidation: validationResult
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
