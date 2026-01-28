// Test de communication Redis Queue entre event-planner-core et ticket-generator

const eventQueueService = require('./src/core/queue/event-queue.service');

async function testCommunication() {
  try {
    console.log('🧪 Test de communication Redis Queue...');
    
    // Initialisation du service
    await eventQueueService.initialize();
    console.log('✅ Service event-planner-core initialisé');
    
    // Test d'envoi de message
    const testTickets = [
      {
        id: 'test_ticket_1',
        event_id: 'test_event_1',
        user_id: 'test_user_1',
        type: 'standard',
        attendee_name: 'Test User 1',
        attendee_email: 'test1@example.com'
      },
      {
        id: 'test_ticket_2',
        event_id: 'test_event_1',
        user_id: 'test_user_2',
        type: 'vip',
        attendee_name: 'Test User 2',
        attendee_email: 'test2@example.com'
      }
    ];
    
    console.log('📤 Envoi de demande de génération...');
    const result = await eventQueueService.sendTicketGenerationRequest(
      'test_event_1',
      testTickets,
      { priority: 1, delay: 0 }
    );
    
    console.log('✅ Demande envoyée avec succès:', {
      correlationId: result.correlationId,
      jobId: result.jobId,
      ticketCount: result.ticketCount,
      status: result.status
    });
    
    // Vérification des statistiques
    const stats = await eventQueueService.getQueueStats();
    console.log('📊 Statistiques des queues:', stats);
    
    // Arrêt propre
    await eventQueueService.shutdown();
    console.log('✅ Test terminé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testCommunication();
