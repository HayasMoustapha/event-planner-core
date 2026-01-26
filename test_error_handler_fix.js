/**
 * TEST DE VALIDATION - Error Handler corrigé
 * Test pour confirmer que les corrections du ErrorHandler fonctionnent
 */

const { 
  ApplicationError, 
  ValidationError, 
  AuthenticationError, 
  NotFoundError, 
  ConflictError,
  ErrorHandler 
} = require('./src/utils/errors');

class ErrorHandlerTest {
  constructor() {
    this.testResults = [];
  }

  // Simuler une réponse Express
  createMockResponse() {
    let statusCode = 200;
    let responseData = null;
    
    return {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
            return { statusCode, data };
          }
        };
      },
      getStatusCode: () => statusCode,
      getData: () => responseData
    };
  }

  // Simuler une requête Express
  createMockRequest(method = 'GET', path = '/test', ip = '127.0.0.1') {
    return {
      method,
      path,
      ip,
      url: path,
      get: (header) => header === 'User-Agent' ? 'Test-Agent' : null,
      user: { id: 1 }
    };
  }

  // Test 1: Gestion des erreurs ApplicationError
  async testApplicationError() {
    console.log('\n1️⃣ Test ApplicationError:');
    
    const req = this.createMockRequest();
    const res = this.createMockResponse();
    const error = new ApplicationError('Test error', 'test', 'low', 400);
    
    try {
      ErrorHandler.globalHandler(error, req, res);
      const result = res.getData();
      
      const success = result.success === false && 
                     result.error === 'Test error' && 
                     result.category === 'test' &&
                     res.getStatusCode() === 400;
      
      console.log(`✅ ApplicationError: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
      if (success) {
        console.log(`   Status: ${res.getStatusCode()}`);
        console.log(`   Error: ${result.error}`);
        console.log(`   Category: ${result.category}`);
      }
      
      return success;
    } catch (err) {
      console.log(`✅ ApplicationError: ÉCHEC - ${err.message}`);
      return false;
    }
  }

  // Test 2: Gestion des erreurs génériques
  async testGenericError() {
    console.log('\n2️⃣ Test Erreur Générique:');
    
    const req = this.createMockRequest();
    const res = this.createMockResponse();
    const error = new Error('Generic error message');
    
    try {
      ErrorHandler.globalHandler(error, req, res);
      const result = res.getData();
      
      const success = result.success === false && 
                     result.error === 'Generic error message' && 
                     result.category === 'system' &&
                     res.getStatusCode() === 500;
      
      console.log(`✅ Erreur Générique: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
      if (success) {
        console.log(`   Status: ${res.getStatusCode()}`);
        console.log(`   Error: ${result.error}`);
        console.log(`   ErrorId: ${result.errorId}`);
      }
      
      return success;
    } catch (err) {
      console.log(`✅ Erreur Générique: ÉCHEC - ${err.message}`);
      return false;
    }
  }

  // Test 3: Gestion des erreurs de service structurées
  async testStructuredServiceError() {
    console.log('\n3️⃣ Test Erreur Service Structurée:');
    
    const req = this.createMockRequest();
    const res = this.createMockResponse();
    const error = {
      success: false,
      error: 'Service validation failed',
      details: {
        field: 'email',
        message: 'Invalid email format'
      },
      timestamp: new Date().toISOString()
    };
    
    try {
      ErrorHandler.globalHandler(error, req, res);
      const result = res.getData();
      
      const success = result.success === false && 
                     result.error === 'Service validation failed' && 
                     result.details.field === 'email' &&
                     res.getStatusCode() === 400;
      
      console.log(`✅ Erreur Service: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
      if (success) {
        console.log(`   Status: ${res.getStatusCode()}`);
        console.log(`   Error: ${result.error}`);
        console.log(`   Details: ${result.details.field}`);
      }
      
      return success;
    } catch (err) {
      console.log(`✅ Erreur Service: ÉCHEC - ${err.message}`);
      return false;
    }
  }

  // Test 4: Gestion des erreurs JWT
  async testJWTError() {
    console.log('\n4️⃣ Test Erreur JWT:');
    
    const req = this.createMockRequest();
    const res = this.createMockResponse();
    const error = new Error('Invalid token');
    error.name = 'JsonWebTokenError';
    
    try {
      ErrorHandler.globalHandler(error, req, res);
      const result = res.getData();
      
      const success = result.success === false && 
                     result.error === 'Invalid token' && 
                     res.getStatusCode() === 401;
      
      console.log(`✅ Erreur JWT: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
      if (success) {
        console.log(`   Status: ${res.getStatusCode()}`);
        console.log(`   Error: ${result.error}`);
      }
      
      return success;
    } catch (err) {
      console.log(`✅ Erreur JWT: ÉCHEC - ${err.message}`);
      return false;
    }
  }

  // Test 5: Gestion des erreurs PostgreSQL
  async testPostgresError() {
    console.log('\n5️⃣ Test Erreur PostgreSQL:');
    
    const req = this.createMockRequest();
    const res = this.createMockResponse();
    const error = new Error('Duplicate key value violates unique constraint');
    error.code = '23505';
    
    try {
      ErrorHandler.globalHandler(error, req, res);
      const result = res.getData();
      
      const success = result.success === false && 
                     result.error === 'Data integrity violation' && 
                     res.getStatusCode() === 409;
      
      console.log(`✅ Erreur PostgreSQL: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
      if (success) {
        console.log(`   Status: ${res.getStatusCode()}`);
        console.log(`   Error: ${result.error}`);
      }
      
      return success;
    } catch (err) {
      console.log(`✅ Erreur PostgreSQL: ÉCHEC - ${err.message}`);
      return false;
    }
  }

  // Test 6: Gestion des erreurs sans message
  async testErrorWithoutMessage() {
    console.log('\n6️⃣ Test Erreur sans message:');
    
    const req = this.createMockRequest();
    const res = this.createMockResponse();
    const error = new Error(); // Erreur sans message
    
    try {
      ErrorHandler.globalHandler(error, req, res);
      const result = res.getData();
      
      const success = result.success === false && 
                     result.error === 'An unexpected error occurred' && 
                     result.category === 'system' &&
                     res.getStatusCode() === 500;
      
      console.log(`✅ Erreur sans message: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
      if (success) {
        console.log(`   Status: ${res.getStatusCode()}`);
        console.log(`   Error: ${result.error}`);
        console.log(`   ErrorId: ${result.errorId}`);
      }
      
      return success;
    } catch (err) {
      console.log(`✅ Erreur sans message: ÉCHEC - ${err.message}`);
      return false;
    }
  }

  // Test 7: Validation des errorId uniques
  async testErrorIdGeneration() {
    console.log('\n7️⃣ Test Génération ErrorId:');
    
    try {
      const error1 = new ApplicationError('Test 1');
      const error2 = new ApplicationError('Test 2');
      
      const success = error1.errorId && 
                     error2.errorId && 
                     error1.errorId !== error2.errorId;
      
      console.log(`✅ ErrorId uniques: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
      if (success) {
        console.log(`   ErrorId 1: ${error1.errorId}`);
        console.log(`   ErrorId 2: ${error2.errorId}`);
        console.log(`   Différents: ${error1.errorId !== error2.errorId}`);
      }
      
      return success;
    } catch (err) {
      console.log(`✅ ErrorId uniques: ÉCHEC - ${err.message}`);
      return false;
    }
  }

  // Exécuter tous les tests
  async runAllTests() {
    console.log('🔍 TEST DE VALIDATION - ERROR HANDLER CORRIGÉ');
    
    const tests = [
      () => this.testApplicationError(),
      () => this.testGenericError(),
      () => this.testStructuredServiceError(),
      () => this.testJWTError(),
      () => this.testPostgresError(),
      () => this.testErrorWithoutMessage(),
      () => this.testErrorIdGeneration()
    ];
    
    const results = [];
    for (const test of tests) {
      try {
        const result = await test();
        results.push(result);
      } catch (error) {
        console.log(`❌ Test échoué avec exception: ${error.message}`);
        results.push(false);
      }
    }
    
    const successCount = results.filter(r => r).length;
    const totalCount = results.length;
    
    console.log('\n🎯 CONCLUSION:');
    console.log('═════════════════════════════════════════════════');
    console.log(`📊 Résultats: ${successCount}/${totalCount} tests réussis`);
    
    if (successCount === totalCount) {
      console.log('🏆 SUCCÈS : Error Handler corrigé avec succès!');
      console.log('✅ Gestion robuste des ApplicationError');
      console.log('✅ Gestion des erreurs génériques');
      console.log('✅ Gestion des erreurs de service structurées');
      console.log('✅ Gestion des erreurs JWT');
      console.log('✅ Gestion des erreurs PostgreSQL');
      console.log('✅ Gestion des erreurs sans message');
      console.log('✅ Génération d\'errorId uniques');
      console.log('✅ Fallback gracieux en cas d\'échec');
    } else {
      console.log('❌ ÉCHEC : Certains tests ont échoué');
      console.log('⚠️  Vérifiez l\'implémentation');
    }
    
    console.log('═════════════════════════════════════════════════');
    
    return successCount === totalCount;
  }
}

// Exécuter le test
if (require.main === module) {
  const tester = new ErrorHandlerTest();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = ErrorHandlerTest;
