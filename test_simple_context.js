/**
 * TEST SIMPLE DE VALIDATION DE CONTEXTE
 * Test unitaire sans démarrer le serveur complet
 */

const JWTContract = require('../shared/jwt-contract');
const { AuthMiddleware } = require('../shared');

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

async function testSimpleContext() {
  console.log('🧪 TEST SIMPLE DE VALIDATION DE CONTEXTE\n');

  try {
    // Test 1: Valider le token
    console.log('1️⃣ Test validation JWT...');
    const tokenValidation = JWTContract.validateToken(mockJWT);
    console.log('✅ Token valide:', tokenValidation.valid);
    console.log('👤 User ID:', tokenValidation.user.id);
    console.log('📧 Email:', tokenValidation.user.email);

    // Test 2: Simuler une requête avec middleware
    console.log('\n2️⃣ Test middleware d\'authentification...');
    
    const mockReq = {
      headers: {
        authorization: `Bearer ${mockJWT}`
      }
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Response ${code}:`, data);
          throw new Error(`Middleware returned ${code}`);
        }
      })
    };

    let middlewareCalled = false;
    const mockNext = () => {
      middlewareCalled = true;
      console.log('✅ Middleware next() appelé');
    };

    // Tester le middleware
    await new Promise((resolve, reject) => {
      const middleware = AuthMiddleware.authenticate();
      middleware(mockReq, mockRes, (error) => {
        if (error) {
          reject(error);
        } else {
          mockNext();
          resolve();
        }
      });
    });

    if (middlewareCalled) {
      console.log('👤 req.user:', {
        id: mockReq.user.id,
        email: mockReq.user.email,
        roles: mockReq.user.roles,
        permissions: mockReq.user.permissions
      });
    }

    console.log('\n🎉 TESTS PASSÉS AVEC SUCCÈS!');
    console.log('✅ La validation de contexte fonctionne correctement');

  } catch (error) {
    console.error('\n❌ ERREUR PENDANT LES TESTS:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter les tests
if (require.main === module) {
  testSimpleContext()
    .then(() => {
      console.log('\n🏁 Tests terminés');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests échoués:', error);
      process.exit(1);
    });
}

module.exports = { testSimpleContext };
