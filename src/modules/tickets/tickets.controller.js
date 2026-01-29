const ticketsService = require('./tickets.service');
const { ResponseFormatter } = require('../../../../shared');
const eventQueueService = require('../../core/queue/event-queue.service');
const logger = require('../../utils/logger');

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

  async getTicketTypesByEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const { page, limit } = req.query;
      const userId = req.user?.id;
      
      const result = await ticketsService.getTicketTypesByEvent(eventId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        userId
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Event ticket types retrieved', result.data, result.pagination));
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

  async validateTicketByQRCode(req, res, next) {
    try {
      const { qr_code, scan_context, validation_options } = req.body;
      const userId = req.user?.id;
      
      // Préparer les options de validation avec valeurs par défaut
      const options = {
        strict_mode: validation_options?.strict_mode || false,
        check_fraud: validation_options?.check_fraud !== false, // true par défaut
        allow_used: validation_options?.allow_used || false
      };

      // Préparer le contexte de scan
      const context = {
        location: scan_context?.location || 'unknown',
        deviceId: scan_context?.device_id || 'unknown',
        timestamp: scan_context?.timestamp || new Date().toISOString(),
        operatorId: scan_context?.operator_id || userId,
        checkpointId: scan_context?.checkpoint_id || 'default',
        eventId: scan_context?.event_id
      };

      logger.info(`Validation QR code demandée par ${userId}`, {
        qr_code_length: qr_code?.length,
        context: context,
        options: options
      });

      // Appeler le service de validation avec le QR code
      const result = await ticketsService.validateTicketByQRCode(qr_code, userId, context, options);
      
      if (!result.success) {
        // Gérer les différents types d'erreur
        if (result.error === 'Ticket not found') {
          return res.status(404).json(ResponseFormatter.notFound('Ticket'));
        }
        if (result.error === 'Ticket already used' && !options.allow_used) {
          return res.status(409).json(ResponseFormatter.conflict('Ticket already used'));
        }
        if (result.error && result.error.includes('Invalid QR code')) {
          return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'QR_VALIDATION_ERROR'));
        }
        if (result.error && result.error.includes('fraud')) {
          return res.status(422).json(ResponseFormatter.error(result.error, result.details, 'FRAUD_DETECTED'));
        }
        
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      // Réponse de validation réussie
      const response = {
        ticket: result.data,
        validation: {
          valid: true,
          timestamp: new Date().toISOString(),
          scan_context: context,
          validation_options: options,
          service: 'event-planner-core'
        }
      };

      logger.info(`QR code validé avec succès`, {
        ticket_id: result.data.id,
        user_id: userId,
        scan_context: context
      });

      res.json(ResponseFormatter.success('Ticket validated by QR code', response));
    } catch (error) {
      logger.error('Erreur lors de la validation QR code', {
        error: error.message,
        user_id: req.user?.id,
        qr_code: req.body?.qr_code?.substring(0, 20) + '...'
      });
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

      // Étape 1: Création des tickets en base de données (statut PENDING)
      const result = await ticketsService.bulkGenerateTickets({
        event_id,
        ticket_type_id,
        quantity
      }, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      // Étape 2: Envoi asynchrone de la demande de génération à ticket-generator
      try {
        const queueResult = await eventQueueService.sendTicketGenerationRequest(
          event_id,
          result.data.tickets, // Les tickets créés avec statut PENDING
          {
            priority: 1, // Priorité normale
            delay: 0    // Pas de délai
          }
        );

        logger.info('📤 Demande de génération envoyée à ticket-generator', {
          eventId: event_id,
          correlationId: queueResult.correlationId,
          ticketCount: result.data.tickets.length,
          jobId: queueResult.jobId
        });

        // Étape 3: Retour immédiat avec les informations de suivi
        return res.json(ResponseFormatter.success('Tickets created and generation queued', {
          tickets: result.data.tickets,
          generation: {
            status: 'PENDING',
            correlationId: queueResult.correlationId,
            jobId: queueResult.jobId,
            queuedAt: new Date().toISOString()
          },
          summary: {
            totalTickets: result.data.tickets.length,
            eventId: event_id,
            userId: userId
          }
        }));

      } catch (queueError) {
        // Si l'envoi à la queue échoue, on met les tickets en erreur
        logger.error('❌ Erreur envoi à la queue', {
          eventId: event_id,
          error: queueError.message
        });

        // Marquer les tickets comme en erreur de queue
        await ticketsService.updateTicketsStatus(
          result.data.tickets.map(t => t.id),
          'QUEUE_ERROR'
        );

        return res.status(500).json(
          ResponseFormatter.error(
            'Tickets created but queue processing failed',
            { queueError: queueError.message },
            'QUEUE_ERROR'
          )
        );
      }

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
