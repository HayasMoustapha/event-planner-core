/**
 * Service Redis Queue pour la génération de tickets
 * Communication asynchrone avec ticket-generator-service
 */

const Redis = require('ioredis');
const { createTicketGenerationJobSchema, updateJobStatusSchema } = require('../validators/unified-ticket-generation.validator');

class TicketGenerationQueueService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.queueName = 'ticket-generation';
    this.responseQueueName = 'ticket-generation-response';
    
    this.setupEventHandlers();
  }

  /**
   * Configure les gestionnaires d'événements Redis
   */
  setupEventHandlers() {
    this.redis.on('connect', () => {
      console.log('[TICKET_QUEUE] Connecté à Redis');
    });

    this.redis.on('error', (error) => {
      console.error('[TICKET_QUEUE] Erreur Redis:', error);
    });
  }

  /**
   * Envoie un job de génération à ticket-generator
   * @param {Object} jobData - Données du job enrichies
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendGenerationJob(jobData) {
    try {
      // Validation des données
      const { error } = createTicketGenerationJobSchema.validate(jobData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      // Créer le message avec métadonnées
      const message = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        service: 'event-planner-core',
        data: jobData
      };

      // Envoyer à la queue
      const result = await this.redis.lpush(
        this.queueName,
        JSON.stringify(message)
      );

      console.log(`[TICKET_QUEUE] Job ${jobData.job_id} envoyé à la queue (ID: ${message.id})`);

      return {
        success: true,
        messageId: message.id,
        queueLength: result
      };
    } catch (error) {
      console.error('[TICKET_QUEUE] Erreur envoi job:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Traite les réponses de ticket-generator
   * @param {Function} callback - Fonction de traitement des réponses
   */
  async processResponses(callback) {
    try {
      while (true) {
        const response = await this.redis.brpop(
          this.responseQueueName,
          10 // Timeout de 10 secondes
        );

        if (response) {
          const [queue, message] = response;
          const parsedMessage = JSON.parse(message);

          console.log(`[TICKET_QUEUE] Réponse reçue pour job ${parsedMessage.data.job_id}: ${parsedMessage.data.status}`);

          // Valider la réponse
          const { error } = updateJobStatusSchema.validate(parsedMessage.data);
          if (error) {
            console.error('[TICKET_QUEUE] Réponse invalide:', error.details[0].message);
            continue;
          }

          // Appeler le callback avec les données de la réponse
          if (callback) {
            await callback(parsedMessage.data);
          }
        }
      }
    } catch (error) {
      if (error.message !== 'Connection closed') {
        console.error('[TICKET_QUEUE] Erreur traitement réponses:', error);
      }
    }
  }

  /**
   * Obtient les statistiques de la queue
   * @returns {Promise<Object>} Statistiques
   */
  async getQueueStats() {
    try {
      const length = await this.redis.llen(this.queueName);
      const responseLength = await this.redis.llen(this.responseQueueName);

      return {
        queueName: this.queueName,
        pendingJobs: length,
        pendingResponses: responseLength,
        connected: this.redis.status === 'ready'
      };
    } catch (error) {
      console.error('[TICKET_QUEUE] Erreur stats:', error);
      return {
        queueName: this.queueName,
        pendingJobs: 0,
        pendingResponses: 0,
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Vide la queue (pour maintenance)
   * @returns {Promise<Object>} Résultat
   */
  async clearQueue() {
    try {
      const deleted = await this.redis.del(this.queueName);
      const deletedResponses = await this.redis.del(this.responseQueueName);

      return {
        success: true,
        deletedJobs: deleted,
        deletedResponses: deletedResponses
      };
    } catch (error) {
      console.error('[TICKET_QUEUE] Erreur vidage queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ferme la connexion Redis
   */
  async disconnect() {
    await this.redis.quit();
    console.log('[TICKET_QUEUE] Déconnecté de Redis');
  }
}

module.exports = new TicketGenerationQueueService();
