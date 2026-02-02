/**
 * Controller unifié pour la génération de tickets
 * Implémente la structure optimisée avec Redis Queue
 */

const ticketDataEnrichmentService = require('../services/ticket-data-enrichment.service');
const ticketGenerationQueueService = require('../services/ticket-generation-queue.service');
const ticketsRepository = require('../modules/tickets/tickets.repository');
const { ResponseFormatter } = require('../../../shared');

class UnifiedTicketGenerationController {
  /**
   * Crée un nouveau job de génération de tickets
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async createTicketGenerationJob(req, res) {
    const startTime = Date.now();
    
    try {
      const { ticket_ids, options = {} } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
        return res.status(400).json(ResponseFormatter.error(
          'ticket_ids is required and must be a non-empty array',
          null,
          'VALIDATION_ERROR'
        ));
      }

      // Étape 1: Enrichir les données des tickets
      console.log(`[TICKET_GENERATION] Enrichissement de ${ticket_ids.length} tickets...`);
      const enrichmentResult = await ticketDataEnrichmentService.enrichTicketData(ticket_ids, req.db);
      
      if (!enrichmentResult.success) {
        return res.status(500).json(ResponseFormatter.error(
          'Failed to enrich ticket data',
          enrichmentResult.error,
          'ENRICHMENT_ERROR'
        ));
      }

      // Valider les données enrichies
      const validation = ticketDataEnrichmentService.validateEnrichedData(enrichmentResult.data);
      if (!validation.isValid) {
        return res.status(400).json(ResponseFormatter.error(
          'Invalid ticket data',
          validation.errors,
          'VALIDATION_ERROR'
        ));
      }

      // Étape 2: Créer le job en base de données
      const jobData = {
        event_id: enrichmentResult.data[0]?.event?.id || null,
        status: 'pending',
        details: {
          ticket_ids: ticket_ids,
          enriched_tickets: enrichmentResult.data,
          options: options,
          created_by: userId
        },
        created_by: userId
      };

      const job = await ticketsRepository.createJob(jobData);

      // Étape 3: Préparer les données pour ticket-generator
      const generatorJobData = {
        job_id: job.id,
        event_id: jobData.event_id,
        tickets: enrichmentResult.data,
        options: {
          qrFormat: options.qrFormat || 'base64',
          qrSize: options.qrSize || 'medium',
          pdfFormat: options.pdfFormat !== false,
          includeLogo: options.includeLogo || false
        }
      };

      // Étape 4: Envoyer à Redis Queue
      console.log(`[TICKET_GENERATION] Envoi du job ${job.id} à ticket-generator...`);
      const queueResult = await ticketGenerationQueueService.sendGenerationJob(generatorJobData);

      if (!queueResult.success) {
        // Marquer le job comme en erreur
        await ticketsRepository.updateJobStatus(job.id, 'failed', {
          error_message: `Queue error: ${queueResult.error}`
        });

        return res.status(500).json(ResponseFormatter.error(
          'Failed to queue generation job',
          queueResult.error,
          'QUEUE_ERROR'
        ));
      }

      const processingTime = Date.now() - startTime;

      res.status(201).json(ResponseFormatter.created('Ticket generation job created', {
        job_id: job.id,
        status: job.status,
        tickets_count: enrichmentResult.data.length,
        queue_message_id: queueResult.messageId,
        processing_time_ms: processingTime,
        created_at: job.created_at
      }));

    } catch (error) {
      console.error('[TICKET_GENERATION] Error creating job:', error);
      res.status(500).json(ResponseFormatter.error(
        'Internal server error',
        error.message,
        'INTERNAL_ERROR'
      ));
    }
  }

  /**
   * Récupère le statut d'un job de génération
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async getTicketGenerationJobStatus(req, res) {
    try {
      const { job_id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      if (!job_id || isNaN(parseInt(job_id))) {
        return res.status(400).json(ResponseFormatter.error(
          'Invalid job ID',
          null,
          'VALIDATION_ERROR'
        ));
      }

      // Récupérer l'ID utilisateur depuis le token JWT
      // userId est déjà défini plus haut
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.error(
          'User ID not found in token',
          null,
          'INVALID_TOKEN'
        ));
      }

      const job = await ticketsRepository.getJobById(parseInt(job_id));
      
      if (!job) {
        return res.status(404).json(ResponseFormatter.notFound('Generation job'));
      }

      // Vérifier les permissions (l'utilisateur doit être le créateur ou admin)
      const isAdmin = req.user?.roles?.includes('admin') || req.user?.roles?.includes('super_admin') || false;
      
      console.log(`[TICKET_GENERATION] Permission check: job.created_by=${job.created_by}, userId=${userId}, isAdmin=${isAdmin}`);
      
      if (job.created_by != userId && !isAdmin) {
        return res.status(403).json(ResponseFormatter.error(
          'Access denied',
          null,
          'ACCESS_DENIED'
        ));
      }

      res.json(ResponseFormatter.success('Generation job retrieved', {
        job_id: job.id,
        status: job.status,
        details: job.details,
        created_at: job.created_at,
        updated_at: job.updated_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        error_message: job.error_message
      }));

    } catch (error) {
      console.error('[TICKET_GENERATION] Error getting job status:', error);
      res.status(500).json(ResponseFormatter.error(
        'Internal server error',
        error.message,
        'INTERNAL_ERROR'
      ));
    }
  }

  /**
   * Récupère les jobs de génération pour un événement
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async getEventGenerationJobs(req, res) {
    try {
      const { event_id } = req.params;
      const { page = 1, limit = 10, status } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      if (!event_id || isNaN(parseInt(event_id))) {
        return res.status(400).json(ResponseFormatter.error(
          'Invalid event ID',
          null,
          'VALIDATION_ERROR'
        ));
      }

      // Récupérer les jobs avec pagination
      const jobs = await ticketsRepository.getJobsByEventId(parseInt(event_id), {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });

      res.json(ResponseFormatter.success('Event generation jobs retrieved', jobs));

    } catch (error) {
      console.error('[TICKET_GENERATION] Error getting event jobs:', error);
      res.status(500).json(ResponseFormatter.error(
        'Internal server error',
        error.message,
        'INTERNAL_ERROR'
      ));
    }
  }

  /**
   * Traite les webhooks de ticket-generator (appelé par le webhook controller)
   * @param {Object} webhookData - Données du webhook
   * @returns {Promise<Object>} Résultat du traitement
   */
  async processGenerationWebhook(webhookData) {
    try {
      const { job_id, status, timestamp, tickets, summary, processing_time_ms } = webhookData;

      // Mettre à jour le statut du job
      const updateData = {
        status,
        updated_at: new Date()
      };

      if (status === 'processing') {
        updateData.started_at = timestamp;
      } else if (status === 'completed' || status === 'failed') {
        updateData.completed_at = timestamp;
      }

      // Ajouter les détails des résultats
      if (tickets && tickets.length > 0) {
        // Préparer les détails enrichis avec les infos PDF
        const enrichedTickets = tickets.map(ticket => {
          const enrichedTicket = { ...ticket };
          if (ticket.pdf_file) {
            enrichedTicket.pdf_info = {
              file_path: ticket.pdf_file,
              generated_at: ticket.generated_at || new Date().toISOString()
            };
          }
          return enrichedTicket;
        });

        updateData.details = {
          tickets_processed: enrichedTickets,
          summary,
          processing_time_ms
        };
      }

      await ticketsRepository.updateJobStatus(job_id, status, updateData);

      // Mettre à jour les tickets individuels avec les résultats
      if (tickets && tickets.length > 0) {
        for (const ticketResult of tickets) {
          if (ticketResult.success) {
            // Préparer les données de mise à jour
            const updateTicketData = {
              qr_code_data: ticketResult.qr_code_data,
              generated_at: ticketResult.generated_at
            };

            // Si le pdf_file est fourni, le stocker (même si la table n'a pas la colonne)
            if (ticketResult.pdf_file) {
              // Pour l'instant, on stocke l'info dans les détails du job
              console.log(`[TICKET_GENERATION] PDF généré pour ticket ${ticketResult.ticket_id}: ${ticketResult.pdf_file}`);
            }

            await ticketsRepository.update(ticketResult.ticket_id, updateTicketData);
          } else {
            console.error(`[TICKET_GENERATION] Échec génération ticket ${ticketResult.ticket_id}: ${ticketResult.error}`);
          }
        }
      }

      console.log(`[TICKET_GENERATION] Job ${job_id} mis à jour: ${status}`);

      return {
        success: true,
        job_id,
        status,
        tickets_processed: tickets?.length || 0
      };
    } catch (error) {
      console.error('[TICKET_GENERATION] Error processing webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new UnifiedTicketGenerationController();
