const ticketsService = require('./tickets.service');
const { ResponseFormatter } = require('../../../../shared');

class TicketsController {
  async createTicketType(req, res, next) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await ticketsService.createTicketType(req.body, userId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          return res.status(404).json(ResponseFormatter.notFound('Event'));
        }
        if (result.error && result.error.includes('already exists')) {
          return res.status(409).json(ResponseFormatter.conflict(result.error));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('Ticket type created', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getTicketTypeById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(ResponseFormatter.error('Invalid ticket type ID provided', null, 'VALIDATION_ERROR'));
      }

      const ticketTypeId = parseInt(id);
      const result = await ticketsService.getTicketTypeById(ticketTypeId, userId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          return res.status(404).json(ResponseFormatter.notFound('Ticket type'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Ticket type retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async updateTicketType(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(ResponseFormatter.error('Invalid ticket type ID provided', null, 'VALIDATION_ERROR'));
      }

      const ticketTypeId = parseInt(id);
      const result = await ticketsService.updateTicketType(ticketTypeId, req.body, userId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          return res.status(404).json(ResponseFormatter.notFound('Ticket type'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Ticket type updated', result.data));
    } catch (error) {
      next(error);
    }
  }

  async deleteTicketType(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(ResponseFormatter.error('Invalid ticket type ID provided', null, 'VALIDATION_ERROR'));
      }

      const ticketTypeId = parseInt(id);
      const result = await ticketsService.deleteTicketType(ticketTypeId, userId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          return res.status(404).json(ResponseFormatter.notFound('Ticket type'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Ticket type deleted', result.data));
    } catch (error) {
      next(error);
    }
  }

  async createTicket(req, res, next) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await ticketsService.createTicket(req.body, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('Ticket created', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getTickets(req, res, next) {
    try {
      const { page, limit, status, event_id } = req.query;
      const userId = req.user?.id;
      
      const result = await ticketsService.getTickets({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        event_id,
        userId
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Tickets retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getTicketByCode(req, res, next) {
    try {
      const { ticketCode } = req.params;
      const userId = req.user?.id;
      
      const result = await ticketsService.getTicketByCode(ticketCode, userId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          return res.status(404).json(ResponseFormatter.notFound('Ticket'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Ticket retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEventTickets(req, res, next) {
    try {
      const { eventId } = req.params;
      const { page, limit, status } = req.query;
      const userId = req.user?.id;
      
      const result = await ticketsService.getEventTickets(eventId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        userId
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Event tickets retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async validateTicket(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await ticketsService.validateTicket(id, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Ticket validated', result.data));
    } catch (error) {
      next(error);
    }
  }

  async validateTicketByCode(req, res, next) {
    try {
      const { ticketCode } = req.body;
      const userId = req.user?.id;
      
      const result = await ticketsService.validateTicketByCode(ticketCode, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Ticket validated by code', result.data));
    } catch (error) {
      next(error);
    }
  }

  async bulkGenerateTickets(req, res, next) {
    try {
      const { event_id, ticket_type_id, quantity } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await ticketsService.bulkGenerateTickets({
        event_id,
        ticket_type_id,
        quantity
      }, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Tickets bulk generated', result.data));
    } catch (error) {
      next(error);
    }
  }

  async createJob(req, res, next) {
    try {
      const { job_type, parameters } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await ticketsService.createJob({
        job_type,
        parameters
      }, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('Job created', result.data));
    } catch (error) {
      next(error);
    }
  }

  async processJob(req, res, next) {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;
      
      const result = await ticketsService.processJob(jobId, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Job processed', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEventTicketStats(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user?.id;
      
      const result = await ticketsService.getEventTicketStats(eventId, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Event ticket statistics retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TicketsController();
