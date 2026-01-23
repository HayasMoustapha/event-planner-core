const ticketsService = require('./tickets.service');
const { 
  ErrorHandler, 
  ValidationError, 
  NotFoundError, 
  AuthorizationError,
  SecurityErrorHandler,
  ConflictError,
  DatabaseError 
} = require('../../utils/errors');

class TicketsController {
  async createTicketType(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Rate limiting check
      if (req.rateLimit && req.rateLimit.remaining === 0) {
        throw SecurityErrorHandler.handleRateLimit(req);
      }

      // Security: Validate event ownership
      const { event_id } = req.body;
      if (!event_id || isNaN(parseInt(event_id))) {
        throw new ValidationError('Valid event ID is required');
      }

      // Security: Validate ticket type data
      const ticketTypeData = req.body;
      
      if (ticketTypeData.type && !['free', 'paid', 'donation'].includes(ticketTypeData.type)) {
        throw new ValidationError('Invalid ticket type');
      }

      if (ticketTypeData.price && (isNaN(parseFloat(ticketTypeData.price)) || parseFloat(ticketTypeData.price) < 0)) {
        throw new ValidationError('Price must be a positive number');
      }

      if (ticketTypeData.quantity && (isNaN(parseInt(ticketTypeData.quantity)) || parseInt(ticketTypeData.quantity) < 0)) {
        throw new ValidationError('Quantity must be a positive integer');
      }

      if (ticketTypeData.currency && !/^[A-Z]{3}$/.test(ticketTypeData.currency)) {
        throw new ValidationError('Currency must be a valid 3-letter code');
      }

      const result = await ticketsService.createTicketType(ticketTypeData, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event');
        }
        if (result.error && result.error.includes('already exists')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getTicketType(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid ticket type ID provided');
      }

      const ticketTypeId = parseInt(id);
      
      // Security: Check for potential SQL injection patterns
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in ticket type ID');
      }

      const result = await ticketsService.getTicketTypeById(ticketTypeId, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Ticket type');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTicketType(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid ticket type ID provided');
      }

      const ticketTypeId = parseInt(id);
      
      // Security: Check ownership before update
      const existingTicketType = await ticketsService.getTicketTypeById(ticketTypeId, req.user.id);
      if (!existingTicketType.success) {
        throw new NotFoundError('Ticket type');
      }

      // Security: Validate update data
      const updateData = req.body;
      
      if (updateData.type && !['free', 'paid', 'donation'].includes(updateData.type)) {
        throw new ValidationError('Invalid ticket type');
      }

      if (updateData.price !== undefined && (isNaN(parseFloat(updateData.price)) || parseFloat(updateData.price) < 0)) {
        throw new ValidationError('Price must be a positive number');
      }

      if (updateData.quantity !== undefined && (isNaN(parseInt(updateData.quantity)) || parseInt(updateData.quantity) < 0)) {
        throw new ValidationError('Quantity must be a positive integer');
      }

      if (updateData.currency && !/^[A-Z]{3}$/.test(updateData.currency)) {
        throw new ValidationError('Currency must be a valid 3-letter code');
      }

      const result = await ticketsService.updateTicketType(ticketTypeId, updateData, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Ticket type');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTicketType(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid ticket type ID provided');
      }

      const ticketTypeId = parseInt(id);
      
      // Security: Check ownership and business rules
      const existingTicketType = await ticketsService.getTicketTypeById(ticketTypeId, req.user.id);
      if (!existingTicketType.success) {
        throw new NotFoundError('Ticket type');
      }

      // Security: Check if tickets have been sold for this type
      if (existingTicketType.data.tickets_sold > 0) {
        throw new ValidationError('Cannot delete ticket type with sold tickets. Archive it instead.');
      }

      const result = await ticketsService.deleteTicketType(ticketTypeId, req.user.id);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async createTicketTemplate(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Rate limiting check
      if (req.rateLimit && req.rateLimit.remaining === 0) {
        throw SecurityErrorHandler.handleRateLimit(req);
      }

      // Security: Validate template data
      const templateData = req.body;
      
      if (templateData.preview_url && !/^https?:\/\/.+/.test(templateData.preview_url)) {
        throw new ValidationError('Preview URL must be a valid HTTP/HTTPS URL');
      }

      if (templateData.source_files_path && (templateData.source_files_path.includes('..') || templateData.source_files_path.includes('~'))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'Suspicious file path detected');
      }

      const result = await ticketsService.createTicketTemplate(templateData, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('already exists')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getTicketTemplate(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid ticket template ID provided');
      }

      const templateId = parseInt(id);
      
      // Security: Check for potential SQL injection patterns
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in template ID');
      }

      const result = await ticketsService.getTicketTemplateById(templateId, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Ticket template');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async getPopularTemplates(req, res, next) {
    try {
      // Security: Validate query parameters
      const { limit, category } = req.query;
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 50)) {
        throw new ValidationError('Limit must be between 1 and 50');
      }

      const options = {
        limit: limit ? parseInt(limit) : 10,
        category
      };

      const result = await ticketsService.getPopularTemplates(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async generateTicket(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Validate request data
      const { event_guest_id, ticket_type_id, ticket_template_id } = req.body;
      
      if (!event_guest_id || isNaN(parseInt(event_guest_id))) {
        throw new ValidationError('Valid event guest ID is required');
      }

      if (!ticket_type_id || isNaN(parseInt(ticket_type_id))) {
        throw new ValidationError('Valid ticket type ID is required');
      }

      if (ticket_template_id && isNaN(parseInt(ticket_template_id))) {
        throw new ValidationError('Valid ticket template ID is required');
      }

      // Security: Check for potential SQL injection
      const ids = [event_guest_id, ticket_type_id, ticket_template_id].filter(Boolean);
      for (const id of ids) {
        if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
          throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in ticket generation');
        }
      }

      const result = await ticketsService.generateTicket({
        event_guest_id: parseInt(event_guest_id),
        ticket_type_id: parseInt(ticket_type_id),
        ticket_template_id: ticket_template_id ? parseInt(ticket_template_id) : null
      }, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event guest or ticket type');
        }
        if (result.error && result.error.includes('already exists')) {
          throw new ConflictError('Ticket already generated for this event guest');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getTicketByCode(req, res, next) {
    try {
      const { ticketCode } = req.params;
      
      // Security: Validate ticket code
      if (!ticketCode || ticketCode.length < 6 || ticketCode.length > 255) {
        throw new ValidationError('Valid ticket code is required');
      }

      // Security: Check for suspicious patterns
      if (ticketCode.includes(';') || ticketCode.includes('--') || ticketCode.includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in ticket code');
      }

      const result = await ticketsService.getTicketByCode(ticketCode, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Ticket');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async validateTicket(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid ticket ID provided');
      }

      const ticketId = parseInt(id);
      
      // Security: Check for potential SQL injection patterns
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in ticket ID');
      }

      const result = await ticketsService.validateTicket(ticketId, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Ticket');
        }
        if (result.error && result.error.includes('already validated')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async validateTicketByCode(req, res, next) {
    try {
      const { ticket_code } = req.body;
      
      // Security: Validate ticket code
      if (!ticket_code || ticket_code.length < 6 || ticket_code.length > 255) {
        throw new ValidationError('Valid ticket code is required');
      }

      // Security: Check for suspicious patterns
      if (ticket_code.includes(';') || ticket_code.includes('--') || ticket_code.includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in ticket code');
      }

      const result = await ticketsService.validateTicketByCode(ticket_code, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Ticket');
        }
        if (result.error && result.error.includes('already validated')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getTickets(req, res, next) {
    try {
      // Security: Validate query parameters
      const { page, limit, status, ticket_type_id, event_id } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        throw new ValidationError('Invalid limit parameter (must be between 1 and 100)');
      }

      // Security: Validate IDs
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        status,
        ticket_type_id: ticket_type_id ? parseInt(ticket_type_id) : undefined,
        event_id: event_id ? parseInt(event_id) : undefined
      };

      // Security: Check for SQL injection in IDs
      const ids = [ticket_type_id, event_id].filter(Boolean);
      for (const id of ids) {
        if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
          throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in query parameters');
        }
      }

      const result = await ticketsService.getTickets(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async getTicketsByEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      
      // Security: Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventIdInt = parseInt(eventId);
      
      // Security: Check for potential SQL injection patterns
      if (eventId.toString().includes(';') || eventId.toString().includes('--') || eventId.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in event ID');
      }

      // Security: Validate query parameters
      const { page, limit, status, ticket_type_id } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        throw new ValidationError('Invalid limit parameter (must be between 1 and 100)');
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        status,
        ticket_type_id: ticket_type_id ? parseInt(ticket_type_id) : undefined
      };

      const result = await ticketsService.getTicketsByEvent(eventIdInt, options);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async getTicketStats(req, res, next) {
    try {
      const { eventId } = req.params;
      
      // Security: Validate event ID
      if (!eventId || isNaN(parseInt(eventId))) {
        throw new ValidationError('Invalid event ID provided');
      }

      const eventIdInt = parseInt(eventId);
      
      // Security: Check user permissions for stats access
      const result = await ticketsService.getTicketStats(eventIdInt, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Event');
        }
        if (result.error && result.error.includes('access denied')) {
          throw new AuthorizationError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkGenerateTickets(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Validate request data
      const { event_guest_ids, ticket_type_id, ticket_template_id } = req.body;
      
      if (!event_guest_ids || !Array.isArray(event_guest_ids)) {
        throw new ValidationError('Event guest IDs array is required');
      }

      if (event_guest_ids.length === 0) {
        throw new ValidationError('At least one event guest ID must be provided');
      }

      if (event_guest_ids.length > 100) {
        throw new ValidationError('Cannot generate more than 100 tickets at once');
      }

      if (!ticket_type_id || isNaN(parseInt(ticket_type_id))) {
        throw new ValidationError('Valid ticket type ID is required');
      }

      // Security: Validate all IDs
      for (let i = 0; i < event_guest_ids.length; i++) {
        const id = event_guest_ids[i];
        if (isNaN(parseInt(id))) {
          throw new ValidationError(`Invalid event guest ID at index ${i}`);
        }
        if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
          throw SecurityErrorHandler.handleInvalidInput(req, `SQL injection attempt in event guest ID at index ${i}`);
        }
      }

      const result = await ticketsService.bulkGenerateTickets({
        event_guest_ids: event_guest_ids.map(id => parseInt(id)),
        ticket_type_id: parseInt(ticket_type_id),
        ticket_template_id: ticket_template_id ? parseInt(ticket_template_id) : null
      }, req.user.id);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TicketsController();
