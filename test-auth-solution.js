#!/usr/bin/env node

/**
 * SCRIPT DE TEST COMPLET - SOLUTION D'AUTHENTIFICATION ROBUSTE
 * 
 * Ce script teste :
 * 1. La génération du JWT_SECRET unifié
 * 2. La configuration des deux services
 * 3. L'authentification par token JWT
 * 4. L'authentification par token de service
 * 5. La communication inter-services
 */

const axios = require('axios');

// Configuration
const AUTH_SERVICE_URL = 'http://localhost:3000';
const CORE_SERVICE_URL = 'http://localhost:3001';

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n🔍 ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue');
}

// Tests
async function testHealthServices() {
  logSection('TEST DE SANTÉ DES SERVICES');
  
  try {
    // Test Auth Service
    const authResponse = await axios.get(`${AUTH_SERVICE_URL}/health`, { timeout: 5000 });
    logSuccess(`Auth Service: ${authResponse.data.status}`);
  } catch (error) {
    logError(`Auth Service: ${error.message}`);
    return false;
  }
  
  try {
    // Test Core Service
    const coreResponse = await axios.get(`${CORE_SERVICE_URL}/health`, { timeout: 5000 });
    logSuccess(`Core Service: ${coreResponse.data.status}`);
  } catch (error) {
    logError(`Core Service: ${error.message}`);
    return false;
  }
  
  return true;
}

async function testAuthentication() {
  logSection('TEST D\'AUTHENTIFICATION JWT');
  
  try {
    // Test login
    const loginResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
      email: 'admin@eventplanner.com',
      password: 'Admin123!'
    }, { timeout: 5000 });
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.data.token;
      logSuccess('Login réussi');
      logInfo(`Token: ${token.substring(0, 50)}...`);
      return token;
    } else {
      logError('Login échoué');
      return null;
    }
  } catch (error) {
    logError(`Login error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testServiceToken() {
  logSection('TEST D\'AUTHENTIFICATION PAR TOKEN DE SERVICE');
  
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/internal/auth/users`, {
      headers: {
        'X-Service-Token': 'shared-service-token-abcdef12345678901234567890'
      },
      timeout: 5000
    });
    
    if (response.data.success) {
      logSuccess('Token de service valide');
      logInfo(`Utilisateurs récupérés: ${response.data.data.data.length}`);
      return true;
    } else {
      logError('Token de service invalide');
      return false;
    }
  } catch (error) {
    logError(`Service token error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testCoreServiceAuth(token) {
  logSection('TEST D\'AUTHENTIFICATION CORE SERVICE');
  
  if (!token) {
    logError('Pas de token JWT disponible');
    return false;
  }
  
  try {
    const response = await axios.get(`${CORE_SERVICE_URL}/api/events?page=1&limit=20`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    });
    
    if (response.data.success) {
      logSuccess('Core Service authentifié avec JWT');
      logInfo(`Events récupérés: ${response.data.data?.length || 0}`);
      return true;
    } else {
      logError('Core Service: réponse invalide');
      return false;
    }
  } catch (error) {
    logError(`Core Service auth error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testInterServiceCommunication() {
  logSection('TEST DE COMMUNICATION INTER-SERVICES');
  
  try {
    // Simuler un appel depuis event-planner-core vers event-planner-auth
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/internal/auth/users`, {
      headers: {
        'X-Service-Token': 'shared-service-token-abcdef12345678901234567890',
        'User-Agent': 'event-planner-core/1.0.0'
      },
      timeout: 5000
    });
    
    if (response.data.success) {
      logSuccess('Communication inter-services réussie');
      logInfo(`Données reçues: ${JSON.stringify(response.data.data).substring(0, 100)}...`);
      return true;
    } else {
      logError('Communication inter-services échouée');
      return false;
    }
  } catch (error) {
    logError(`Inter-service error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test principal
async function runTests() {
  log('🚀 DÉMARRAGE DES TESTS D\'AUTHENTIFICATION ROBUSTE', 'bright');
  log('='.repeat(60), 'bright');
  
  const results = {
    health: await testHealthServices(),
    serviceToken: await testServiceToken(),
    jwtAuth: false,
    coreAuth: false,
    interService: false
  };
  
  if (results.health) {
    const jwtToken = await testAuthentication();
    results.jwtAuth = !!jwtToken;
    
    if (results.jwtAuth) {
      results.coreAuth = await testCoreServiceAuth(jwtToken);
    }
    
    results.interService = await testInterServiceCommunication();
  }
  
  // Résultats finaux
  logSection('RÉSULTATS FINAUX');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  log(`Tests passés: ${passedTests}/${totalTests}`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    logSuccess('🎉 TOUS LES TESTS RÉUSSIS - SOLUTION ROBUSTE FONCTIONNELLE');
  } else {
    logWarning('⚠️ CERTAINS TESTS ONT ÉCHOUÉ - VÉRIFIER LA CONFIGURATION');
  }
  
  // Détails des résultats
  Object.entries(results).forEach(([test, passed]) => {
    log(`${test}: ${passed ? '✅' : '❌'}`, passed ? 'green' : 'red');
  });
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// Démarrer les tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
