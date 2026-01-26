/**
 * SCRIPT DE TEST DE VALIDATION DE CONTEXTE
 * Vérifie que les corrections de contexte fonctionnent correctement
 */

const request = require('supertest');
const app = require('./src/server');
const JWTContract = require('../shared/jwt-contract');

// Créer un JWT valide pour les tests
const testUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  status: 'active',
  roles: ['organizer'],
  permissions: ['events.create', 'events.read', 'events.update', 'events.delete']
};

const mockJWT = JWTContract.createToken(testUser, {
  permissions: ['events.create', 'events.read', 'events.update', 'events.delete']
});

console.log('🔑 JWT Test Token:', mockJWT);

async function testContextValidation() {
  console.log('🧪 DÉBUT DES TESTS DE VALIDATION DE CONTEXTE\n');

  // Debug: Vérifier le contenu du token
  const tokenValidation = JWTContract.validateToken(mockJWT);
  console.log('🔍 Token validation result:', JSON.stringify(tokenValidation, null, 2));

  try {
    // Test 1: GET /api/events sans token (doit échouer en 401)
    console.log('1️⃣ Test GET /api/events sans token...');
    const response1 = await request(app)
      .get('/api/events')
      .expect(401);
    console.log('✅ Correctement rejeté (401)');

    // Test 2: GET /api/events avec token valide
    console.log('\n2️⃣ Test GET /api/events avec token valide...');
    const response2 = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${mockJWT}`)
      .expect(200);
    console.log('✅ Accepté avec token valide');

    // Test 3: POST /api/events avec données valides
    console.log('\n3️⃣ Test POST /api/events avec données valides...');
    const eventData = {
      title: 'Test Event',
      description: 'Test Description',
      event_date: '2025-12-31T10:00:00Z',
      location: 'Test Location'
    };
    
    const response3 = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${mockJWT}`)
      .send(eventData)
      .expect(201);
    console.log('✅ Événement créé avec succès');

    // Test 4: GET /api/events/:id avec ID valide
    if (response3.body.data && response3.body.data.id) {
      console.log('\n4️⃣ Test GET /api/events/:id avec ID valide...');
      const response4 = await request(app)
        .get(`/api/events/${response3.body.data.id}`)
        .set('Authorization', `Bearer ${mockJWT}`)
        .expect(200);
      console.log('✅ Événement récupéré avec succès');
    }

    // Test 5: GET /api/events/:id avec ID invalide
    console.log('\n5️⃣ Test GET /api/events/:id avec ID invalide...');
    const response5 = await request(app)
      .get('/api/events/invalid')
      .set('Authorization', `Bearer ${mockJWT}`)
      .expect(400);
    console.log('✅ Correctement rejeté (400)');

    console.log('\n🎉 TOUS LES TESTS PASSÉS AVEC SUCCÈS!');
    console.log('✅ La validation de contexte fonctionne correctement');

  } catch (error) {
    console.error('\n❌ ERREUR PENDANT LES TESTS:');
    console.error(error.message);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
    process.exit(1);
  }
}

// Exécuter les tests
if (require.main === module) {
  testContextValidation()
    .then(() => {
      console.log('\n🏁 Tests terminés');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests échoués:', error);
      process.exit(1);
    });
}

module.exports = { testContextValidation };
