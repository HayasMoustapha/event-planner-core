const ticketsService = require('./tickets.service');

class TicketsController {
  async createTicketType(req, res) {
    try {
      const result = await ticketsService.createTicketType(req.body, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTicketType(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketsService.getTicketTypeById(parseInt(id));
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTicketTypesByEvent(req, res) {
    try {
      const { eventId } = req.params;
      const { page, limit, type } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        type
      };

      const result = await ticketsService.getTicketTypesByEvent(parseInt(eventId), options);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async updateTicketType(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketsService.updateTicketType(parseInt(id), req.body, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async deleteTicketType(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketsService.deleteTicketType(parseInt(id));
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async generateTicket(req, res) {
    try {
      const { event_guest_id, ticket_type_id } = req.body;
      
      const result = await ticketsService.generateTicket(event_guest_id, ticket_type_id, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTicket(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketsService.getTicketById(parseInt(id));
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTicketByCode(req, res) {
    try {
      const { ticketCode } = req.params;
      
      const result = await ticketsService.getTicketByCode(ticketCode);
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTickets(req, res) {
    try {
      const { page, limit, status, ticket_type_id, event_id } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        ticket_type_id: ticket_type_id ? parseInt(ticket_type_id) : undefined,
        event_id: event_id ? parseInt(event_id) : undefined
      };

      const result = await ticketsService.getTickets(options);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTicketsByEvent(req, res) {
    try {
      const { eventId } = req.params;
      const { page, limit, status, ticket_type_id } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        ticket_type_id: ticket_type_id ? parseInt(ticket_type_id) : undefined
      };

      const result = await ticketsService.getTicketsByEvent(parseInt(eventId), options);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async validateTicket(req, res) {
    try {
      const { id } = req.params;
      
      const result = await ticketsService.validateTicket(parseInt(id));
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async validateTicketByCode(req, res) {
    try {
      const { ticket_code } = req.body;
      
      const result = await ticketsService.validateTicketByCode(ticket_code);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTicketStats(req, res) {
    try {
      const { eventId } = req.params;
      
      const result = await ticketsService.getTicketStats(parseInt(eventId));
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async bulkGenerateTickets(req, res) {
    try {
      const { event_guest_ids, ticket_type_id } = req.body;
      
      if (!Array.isArray(event_guest_ids) || event_guest_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Event guest IDs array is required and cannot be empty'
        });
      }

      const result = await ticketsService.bulkGenerateTickets(event_guest_ids, ticket_type_id, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new TicketsController();
