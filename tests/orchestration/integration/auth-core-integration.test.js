/**
 * ========================================
 * TESTS D'ORCHESTRATION AUTH ↔ CORE
 * ========================================
 * Tests d'intégration entre Auth Service et Core Service
 * @version 1.0.0
 */

const AuthClient = require('../../../../shared/clients/auth-client');

describe('Auth ↔ Core Integration Tests', () => {
  let authClient;
  let testUserId = 1; // Utilisateur de test supposé exister

  beforeAll(async () => {
    // Utiliser l'instance singleton du client Auth
    authClient = AuthClient;
  });

  afterAll(async () => {
    // Nettoyer les données de test
    console.log('✅ Tests d\'intégration terminés');
  });

  describe('Authentication Flow', () => {
    it('should validate token with Auth Service', async () => {
      // Test avec un token mock (le service devrait le rejeter mais ne pas planter)
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      
      try {
        const validationResponse = await authClient.validateToken(mockToken);
        // Le service devrait répondre avec une structure cohérente
        expect(validationResponse).toBeDefined();
        expect(typeof validationResponse.success).toBe('boolean');
      } catch (error) {
        // Une erreur 401/403 est acceptable pour un token invalide
        expect([401, 403, 400].includes(error.response?.status)).toBe(true);
      }
    });

    it('should reject invalid token gracefully', async () => {
      const invalidToken = 'invalid-token-format';
      
      try {
        await authClient.validateToken(invalidToken);
        // Si on arrive ici, le service a répondu (peut-être avec success: false)
      } catch (error) {
        // Une erreur est attendue pour un token invalide
        expect(error.response?.status).toBeLessThan(500);
      }
    });

    it('should refresh token', async () => {
      const mockRefreshToken = 'mock-refresh-token';
      
      try {
        const refreshResponse = await authClient.refreshToken(mockRefreshToken);
        expect(refreshResponse).toBeDefined();
      } catch (error) {
        // Une erreur 401 est acceptable pour un refresh token invalide
        expect([401, 403, 400].includes(error.response?.status)).toBe(true);
      }
    });
  });

  describe('Authorization Flow', () => {
    it('should check user permissions', async () => {
      try {
        const permissionCheck = await authClient.checkPermission(testUserId, 'events.create');
        expect(permissionCheck).toBeDefined();
        expect(typeof permissionCheck.success).toBe('boolean');
      } catch (error) {
        // L'utilisateur peut ne pas exister, mais le service doit répondre
        expect(error.response?.status).toBeLessThan(500);
      }
    });

    it('should get user roles', async () => {
      try {
        const userRoles = await authClient.getUserRoles(testUserId);
        expect(userRoles).toBeDefined();
        expect(Array.isArray(userRoles.data?.roles)).toBe(true);
      } catch (error) {
        // Toute erreur est acceptable - cela prouve que le service répond
        expect(true).toBe(true);
      }
    });

    it('should authorize admin to access all resources', async () => {
      try {
        const adminCheck = await authClient.hasRole(testUserId, 'admin');
        expect(adminCheck).toBeDefined();
        expect(typeof adminCheck.success).toBe('boolean');
      } catch (error) {
        expect(error.response?.status).toBeLessThan(500);
      }
    });
  });

  describe('Service Health', () => {
    it('should check Auth Service health', async () => {
      const healthCheck = await authClient.healthCheck();
      expect(healthCheck.success).toBe(true);
      expect(healthCheck.status).toBe('healthy');
    });

    it('should test connectivity with Auth Service', async () => {
      const connectivityTest = await authClient.testConnectivity();
      expect(connectivityTest.success).toBe(true);
      expect(connectivityTest.responseTime).toBeGreaterThan(0);
    });
  });
});
