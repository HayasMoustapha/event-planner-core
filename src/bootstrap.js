const config = require('./config');
const bootstrap = require('./bootstrap');
const ticketGenerationQueueService = require('./services/ticket-generation-queue.service');
const unifiedTicketGenerationController = require('./controllers/unified-ticket-generation.controller');
const DatabaseBootstrap = require('./services/database-bootstrap.service');

/**
 * Point d'entrée pour le bootstrap de l'application
 * Initialise les services critiques avant démarrage du serveur
 */
class ApplicationBootstrap {
  /**
   * Initialise tous les composants critiques de l'application
   * @throws {Error} Si l'initialisation échoue
   */
  async initialize() {
    console.log('🚀 Starting Event Planner Core bootstrap...');
    
    try {
      // 0. Créer la base de données si elle n'existe pas (AVANT toute connexion)
      console.log('🔍 Checking database existence...');
      await DatabaseBootstrap.ensureDatabaseExists();
      console.log('✅ Database existence verified');
      
      // 1. Bootstrap de la base de données
      console.log('📊 Initializing database...');
      await DatabaseBootstrap.initialize();
      console.log('✅ Database initialized successfully');

      // 2. Démarrer le traitement des réponses webhook (en arrière-plan)
      console.log('🔄 Starting webhook response processing...');
      this.startWebhookProcessing();

      console.log('🎯 Application bootstrap completed successfully');
      
    } catch (error) {
      console.error('❌ Application bootstrap failed:', error.message);
      console.error('🔥 Server cannot start - critical services unavailable');
      process.exit(1); // Arrêt immédiat si bootstrap échoue
    }
  }
/**
   * Démarre le traitement des réponses webhook en arrière-plan
   */
  startWebhookProcessing() {
    // Démarrer le traitement des réponses webhook sans bloquer le démarrage du serveur
    // NE PAS utiliser await ici car processResponses est une boucle infinie!
    setImmediate(async () => {
      try {
        console.log('[WEBHOOK] Démarrage du traitement des réponses...');
        
        // Lancer la boucle infinie de traitement
        ticketGenerationQueueService.processResponses(async (responseData) => {
          console.log(`[WEBHOOK] Processing response for job ${responseData.job_id}`);
          
          // Traiter la réponse avec le controller unifié
          const result = await unifiedTicketGenerationController.processGenerationWebhook(responseData);
          
          if (!result.success) {
            console.error('[WEBHOOK] Erreur traitement webhook:', result.error);
          } else {
            console.log(`[WEBHOOK] Webhook traité avec succès pour job ${responseData.job_id}`);
          }
        });
        
        console.log('[WEBHOOK] Traitement des réponses démarré avec succès');
        
      } catch (error) {
        console.error('❌ Webhook response processing failed:', error);
      }
    });
  }
}

module.exports = new ApplicationBootstrap();
