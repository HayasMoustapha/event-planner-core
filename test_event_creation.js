/**
 * TEST DE VALIDATION - Création d'événement corrigée
 * Test pour confirmer que le problème de validation est résolu
 */

const axios = require('axios');

async function testEventCreation() {
  console.log('🔍 TEST DE VALIDATION - CRÉATION D\'ÉVÉNEMENT CORRIGÉE\n');
  
  try {
    // Configuration du test
    const baseUrl = process.env.EVENT_PLANNER_CORE_URL || 'http://localhost:3001';
    
    // Données de test pour l'événement
    const eventData = {
      title: "Annual Tech Conference 2026",
      description: "A comprehensive technology conference featuring the latest innovations in AI, cloud computing, and software development.",
      event_date: "2026-06-15T09:00:00.000Z",
      location: "Paris Convention Center, Paris, France"
    };

    console.log('📋 Données de test:');
    console.log(`   • Titre: ${eventData.title}`);
    console.log(`   • Date: ${eventData.event_date}`);
    console.log(`   • Lieu: ${eventData.location}`);
    console.log(`   • Description: ${eventData.description.substring(0, 50)}...`);

    // Simulation d'un utilisateur authentifié (token JWT fictif pour le test)
    const testHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token-super-admin',
      'X-User-ID': '1',
      'X-User-Role': 'super_admin'
    };

    console.log('\n🚀 Envoi de la requête de création d\'événement...');
    
    try {
      const response = await axios.post(`${baseUrl}/api/events`, eventData, {
        headers: testHeaders,
        timeout: 10000
      });

      console.log('\n✅ SUCCÈS - Événement créé avec succès!');
      console.log('📊 Réponse du serveur:');
      console.log(`   • Status: ${response.status}`);
      console.log(`   • Success: ${response.data.success}`);
      
      if (response.data.success) {
        console.log(`   • Message: ${response.data.message}`);
        if (response.data.data) {
          console.log(`   • Event ID: ${response.data.data.id}`);
          console.log(`   • Event Title: ${response.data.data.title}`);
          console.log(`   • Created At: ${response.data.data.created_at}`);
        }
      }

      console.log('\n🎯 CONCLUSION:');
      console.log('═════════════════════════════════════════════════');
      console.log('🏆 SUCCÈS : Le problème de validation est résolu!');
      console.log('✅ L\'événement a été créé sans erreur');
      console.log('✅ La réponse est structurée correctement');
      console.log('✅ Plus d\'erreur "verifyPermission is not a function"');
      console.log('═════════════════════════════════════════════════');
      
      return true;

    } catch (axiosError) {
      console.log('\n❌ ERREUR LORS DE LA REQUÊTE:');
      
      if (axiosError.response) {
        // Le serveur a répondu avec un statut d'erreur
        console.log(`   • Status: ${axiosError.response.status}`);
        console.log(`   • Error: ${axiosError.response.data.error || 'Pas de message d\'erreur'}`);
        
        if (axiosError.response.data.details) {
          console.log(`   • Details: ${JSON.stringify(axiosError.response.data.details, null, 2)}`);
        }
        
        if (axiosError.response.data.errorId) {
          console.log(`   • Error ID: ${axiosError.response.data.errorId}`);
        }
        
        if (axiosError.response.data.timestamp) {
          console.log(`   • Timestamp: ${axiosError.response.data.timestamp}`);
        }
        
        // Analyse spécifique de l'erreur
        if (axiosError.response.data.error === '') {
          console.log('\n🚨 PROBLÈME DÉTECTÉ: Erreur vide!');
          console.log('   Le ValidationError est toujours lancé avec un message vide');
          console.log('   Vérifiez que le service retourne bien {success: false, error: "..."}');
        }
        
      } else if (axiosError.request) {
        // La requête a été envoyée mais pas de réponse
        console.log('   • Erreur: Le serveur n\'a pas répondu');
        console.log('   • Vérifiez que le serveur event-planner-core est démarré');
      } else {
        // Erreur de configuration
        console.log(`   • Erreur: ${axiosError.message}`);
      }

      console.log('\n🎯 CONCLUSION:');
      console.log('═════════════════════════════════════════════════');
      console.log('❌ ÉCHEC : Le problème de validation persiste');
      console.log('⚠️  Vérifiez les logs du serveur pour plus de détails');
      console.log('⚠️  Assurez-vous que le service event-planner-core est en cours d\'exécution');
      console.log('═════════════════════════════════════════════════');
      
      return false;
    }

  } catch (error) {
    console.error('❌ Erreur inattendue lors du test:', error.message);
    return false;
  }
}

// Exécuter le test
if (require.main === module) {
  testEventCreation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = testEventCreation;
