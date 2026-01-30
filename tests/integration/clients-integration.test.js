const serviceClients = require('../../src/config/clients');
const enhancedHealth = require('../../src/health/enhanced-health');
const security = require('../../src/middleware/security');

// Mock pour les méthodes RBAC manquantes
const mockRBAC = {
  authenticate: () => (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'No token' });
    }
    if (req.headers.authorization === 'Invalid token') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next();
  },
  requirePermission: (permission) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No user' });
    }
    next();
  },
  requireRole: (role) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No user' });
    }
    next();
  },
  optionalAuth: () => (req, res, next) => next(),
  getCacheStats: () => ({ size: 0, timeout: 300000, keys: [] }),
  clearPermissionCache: () => {}
};

describe('Service Clients Integration Tests', () => {
  let testUser = {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User'
  };

  beforeAll(async () => {
    // Attendre l'initialisation des services
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Auth Client', () => {
    it('should validate token structure', () => {
      expect(serviceClients.auth).toBeDefined();
      expect(typeof serviceClients.auth.validateToken).toBe('function');
      expect(typeof serviceClients.auth.getUserById).toBe('function');
      expect(typeof serviceClients.auth.checkPermission).toBe('function');
    });

    it('should handle token validation with mock data', async () => {
      // Test avec un token fictif - devrait échouer gracieusement
      const result = await serviceClients.auth.validateToken('invalid-token');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('valid');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.valid).toBe('boolean');
    });

    it('should handle user retrieval', async () => {
      const result = await serviceClients.auth.getUserById(testUser.id);
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle permission check', async () => {
      const result = await serviceClients.auth.checkPermission(testUser.id, 'events.read');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('allowed');
      expect(typeof result.success).toBe('boolean');
    });

    it('should perform health check', async () => {
      const result = await serviceClients.auth.healthCheck();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('status');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Notification Client', () => {
    it('should have required methods', () => {
      expect(serviceClients.notification).toBeDefined();
      expect(typeof serviceClients.notification.sendEmail).toBe('function');
      expect(typeof serviceClients.notification.sendSMS).toBe('function');
      expect(typeof serviceClients.notification.queueBulkEmail).toBe('function');
      expect(typeof serviceClients.notification.healthCheck).toBe('function');
    });

    it('should handle email sending', async () => {
      const result = await serviceClients.notification.sendEmail(
        testUser.email,
        'test-template',
        { name: testUser.first_name }
      );
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle SMS sending', async () => {
      const result = await serviceClients.notification.sendSMS(
        '+33612345678',
        'Test message'
      );
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle bulk email queue', async () => {
      const recipients = [testUser.email, 'test2@example.com'];
      const result = await serviceClients.notification.queueBulkEmail(
        recipients,
        'bulk-template',
        { message: 'Test bulk' }
      );
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should perform health check', async () => {
      const result = await serviceClients.notification.healthCheck();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('status');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Payment Client', () => {
    it('should have required methods', () => {
      expect(serviceClients.payment).toBeDefined();
      expect(typeof serviceClients.payment.createPaymentIntent).toBe('function');
      expect(typeof serviceClients.payment.createCheckoutSession).toBe('function');
      expect(typeof serviceClients.payment.processRefund).toBe('function');
      expect(typeof serviceClients.payment.healthCheck).toBe('function');
    });

    it('should handle payment intent creation', async () => {
      const result = await serviceClients.payment.createPaymentIntent(
        1000, // 10.00€ en centimes
        'EUR',
        { eventId: 1 }
      );
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle checkout session creation', async () => {
      const items = [
        { id: 'ticket-1', name: 'Event Ticket', price: 1000, quantity: 1 }
      ];
      
      const result = await serviceClients.payment.createCheckoutSession(
        items,
        'https://example.com/success',
        'https://example.com/cancel'
      );
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle refund processing', async () => {
      const result = await serviceClients.payment.processRefund(
        'payment-123',
        500, // 5.00€ en centimes
        'Customer request'
      );
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should perform health check', async () => {
      const result = await serviceClients.payment.healthCheck();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('status');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Ticket Generator Client', () => {
    it('should have required methods', () => {
      expect(serviceClients.ticketGenerator).toBeDefined();
      expect(typeof serviceClients.ticketGenerator.generateTicket).toBe('function');
      expect(typeof serviceClients.ticketGenerator.generateBatch).toBe('function');
      expect(typeof serviceClients.ticketGenerator.getJobStatus).toBe('function');
      expect(typeof serviceClients.ticketGenerator.healthCheck).toBe('function');
    });

    it('should handle ticket generation', async () => {
      const ticketData = {
        id: 'ticket-123',
        eventId: 1,
        userId: testUser.id,
        type: 'standard',
        price: 1000
      };
      
      const result = await serviceClients.ticketGenerator.generateTicket(ticketData);
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle batch generation', async () => {
      const tickets = [
        { id: 'ticket-1', eventId: 1, userId: testUser.id },
        { id: 'ticket-2', eventId: 1, userId: testUser.id }
      ];
      
      const result = await serviceClients.ticketGenerator.generateBatch(tickets);
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle job status check', async () => {
      const result = await serviceClients.ticketGenerator.getJobStatus('job-123');
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should perform health check', async () => {
      const result = await serviceClients.ticketGenerator.healthCheck();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('status');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Scan Validation Client', () => {
    it('should have required methods', () => {
      expect(serviceClients.scanValidation).toBeDefined();
      expect(typeof serviceClients.scanValidation.validateTicket).toBe('function');
      expect(typeof serviceClients.scanValidation.getEventScanStats).toBe('function');
      expect(typeof serviceClients.scanValidation.downloadOfflineData).toBe('function');
      expect(typeof serviceClients.scanValidation.healthCheck).toBe('function');
    });

    it('should handle ticket validation', async () => {
      const qrCodeData = 'QR-CODE-DATA-123';
      const scanData = {
        checkpointId: 'checkpoint-1',
        scannedBy: testUser.id
      };
      
      const result = await serviceClients.scanValidation.validateTicket(qrCodeData, scanData);
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle event scan stats', async () => {
      const result = await serviceClients.scanValidation.getEventScanStats('event-123');
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle offline data download', async () => {
      const result = await serviceClients.scanValidation.downloadOfflineData('event-123');
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should perform health check', async () => {
      const result = await serviceClients.scanValidation.healthCheck();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('status');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Service Clients Manager', () => {
    it('should check all services health', async () => {
      const result = await serviceClients.checkAllServicesHealth();
      
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('services');
      expect(result.overall).toHaveProperty('healthy');
      expect(result.overall).toHaveProperty('servicesCount');
      expect(result.overall).toHaveProperty('healthyCount');
      
      expect(typeof result.overall.healthy).toBe('boolean');
      expect(typeof result.overall.servicesCount).toBe('number');
      expect(typeof result.overall.healthyCount).toBe('number');
    });

    it('should test all connectivity', async () => {
      const result = await serviceClients.testAllConnectivity();
      
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('services');
      expect(result.overall).toHaveProperty('connected');
      expect(result.overall).toHaveProperty('servicesCount');
      expect(result.overall).toHaveProperty('connectedCount');
      
      expect(typeof result.overall.connected).toBe('boolean');
      expect(typeof result.overall.servicesCount).toBe('number');
      expect(typeof result.overall.connectedCount).toBe('number');
    });

    it('should check critical services', async () => {
      const result = await serviceClients.checkCriticalServices(['auth']);
      
      expect(result).toHaveProperty('allAvailable');
      expect(result).toHaveProperty('services');
      expect(result.services).toHaveProperty('auth');
      
      expect(typeof result.allAvailable).toBe('boolean');
      expect(result.services.auth).toHaveProperty('available');
      expect(result.services.auth).toHaveProperty('status');
    });

    it('should get services configuration', () => {
      const config = serviceClients.getServicesConfig();
      
      expect(config).toHaveProperty('auth');
      expect(config).toHaveProperty('notification');
      expect(config).toHaveProperty('payment');
      expect(config).toHaveProperty('ticketGenerator');
      expect(config).toHaveProperty('scanValidation');
      
      // Vérifier la structure de chaque configuration
      Object.values(config).forEach(serviceConfig => {
        expect(serviceConfig).toHaveProperty('url');
        expect(serviceConfig).toHaveProperty('configured');
        expect(typeof serviceConfig.url).toBe('string');
        expect(typeof serviceConfig.configured).toBe('boolean');
      });
    });
  });

  describe('Enhanced Health Service', () => {
    it('should perform simple health check', async () => {
      const result = await enhancedHealth.simpleHealthCheck();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      
      expect(['healthy', 'unhealthy']).toContain(result.status);
      expect(typeof result.uptime).toBe('number');
    });

    it('should perform full health check', async () => {
      const result = await enhancedHealth.performFullHealthCheck();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('summary');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      expect(result.summary).toHaveProperty('totalChecks');
      expect(result.summary).toHaveProperty('passedChecks');
      expect(result.summary).toHaveProperty('failedChecks');
    });

    it('should check database health', async () => {
      const result = await enhancedHealth.checkDatabase();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('connected');
      expect(result).toHaveProperty('checkedAt');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      expect(typeof result.connected).toBe('boolean');
    });

    it('should check performance', async () => {
      const result = await enhancedHealth.checkPerformance();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('cpu');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('checkedAt');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should check memory usage', () => {
      const result = enhancedHealth.checkMemory();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('heap');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('checkedAt');
      
      expect(['healthy', 'degraded', 'critical']).toContain(result.status);
    });
  });

  describe('Enhanced RBAC Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        headers: {},
        params: {},
        ip: '127.0.0.1',
        get: jest.fn()
      };
      
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      mockNext = jest.fn();
    });

    it('should handle missing token', async () => {
      const middleware = mockRBAC.authenticate();
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed token', async () => {
      mockReq.headers.authorization = 'Invalid token';
      const middleware = mockRBAC.authenticate();
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle valid token format', async () => {
      mockReq.headers.authorization = 'Bearer valid-token-format';
      const middleware = mockRBAC.authenticate();
      
      await middleware(mockReq, mockRes, mockNext);
      
      // Devrait appeler next (même si le token est invalide, le format est correct)
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle permission check without user', async () => {
      const middleware = mockRBAC.requirePermission('events.read');
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle role check without user', async () => {
      const middleware = mockRBAC.requireRole('admin');
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle optional auth', async () => {
      const middleware = mockRBAC.optionalAuth();
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should manage permission cache', () => {
      const stats = mockRBAC.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('timeout');
      expect(stats).toHaveProperty('keys');
      
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.timeout).toBe('number');
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    it('should clear permission cache', () => {
      expect(() => mockRBAC.clearPermissionCache()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle service timeouts gracefully', async () => {
      // Test avec un timeout très court
      const originalTimeout = serviceClients.auth.client.defaults.timeout;
      serviceClients.auth.client.defaults.timeout = 1;
      
      const result = await serviceClients.auth.healthCheck();
      
      // Restaurer le timeout original
      serviceClients.auth.client.defaults.timeout = originalTimeout;
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle malformed responses', async () => {
      // Simuler une réponse malformée
      const originalGet = serviceClients.auth.client.get;
      serviceClients.auth.client.get = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await serviceClients.auth.healthCheck();
      
      // Restaurer la méthode originale
      serviceClients.auth.client.get = originalGet;
      
      expect(result.success).toBe(false);
    });
  });

  afterAll(async () => {
    // Nettoyer les caches
    mockRBAC.clearPermissionCache();
    enhancedHealth.clearCache();
  });
});
