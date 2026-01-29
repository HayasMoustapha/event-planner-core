/**
 * TEST SIMPLE D'AUTHENTIFICATION
 * Vérifie si l'authentification fonctionne avec une route de base
 */

const axios = require('axios');
require('dotenv').config();

const CORE_BASE_URL = 'http://localhost:3001';
const SERVICE_TOKEN = process.env.SHARED_SERVICE_TOKEN || 'shared-service-token-abcdef12345678901234567890';

async function testAuth() {
  console.log('🧪 TEST SIMPLE D\'AUTHENTIFICATION');
  console.log('==================================');
  
  // Test 1: Sans authentification
  console.log('\n📍 Test 1: Route sans authentification...');
  try {
    const response = await axios.get(`${CORE_BASE_URL}/health`);
    console.log('✅ Health endpoint accessible sans auth:', response.status);
  } catch (error) {
    console.log('❌ Health endpoint erreur:', error.message);
  }
  
  // Test 2: Route protégée sans authentification
  console.log('\n📍 Test 2: Route protégée sans authentification...');
  try {
    const response = await axios.get(`${CORE_BASE_URL}/api/marketplace/payments/health`);
    console.log('❌ Route protégée accessible sans auth (ERREUR):', response.status);
  } catch (error) {
    console.log('✅ Route protégée refusée sans auth:', error.response?.status, error.response?.data?.error);
  }
  
  // Test 3: Route protégée avec authentification
  console.log('\n📍 Test 3: Route protégée avec authentification...');
  try {
    const response = await axios.get(`${CORE_BASE_URL}/api/marketplace/payments/health`, {
      headers: {
        'x-service-token': SERVICE_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Route protégée accessible avec auth:', response.status);
    console.log('📋 Données:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Route protégée refusée avec auth:', error.response?.status, error.response?.data?.error);
    console.log('📋 Token utilisé:', SERVICE_TOKEN);
  }
  
  // Test 4: Vérifier les tokens disponibles
  console.log('\n📍 Test 4: Tokens disponibles...');
  console.log('📋 SHARED_SERVICE_TOKEN:', process.env.SHARED_SERVICE_TOKEN ? '✅ Défini' : '❌ Non défini');
  console.log('📋 SERVICE_TOKEN:', process.env.SERVICE_TOKEN ? '✅ Défini' : '❌ Non défini');
  console.log('📋 JWT_SECRET:', process.env.JWT_SECRET ? '✅ Défini' : '❌ Non défini');
}

testAuth().catch(console.error);
