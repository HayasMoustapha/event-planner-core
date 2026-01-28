// ========================================
// 📄 IMPORTATIONS DES LIBRAIRIES
// ========================================
// Bull : Redis Queue pour la gestion des jobs asynchrones
const Queue = require('bull');
// IORedis : Client Redis pour la connexion
const IORedis = require('ioredis');
// UUID : Générateur d'identifiants uniques
const { v4: uuidv4 } = require('uuid');
// Logger pour enregistrer les événements
const logger = require('../../utils/logger');

/**
 * 🎫 SERVICE DE COMMUNICATION EVENT-PLANNER CORE
 * Gère l'envoi de messages vers ticket-generator via Redis Queue
 * Assure la persistance et la résilience des communications
 */
class EventQueueService {
  constructor() {
    // ========================================
    // 🔧 CONFIGURATION REDIS
    // ========================================
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 3, // DB différente de ticket-generator
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    };

    // ========================================
    // 📋 CONFIGURATION DES QUEUES
    // ========================================
    this.queues = {
      // Queue pour envoyer les demandes de génération de tickets
      ticketGeneration: new Queue('TICKET_GENERATION', {
        redis: this.redisConfig,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      }),

      // Queue pour recevoir les réponses de ticket-generator
      ticketGenerated: new Queue('TICKET_GENERATED', {
        redis: this.redisConfig,
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      })
    };

    this.isInitialized = false;
  }

  /**
   * Initialise les queues et les consumers
   */
  async initialize() {
    try {
      logger.info('🚀 Initialisation du service Redis Queue pour event-planner-core...');

      // Connexion à Redis
      await this.connectRedis();

      // Configuration des consumers
      this.setupConsumers();

      // Configuration des gestionnaires d'événements
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info('✅ Service Redis Queue event-planner-core initialisé avec succès');
    } catch (error) {
      logger.error('❌ Erreur lors de l\'initialisation du service Redis Queue:', error);
      throw error;
    }
  }

  /**
   * Connexion à Redis
   */
  async connectRedis() {
    try {
      const redis = new IORedis(this.redisConfig);
      await redis.ping();
      await redis.quit();
      logger.info('🔗 Connexion Redis établie pour event-planner-core');
    } catch (error) {
      logger.error('❌ Impossible de se connecter à Redis:', error);
      throw new Error('Connexion Redis requise pour le service de queue');
    }
  }

  /**
   * Configure les consumers pour traiter les réponses
   */
  setupConsumers() {
    // ========================================
    // 📥 CONSUMER: Réponses de génération de tickets
    // ========================================
    this.queues.ticketGenerated.process(async (job) => {
      const { eventId, correlationId, results, errors, timestamp, sourceService } = job.data;
      
      logger.info('📥 Réception réponse génération de tickets', {
        eventId,
        correlationId,
        successCount: results.length,
        errorCount: errors.length,
        sourceService
      });

      try {
        // Mise à jour des tickets en base de données
        await this.updateTicketsAfterGeneration(eventId, results, errors);

        logger.info('✅ Tickets mis à jour avec succès', {
          eventId,
          correlationId,
          updatedCount: results.length
        });

        return {
          success: true,
          updated: results.length,
          errors: errors.length
        };

      } catch (error) {
        logger.error('❌ Erreur mise à jour tickets', {
          eventId,
          correlationId,
          error: error.message
        });
        throw error;
      }
    });

    logger.info('👂 Consumers event-planner-core configurés');
  }

  /**
   * Configure les gestionnaires d'événements
   */
  setupEventHandlers() {
    this.queues.ticketGeneration.on('completed', (job, result) => {
      logger.info('✅ Demande de génération envoyée', {
        jobId: job.id,
        eventId: job.data.eventId,
        correlationId: job.data.correlationId
      });
    });

    this.queues.ticketGeneration.on('failed', (job, err) => {
      logger.error('❌ Erreur envoi demande de génération', {
        jobId: job.id,
        eventId: job.data.eventId,
        correlationId: job.data.correlationId,
        error: err.message
      });
    });

    this.queues.ticketGenerated.on('completed', (job, result) => {
      logger.info('✅ Réponse traitée', {
        jobId: job.id,
        eventId: job.data.eventId,
        correlationId: job.data.correlationId
      });
    });

    this.queues.ticketGenerated.on('failed', (job, err) => {
      logger.error('❌ Erreur traitement réponse', {
        jobId: job.id,
        eventId: job.data.eventId,
        correlationId: job.data.correlationId,
        error: err.message
      });
    });

    logger.info('📡 Gestionnaires d\'événements event-planner-core configurés');
  }

  /**
   * Envoie une demande de génération de tickets
   * @param {string} eventId - ID de l'événement
   * @param {Array} tickets - Liste des tickets à générer
   * @param {Object} options - Options supplémentaires
   */
  async sendTicketGenerationRequest(eventId, tickets, options = {}) {
    try {
      // Génération d'un ID de corrélation pour tracer la demande
      const correlationId = uuidv4();
      
      // Préparation des données du message
      const messageData = {
        eventId,
        correlationId,
        tickets: tickets.map(ticket => ({
          id: ticket.id,
          eventId: ticket.event_id,
          userId: ticket.user_id,
          type: ticket.type || 'standard',
          attendeeInfo: {
            name: ticket.attendee_name || 'Participant',
            email: ticket.attendee_email || 'participant@example.com',
            phone: ticket.attendee_phone
          }
        })),
        timestamp: new Date().toISOString(),
        sourceService: 'event-planner-core',
        options: {
          priority: options.priority || 1,
          delay: options.delay || 0
        }
      };

      // Mise à jour du statut des tickets en PENDING
      await this.updateTicketsStatus(eventId, tickets.map(t => t.id), 'PENDING');

      // Envoi du message dans la queue
      const job = await this.queues.ticketGeneration.add(
        'TICKET_GENERATION_REQUEST',
        messageData,
        {
          priority: messageData.options.priority,
          delay: messageData.options.delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      );

      logger.info('📤 Demande de génération de tickets envoyée', {
        eventId,
        correlationId,
        ticketCount: tickets.length,
        jobId: job.id
      });

      return {
        success: true,
        jobId: job.id,
        correlationId,
        eventId,
        ticketCount: tickets.length,
        status: 'PENDING'
      };

    } catch (error) {
      logger.error('❌ Erreur envoi demande de génération', {
        eventId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Met à jour le statut des tickets
   * @param {string} eventId - ID de l'événement
   * @param {Array} ticketIds - Liste des IDs de tickets
   * @param {string} status - Nouveau statut
   */
  async updateTicketsStatus(eventId, ticketIds, status) {
    try {
      // TODO: Implémenter la mise à jour en base de données
      // Pour l'instant, on simule avec un log
      logger.info('📝 Mise à jour statut tickets', {
        eventId,
        ticketIds,
        status,
        count: ticketIds.length
      });

      // Simulation d'attente pour l'opération DB
      await new Promise(resolve => setTimeout(resolve, 100));

      return { success: true, updated: ticketIds.length };
    } catch (error) {
      logger.error('❌ Erreur mise à jour statut tickets', {
        eventId,
        ticketIds,
        status,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Met à jour les tickets après génération
   * @param {string} eventId - ID de l'événement
   * @param {Array} results - Résultats de génération réussis
   * @param {Array} errors - Erreurs de génération
   */
  async updateTicketsAfterGeneration(eventId, results, errors) {
    try {
      // Mise à jour des tickets générés avec succès
      if (results.length > 0) {
        for (const result of results) {
          await this.updateTicketAfterGeneration(result.ticketId, {
            status: 'GENERATED',
            qrCode: result.qrCode,
            checksum: result.checksum,
            pdfUrl: result.pdfUrl,
            generatedAt: result.generatedAt
          });
        }
      }

      // Mise à jour des tickets en erreur
      if (errors.length > 0) {
        for (const error of errors) {
          await this.updateTicketAfterGeneration(error.ticketId, {
            status: 'ERROR',
            errorMessage: error.error,
            errorAt: error.timestamp
          });
        }
      }

      logger.info('✅ Mise à jour tickets terminée', {
        eventId,
        successCount: results.length,
        errorCount: errors.length
      });

    } catch (error) {
      logger.error('❌ Erreur mise à jour tickets après génération', {
        eventId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Met à jour un ticket spécifique après génération
   * @param {string} ticketId - ID du ticket
   * @param {Object} updateData - Données de mise à jour
   */
  async updateTicketAfterGeneration(ticketId, updateData) {
    try {
      // TODO: Implémenter la mise à jour en base de données
      // Pour l'instant, on simule avec un log
      logger.info('📝 Mise à jour ticket après génération', {
        ticketId,
        status: updateData.status,
        hasQrCode: !!updateData.qrCode,
        hasPdfUrl: !!updateData.pdfUrl
      });

      // Simulation d'attente pour l'opération DB
      await new Promise(resolve => setTimeout(resolve, 50));

      return { success: true, ticketId, updated: true };
    } catch (error) {
      logger.error('❌ Erreur mise à jour ticket', {
        ticketId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtient les statistiques des queues
   */
  async getQueueStats() {
    try {
      const stats = {};
      
      for (const [name, queue] of Object.entries(this.queues)) {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();

        stats[name] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        };
      }

      return stats;
    } catch (error) {
      logger.error('❌ Erreur récupération statistiques queues:', error);
      throw error;
    }
  }

  /**
   * Arrêt propre du service
   */
  async shutdown() {
    try {
      logger.info('🛑 Arrêt du service Redis Queue event-planner-core...');

      for (const [name, queue] of Object.entries(this.queues)) {
        await queue.close();
        logger.info(`✅ Queue ${name} fermée`);
      }

      this.isInitialized = false;
      logger.info('✅ Service Redis Queue event-planner-core arrêté');
    } catch (error) {
      logger.error('❌ Erreur lors de l\'arrêt du service Redis Queue:', error);
      throw error;
    }
  }
}

// ========================================
// 📤 EXPORTATION DU SERVICE
// ========================================
module.exports = new EventQueueService();
