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
   * ========================================
   * MISE À JOUR DU STATUT DES TICKETS
   * ========================================
   * Met à jour le statut de plusieurs tickets en base de données
   * @param {string} eventId - ID de l'événement
   * @param {Array} ticketIds - Liste des IDs de tickets à mettre à jour
   * @param {string} status - Nouveau statut ('PENDING', 'GENERATED', 'ERROR', etc.)
   * @returns {Promise<Object>} Résultat de l'opération
   */
  async updateTicketsStatus(eventId, ticketIds, status) {
    try {
      // Import de la connexion à la base de données
      const database = require('../../config/database');
      const client = await database.pool.connect();
      
      try {
        // Démarrage d'une transaction pour garantir la cohérence
        await client.query('BEGIN');
        
        let updatedCount = 0;
        
        // Mise à jour de chaque ticket individuellement
        for (const ticketId of ticketIds) {
          const updateQuery = `
            UPDATE tickets 
            SET 
              status = $1, 
              updated_at = NOW()
            WHERE id = $2 AND event_id = $3
          `;
          
          const result = await client.query(updateQuery, [status, ticketId, eventId]);
          updatedCount += result.rowCount; // Nombre de lignes affectées
        }
        
        // Validation de la transaction
        await client.query('COMMIT');
        
        logger.info('✅ Mise à jour statut tickets réussie', {
          eventId,
          ticketIds,
          status,
          requestedCount: ticketIds.length,
          updatedCount
        });

        return { 
          success: true, 
          requestedCount: ticketIds.length,
          updatedCount: updatedCount 
        };
        
      } catch (dbError) {
        // Annulation de la transaction en cas d'erreur
        await client.query('ROLLBACK');
        throw dbError;
      } finally {
        // Libération du client de connexion
        client.release();
      }
      
    } catch (error) {
      logger.error('❌ Erreur mise à jour statut tickets', {
        eventId,
        ticketIds,
        status,
        error: error.message,
        stack: error.stack
      });
      
      // Relancer l'erreur pour que le consumer Bull la traite
      throw new Error(`Échec mise à jour statut tickets: ${error.message}`);
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
   * ========================================
   * MISE À JOUR D'UN TICKET APRÈS GÉNÉRATION
   * ========================================
   * Met à jour un ticket spécifique avec les résultats de génération
   * @param {string} ticketId - ID du ticket à mettre à jour
   * @param {Object} updateData - Données de mise à jour (QR code, PDF URL, etc.)
   * @returns {Promise<Object>} Résultat de l'opération
   */
  async updateTicketAfterGeneration(ticketId, updateData) {
    try {
      // Import de la connexion à la base de données
      const database = require('../../config/database');
      const client = await database.pool.connect();
      
      try {
        // Liste des champs autorisés pour la mise à jour (sécurité)
        const allowedFields = [
          'qr_code_data', 
          'ticket_file_url', 
          'ticket_file_path', 
          'status',
          'error_message',
          'generated_at'
        ];
        
        const updates = [];
        const values = [];
        
        // Construction dynamique des mises à jour avec validation
        Object.keys(updateData).forEach(key => {
          if (allowedFields.includes(key) && updateData[key] !== undefined) {
            // Échappement des noms de colonnes pour prévenir l'injection SQL
            updates.push(`"${key}" = $${values.length + 1}`);
            values.push(updateData[key]);
          }
        });
        
        // Vérification qu'il y a au moins un champ à mettre à jour
        if (updates.length === 0) {
          throw new Error('Aucun champ valide à mettre à jour pour le ticket');
        }
        
        // Ajout de l'ID du ticket et de la date de mise à jour
        values.push(ticketId);
        
        // Construction de la requête SQL
        const updateQuery = `
          UPDATE tickets 
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${values.length}
          RETURNING *
        `;
        
        logger.info('� Mise à jour ticket après génération', {
          ticketId,
          status: updateData.status,
          hasQrCode: !!updateData.qr_code_data,
          hasPdfUrl: !!updateData.ticket_file_url,
          fields: Object.keys(updateData)
        });

        // Exécution de la requête
        const result = await client.query(updateQuery, values);
        
        // Vérification qu'un ticket a bien été mis à jour
        if (result.rows.length === 0) {
          throw new Error(`Ticket ${ticketId} non trouvé ou non mis à jour`);
        }
        
        const updatedTicket = result.rows[0];
        
        logger.info('✅ Ticket mis à jour avec succès', {
          ticketId,
          updatedStatus: updatedTicket.status,
          hasQrCode: !!updatedTicket.qr_code_data,
          hasPdfUrl: !!updatedTicket.ticket_file_url
        });

        return { 
          success: true, 
          ticketId, 
          updated: true,
          ticket: updatedTicket
        };
        
      } catch (dbError) {
        // Annulation de la transaction si nécessaire
        if (client.query) {
          try {
            await client.query('ROLLBACK');
          } catch (rollbackError) {
            logger.error('❌ Erreur lors du ROLLBACK:', rollbackError);
          }
        }
        throw dbError;
      } finally {
        // Libération du client de connexion
        client.release();
      }
      
    } catch (error) {
      logger.error('❌ Erreur mise à jour ticket après génération', {
        ticketId,
        status: updateData.status,
        error: error.message,
        stack: error.stack
      });
      
      // Relancer l'erreur pour que le consumer Bull la traite
      throw new Error(`Échec mise à jour ticket ${ticketId}: ${error.message}`);
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

      // Fermeture de toutes les queues avec gestion des erreurs
      const closePromises = [];
      for (const [name, queue] of Object.entries(this.queues)) {
        closePromises.push(
          queue.close()
            .then(() => logger.info(`✅ Queue ${name} fermée`))
            .catch(error => logger.error(`❌ Erreur fermeture queue ${name}:`, error.message))
        );
      }

      // Attendre que toutes les queues soient fermées
      await Promise.allSettled(closePromises);

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
