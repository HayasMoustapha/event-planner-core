/**
 * Jest Setup pour les Tests d'Orchestration
 * Configuration des variables d'environnement et helpers
 *
 * @author Event Planner Team
 * @version 1.0.0
 */

// Configuration des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';

// URLs des services (défaut: localhost)
process.env.TICKET_GENERATOR_URL = process.env.TICKET_GENERATOR_URL || 'http://localhost:3004';
process.env.SCAN_SERVICE_URL = process.env.SCAN_SERVICE_URL || 'http://localhost:3005';
process.env.PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';
process.env.NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';
process.env.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';

// API Keys pour les tests
process.env.TICKET_GENERATOR_API_KEY = process.env.TICKET_GENERATOR_API_KEY || 'test-ticket-api-key';
process.env.SCAN_SERVICE_API_KEY = process.env.SCAN_SERVICE_API_KEY || 'test-scan-api-key';
process.env.PAYMENT_SERVICE_API_KEY = process.env.PAYMENT_SERVICE_API_KEY || 'test-payment-api-key';
process.env.NOTIFICATION_SERVICE_API_KEY = process.env.NOTIFICATION_SERVICE_API_KEY || 'test-notification-api-key';

// Timeout plus long pour les tests d'intégration
jest.setTimeout(30000);

// Helper pour vérifier si un service est disponible
global.checkServiceHealth = async (client) => {
  try {
    const result = await client.healthCheck();
    return result.success && result.status === 'healthy';
  } catch (error) {
    return false;
  }
};

// Helper pour attendre qu'un service soit prêt
global.waitForService = async (client, maxAttempts = 10, delay = 1000) => {
  for (let i = 0; i < maxAttempts; i++) {
    if (await global.checkServiceHealth(client)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
};

// Helper pour générer des données de test uniques
global.generateTestData = {
  eventId: () => `test-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  guestId: () => `test-guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  ticketCode: () => `TKT-TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  userId: () => `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  email: () => `test-${Date.now()}@example.com`,
  phone: () => `+336${Math.floor(10000000 + Math.random() * 90000000)}`
};

// Helper pour mesurer le temps de réponse
global.measureResponseTime = async (asyncFn) => {
  const startTime = Date.now();
  const result = await asyncFn();
  const endTime = Date.now();
  return {
    result,
    responseTime: endTime - startTime
  };
};

// Configuration globale pour les tests
global.testConfig = {
  maxResponseTime: 5000, // 5 secondes max pour une réponse
  retryAttempts: 3,
  retryDelay: 1000
};

// Cleanup après tous les tests
afterAll(async () => {
  // Fermer les connexions si nécessaire
  await new Promise(resolve => setTimeout(resolve, 500));
});

console.log('🧪 Orchestration Test Setup Loaded');
console.log(`   Ticket Generator: ${process.env.TICKET_GENERATOR_URL}`);
console.log(`   Scan Validation:  ${process.env.SCAN_SERVICE_URL}`);
console.log(`   Payment Service:  ${process.env.PAYMENT_SERVICE_URL}`);
console.log(`   Notification:     ${process.env.NOTIFICATION_SERVICE_URL}`);
