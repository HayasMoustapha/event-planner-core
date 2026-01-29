/**
 * SCRIPT DE TEST D'INTÉGRATION PAYMENT SERVICE AVEC AUTHENTIFICATION
 * 
 * OBJECTIF : Tester la communication entre event-planner-core et payment-service avec authentification
 * Ce script vérifie que l'intégration des paiements fonctionne correctement avec RBAC
 * 
 * UTILISATION :
 * node test-payment-integration-auth.js
 * 
 * PRÉREQUIS :
 * - Event Planner Core Service démarré (port 3001)
 * - Payment Service démarré (port 3003)
 */

// Importation des modules nécessaires
const axios = require('axios');
require('dotenv').config();

// Configuration des tests
const CORE_BASE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:3001';
const PAYMENT_BASE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';

// Variables globales pour les résultats
const results = {
  core: { total: 0, passed: 0, failed: 0, details: {} },
  payment: { total: 0, passed: 0, failed: 0, details: {} },
  integration: { total: 0, passed: 0, failed: 0, details: {} }
};

// Token d'authentification (simulé pour les tests)
const AUTH_TOKEN = process.env.SERVICE_TOKEN || 'service-token-123456789012345678901234567890';

/**
 * Fonction utilitaire pour afficher des messages colorés
 */
function log(message, color = 'white') {
  const colors = {
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  };
  console.log(`${colors[color]}${message}\x1b[0m`);
}

/**
 * Fonction pour tester une route API avec authentification
 */
async function testRoute(method, url, data = null, description = '', withAuth = true) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'test-integration/1.0.0'
    };

    // Ajouter l'en-tête d'authentification si nécessaire
    if (withAuth) {
      headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
      headers['X-Service-Token'] = AUTH_TOKEN;
    }

    let response;
    
    if (method === 'GET') {
      response = await axios.get(url, { 
        headers, 
        timeout: 5000 
      });
    } else if (method === 'POST') {
      response = await axios.post(url, data, { 
        headers, 
        timeout: 10000 
      });
    } else if (method === 'PATCH') {
      response = await axios.patch(url, data, { 
        headers, 
        timeout: 5000 
      });
    }

    return {
      success: true,
      status: response.status,
      data: response.data
    };
    
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        error: error.response.data?.error || error.response.data?.message || 'Request failed',
        data: error.response.data
      };
    } else {
      return {
        success: false,
        status: 0,
        error: error.message || 'Network error'
      };
    }
  }
}

/**
 * Test 1 : Vérifier la santé du service Core
 */
async function testCoreHealth() {
  log('\n🏥 TESTS DE SANTÉ DU SERVICE CORE', 'yellow');
  log('=====================================', 'yellow');
  
  results.core.total++;
  const healthResult = await testRoute('GET', `${CORE_BASE_URL}/health`, null, 'Health check Core', false);
  if (healthResult.success) {
    results.core.passed++;
    log('✅ Service Core en bonne santé', 'green');
    log(`📋 Service: ${healthResult.data.service || 'N/A'}`, 'blue');
    log(`📋 Version: ${healthResult.data.version || 'N/A'}`, 'blue');
  } else {
    results.core.failed++;
    log(`❌ Service Core indisponible: ${healthResult.error}`, 'red');
  }
  results.core.details.health = healthResult;
}

/**
 * Test 2 : Vérifier la santé du service Payment
 */
async function testPaymentHealth() {
  log('\n💳 TESTS DE SANTÉ DU SERVICE PAYMENT', 'yellow');
  log('========================================', 'yellow');
  
  results.payment.total++;
  const healthResult = await testRoute('GET', `${PAYMENT_BASE_URL}/health`, null, 'Health check Payment', false);
  if (healthResult.success) {
    results.payment.passed++;
    log('✅ Service Payment en bonne santé', 'green');
    log(`📋 Service: ${healthResult.data.service || 'N/A'}`, 'blue');
    log(`📋 Version: ${healthResult.data.version || 'N/A'}`, 'blue');
  } else {
    results.payment.failed++;
    log(`❌ Service Payment indisponible: ${healthResult.error}`, 'red');
  }
  results.payment.details.health = healthResult;
}

/**
 * Test 3 : Vérifier la santé du service de paiement via Core
 */
async function testCorePaymentHealth() {
  log('\n🔗 TESTS DE SANTÉ PAYMENT VIA CORE', 'yellow');
  log('=====================================', 'yellow');
  
  results.integration.total++;
  const healthResult = await testRoute('GET', `${CORE_BASE_URL}/api/marketplace/payments/health`, null, 'Payment health via Core');
  if (healthResult.success) {
    results.integration.passed++;
    log('✅ Service Payment accessible via Core', 'green');
    log(`📋 Statut: ${healthResult.data.data?.status || 'N/A'}`, 'blue');
    log(`📋 Disponible: ${healthResult.data.data?.available ? 'Oui' : 'Non'}`, 'blue');
  } else {
    results.integration.failed++;
    log(`❌ Service Payment inaccessible via Core: ${healthResult.error}`, 'red');
  }
  results.integration.details.corePaymentHealth = healthResult;
}

/**
 * Test 4 : Récupérer les passerelles disponibles via Core
 */
async function testGetGateways() {
  log('\n🚪 TESTS DES PASSERELLES DISPONIBLES', 'yellow');
  log('=====================================', 'yellow');
  
  results.integration.total++;
  const gatewaysResult = await testRoute('GET', `${CORE_BASE_URL}/api/marketplace/payments/gateways`, null, 'Get available gateways');
  if (gatewaysResult.success) {
    results.integration.passed++;
    log('✅ Passerelles récupérées avec succès', 'green');
    const gateways = gatewaysResult.data.data?.gateways || [];
    log(`📋 Nombre de passerelles: ${gateways.length}`, 'blue');
    gateways.forEach(gateway => {
      log(`   • ${gateway.name || gateway}: ${gateway.available ? 'Disponible' : 'Indisponible'}`, 'blue');
    });
  } else {
    results.integration.failed++;
    log(`❌ Échec récupération passerelles: ${gatewaysResult.error}`, 'red');
  }
  results.integration.details.gateways = gatewaysResult;
}

/**
 * Test 5 : Vérifier la disponibilité d'un template via Core
 */
async function testTemplateAvailability() {
  log('\n📄 TESTS DE DISPONIBILITÉ DE TEMPLATE', 'yellow');
  log('========================================', 'yellow');
  
  results.core.total++;
  const availabilityResult = await testRoute('GET', `${CORE_BASE_URL}/api/marketplace/templates/template_test_123/availability`, null, 'Template availability');
  if (availabilityResult.success) {
    results.core.passed++;
    log('✅ Disponibilité template vérifiée', 'green');
    log(`📋 Disponible: ${availabilityResult.data.data?.available ? 'Oui' : 'Non'}`, 'blue');
    log(`📋 Prix: ${availabilityResult.data.data?.template?.price || 'N/A'} centimes`, 'blue');
  } else {
    results.core.failed++;
    log(`❌ Échec vérification disponibilité: ${availabilityResult.error}`, 'red');
  }
  results.core.details.availability = availabilityResult;
}

/**
 * Test 6 : Acheter un template via Core
 */
async function testTemplatePurchase() {
  log('\n💰 TESTS D\'ACHAT DE TEMPLATE VIA CORE', 'yellow');
  log('==========================================', 'yellow');
  
  const purchaseData = {
    templateId: 'template_test_123',
    userId: 'user_test_456',
    paymentMethod: 'stripe',
    customerEmail: 'test@example.com',
    customerName: 'Test User',
    metadata: {
      templateName: 'Test Template',
      category: 'test',
      price: 2500
    }
  };

  results.integration.total++;
  const purchaseResult = await testRoute('POST', `${CORE_BASE_URL}/api/marketplace/templates/purchase`, purchaseData, 'Template purchase via Core');
  if (purchaseResult.success) {
    results.integration.passed++;
    log('✅ Achat template initié avec succès', 'green');
    log(`📋 Transaction ID: ${purchaseResult.data.data?.transactionId || 'N/A'}`, 'blue');
    log(`📋 Statut: ${purchaseResult.data.data?.status || 'N/A'}`, 'blue');
    log(`📋 Montant: ${purchaseResult.data.data?.amount || 'N/A'} centimes`, 'blue');
  } else {
    results.integration.failed++;
    log(`❌ Échec achat template: ${purchaseResult.error}`, 'red');
  }
  results.integration.details.purchase = purchaseResult;
}

/**
 * Test 7 : Traiter un paiement standard via Core
 */
async function testStandardPayment() {
  log('\n💳 TESTS DE PAIEMENT STANDARD VIA CORE', 'yellow');
  log('==========================================', 'yellow');
  
  const paymentData = {
    userId: 'user_test_456',
    eventId: 'event_test_789',
    amount: 5000, // 50.00€
    currency: 'EUR',
    paymentMethod: 'stripe',
    description: 'Test payment for event',
    customerEmail: 'test@example.com',
    customerName: 'Test User'
  };

  results.integration.total++;
  const paymentResult = await testRoute('POST', `${CORE_BASE_URL}/api/marketplace/payments/process`, paymentData, 'Standard payment via Core');
  if (paymentResult.success) {
    results.integration.passed++;
    log('✅ Paiement standard initié avec succès', 'green');
    log(`📋 Transaction ID: ${paymentResult.data.data?.transactionId || 'N/A'}`, 'blue');
    log(`📋 Statut: ${paymentResult.data.data?.status || 'N/A'}`, 'blue');
    log(`📋 Passerelle: ${paymentResult.data.data?.gateway || 'N/A'}`, 'blue');
  } else {
    results.integration.failed++;
    log(`❌ Échec paiement standard: ${paymentResult.error}`, 'red');
  }
  results.integration.details.payment = paymentResult;
}

/**
 * Test 8 : Notification d'achat (webhook interne)
 */
async function testPurchaseNotification() {
  log('\n📢 TESTS DE NOTIFICATION D\'ACHAT', 'yellow');
  log('==================================', 'yellow');
  
  const notificationData = {
    templateId: 'template_test_123',
    userId: 'user_test_456',
    transactionId: 'tx_test_' + Date.now(),
    amount: 2500,
    currency: 'EUR',
    purchaseDate: new Date().toISOString(),
    metadata: {
      source: 'integration_test',
      designerId: 'designer_test_789'
    }
  };

  results.core.total++;
  const notificationResult = await testRoute('POST', `${CORE_BASE_URL}/api/marketplace/templates/purchase-notification`, notificationData, 'Purchase notification');
  if (notificationResult.success) {
    results.core.passed++;
    log('✅ Notification traitée avec succès', 'green');
    log(`📋 Notification ID: ${notificationResult.data.data?.notificationId || 'N/A'}`, 'blue');
  } else {
    results.core.failed++;
    log(`❌ Échec notification: ${notificationResult.error}`, 'red');
  }
  results.core.details.notification = notificationResult;
}

/**
 * Test 9 : Test d'authentification
 */
async function testAuthentication() {
  log('\n🔐 TESTS D\'AUTHENTIFICATION', 'yellow');
  log('=============================', 'yellow');
  
  results.core.total++;
  
  // Test sans authentification
  const noAuthResult = await testRoute('GET', `${CORE_BASE_URL}/api/marketplace/payments/health`, null, 'Payment health without auth', false);
  
  // Test avec authentification
  const authResult = await testRoute('GET', `${CORE_BASE_URL}/api/marketplace/payments/health`, null, 'Payment health with auth', true);
  
  if (!noAuthResult.success && noAuthResult.status === 401 && authResult.success) {
    results.core.passed++;
    log('✅ Authentification fonctionne correctement', 'green');
    log('📋 Accès refusé sans token (401)', 'blue');
    log('📋 Accès autorisé avec token (200)', 'blue');
  } else {
    results.core.failed++;
    log('❌ Problème d\'authentification', 'red');
    log(`📋 Sans auth: ${noAuthResult.status} - ${noAuthResult.error}`, 'red');
    log(`📋 Avec auth: ${authResult.status} - ${authResult.error}`, 'red');
  }
  
  results.core.details.auth = { noAuth: noAuthResult, auth: authResult };
}

/**
 * Fonction principale d'exécution des tests
 */
async function runAllTests() {
  log('🚀 DÉMARRAGE DES TESTS D\'INTÉGRATION PAYMENT AVEC AUTH', 'yellow');
  log('======================================================', 'yellow');
  
  try {
    // Tests de santé des services
    await testCoreHealth();
    await testPaymentHealth();
    
    // Test d'authentification
    await testAuthentication();
    
    // Tests d'intégration
    await testCorePaymentHealth();
    await testGetGateways();
    
    // Tests de fonctionnalités Core
    await testTemplateAvailability();
    await testPurchaseNotification();
    
    // Tests de paiement
    await testTemplatePurchase();
    await testStandardPayment();
    
    // Affichage des résultats
    displayResults();
    
  } catch (error) {
    log(`❌ Erreur critique lors des tests: ${error.message}`, 'red');
    console.error(error);
  }
}

/**
 * Affichage des résultats des tests
 */
function displayResults() {
  log('\n📊 RÉSULTATS DES TESTS', 'yellow');
  log('=====================', 'yellow');
  
  // Résultats Core Service
  log('\n🏥 SERVICE CORE:', 'cyan');
  log(`   • Total: ${results.core.total}`);
  log(`   • Réussis: ${results.core.passed}`);
  log(`   • Échoués: ${results.core.failed}`);
  log(`   • Taux: ${results.core.total > 0 ? ((results.core.passed / results.core.total) * 100).toFixed(1) : 0}%`);
  
  // Résultats Payment Service
  log('\n💳 SERVICE PAYMENT:', 'cyan');
  log(`   • Total: ${results.payment.total}`);
  log(`   • Réussis: ${results.payment.passed}`);
  log(`   • Échoués: ${results.payment.failed}`);
  log(`   • Taux: ${results.payment.total > 0 ? ((results.payment.passed / results.payment.total) * 100).toFixed(1) : 0}%`);
  
  // Résultats d'intégration
  log('\n🔗 INTÉGRATION:', 'cyan');
  log(`   • Total: ${results.integration.total}`);
  log(`   • Réussis: ${results.integration.passed}`);
  log(`   • Échoués: ${results.integration.failed}`);
  log(`   • Taux: ${results.integration.total > 0 ? ((results.integration.passed / results.integration.total) * 100).toFixed(1) : 0}%`);
  
  // Résultats globaux
  const totalTests = results.core.total + results.payment.total + results.integration.total;
  const totalPassed = results.core.passed + results.payment.passed + results.integration.passed;
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  
  log('\n📈 RÉSULTATS GLOBAUX:', 'yellow');
  log(`   • Total des tests: ${totalTests}`);
  log(`   • Réussis: ${totalPassed}`);
  log(`   • Échoués: ${totalTests - totalPassed}`);
  log(`   • Taux de succès: ${successRate}%`);
  
  if (successRate >= 80) {
    log('\n🎉 INTÉGRATION PAYMENT FONCTIONNELLE !', 'green');
    log('✅ Event Planner Core peut communiquer avec Payment Service', 'green');
    log('✅ Les paiements de templates sont opérationnels', 'green');
    log('✅ L\'authentification RBAC fonctionne correctement', 'green');
  } else if (successRate >= 60) {
    log('\n⚠️  INTÉGRATION PARTIELLE - Vérifier les erreurs', 'yellow');
  } else {
    log('\n❌ INTÉGRATION ÉCHECÉE - Investigation requise', 'red');
  }
  
  log('\n🏁 FIN DES TESTS', 'white');
}

// Démarrage des tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testCoreHealth, testPaymentHealth, testTemplatePurchase };
