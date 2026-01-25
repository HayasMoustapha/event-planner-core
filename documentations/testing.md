# Testing - Event Planner Core

## Overview

Ce guide couvre la stratégie de testing pour Event Planner Core, incluant les tests unitaires, d'intégration, E2E et de performance.

## Stratégie de Testing

### Pyramide de Tests

```
    /\
   /  \
  / E2E \     Tests End-to-End (10%)
 /______\
/        \   Tests d'intégration (20%)
/__________\
            Tests unitaires (70%)
```

### Types de Tests

1. **Unit Tests** - Tests isolés des fonctions et classes
2. **Integration Tests** - Tests d'interaction entre modules
3. **API Tests** - Tests des endpoints HTTP
4. **E2E Tests** - Tests complets des workflows utilisateur
5. **Performance Tests** - Tests de charge et stress
6. **Security Tests** - Tests de vulnérabilités

---

## Configuration Jest

### Setup Jest

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/**',
    '!src/migrations/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true
};
```

### Setup Global

```javascript
// tests/setup.js
const { database } = require('../src/config/database');

// Configuration globale des tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Nettoyage de la base de données avant chaque test
beforeAll(async () => {
  try {
    await database.query('BEGIN');
    
    // Désactiver les triggers pour les tests
    await database.query('SET session_replication_role = replica;');
  } catch (error) {
    console.error('Test setup failed:', error);
  }
});

afterAll(async () => {
  try {
    await database.query('ROLLBACK');
    await database.end();
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
});

// Nettoyage après chaque test
afterEach(async () => {
  try {
    await database.query('TRUNCATE TABLE system_logs CASCADE');
    await database.query('TRUNCATE TABLE reviews CASCADE');
    await database.query('TRUNCATE TABLE purchases CASCADE');
    await database.query('TRUNCATE TABLE templates CASCADE');
    await database.query('TRUNCATE TABLE designers CASCADE');
    await database.query('TRUNCATE TABLE tickets CASCADE');
    await database.query('TRUNCATE TABLE ticket_types CASCADE');
    await database.query('TRUNCATE TABLE ticket_templates CASCADE');
    await database.query('TRUNCATE TABLE invitations CASCADE');
    await database.query('TRUNCATE TABLE event_guests CASCADE');
    await database.query('TRUNCATE TABLE guests CASCADE');
    await database.query('TRUNCATE TABLE events CASCADE');
    
    // Reset sequences
    await database.query('ALTER SEQUENCE events_id_seq RESTART WITH 1');
    await database.query('ALTER SEQUENCE guests_id_seq RESTART WITH 1');
    await database.query('ALTER SEQUENCE event_guests_id_seq RESTART WITH 1');
  } catch (error) {
    console.error('Test cleanup error:', error);
  }
});

// Mock des services externes
jest.mock('../src/config/clients', () => ({
  authClient: {
    validateToken: jest.fn().mockResolvedValue({
      valid: true,
      user: { id: 1, email: 'test@example.com', roles: ['user'] }
    })
  },
  ticketGeneratorClient: {
    generateTicket: jest.fn().mockResolvedValue({
      success: true,
      data: { ticket_code: 'TEST-123', qr_code_data: 'QR-DATA' }
    })
  }
}));

// Mock Redis pour les tests
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    quit: jest.fn()
  })
}));
```

---

## Tests Unitaires

### Tests Services

```javascript
// tests/unit/events.service.test.js
const EventsService = require('../../src/modules/events/events.service');
const eventsRepository = require('../../src/modules/events/events.repository');

describe('EventsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    test('should create event successfully with valid data', async () => {
      // Arrange
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        event_date: '2024-12-31T23:59:59Z',
        location: 'Test Location'
      };
      
      const expectedEvent = {
        id: 1,
        ...eventData,
        status: 'draft',
        organizer_id: 1
      };

      eventsRepository.create = jest.fn().mockResolvedValue(expectedEvent);

      // Act
      const result = await EventsService.createEvent(eventData, 1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedEvent);
      expect(result.message).toBe('Event created successfully');
      expect(eventsRepository.create).toHaveBeenCalledWith({
        ...eventData,
        organizer_id: 1
      });
    });

    test('should reject event with past date', async () => {
      // Arrange
      const eventData = {
        title: 'Test Event',
        event_date: '2020-01-01T00:00:00Z', // Past date
        location: 'Test Location'
      };

      // Act
      const result = await EventsService.createEvent(eventData, 1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Event date must be in the future');
      expect(eventsRepository.create).not.toHaveBeenCalled();
    });

    test('should handle repository errors gracefully', async () => {
      // Arrange
      const eventData = {
        title: 'Test Event',
        event_date: '2024-12-31T23:59:59Z',
        location: 'Test Location'
      };

      eventsRepository.create = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act
      const result = await EventsService.createEvent(eventData, 1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create event');
    });
  });

  describe('getEventById', () => {
    test('should return event when user is organizer', async () => {
      // Arrange
      const event = {
        id: 1,
        title: 'Test Event',
        organizer_id: 1
      };

      eventsRepository.findById = jest.fn().mockResolvedValue(event);

      // Act
      const result = await EventsService.getEventById(1, 1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(event);
      expect(eventsRepository.findById).toHaveBeenCalledWith(1);
    });

    test('should deny access when user is not organizer', async () => {
      // Arrange
      const event = {
        id: 1,
        title: 'Test Event',
        organizer_id: 2 // Different user
      };

      eventsRepository.findById = jest.fn().mockResolvedValue(event);

      // Act
      const result = await EventsService.getEventById(1, 1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });

    test('should return not found when event does not exist', async () => {
      // Arrange
      eventsRepository.findById = jest.fn().mockResolvedValue(null);

      // Act
      const result = await EventsService.getEventById(999, 1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Event not found');
    });
  });
});
```

### Tests Repository

```javascript
// tests/unit/events.repository.test.js
const eventsRepository = require('../../src/modules/events/events.repository');

describe('EventsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('should insert event with correct fields', async () => {
      // Arrange
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        event_date: '2024-12-31T23:59:59Z',
        location: 'Test Location',
        organizer_id: 1
      };

      const mockResult = {
        rows: [{
          id: 1,
          ...eventData,
          status: 'draft',
          created_at: '2024-01-25T10:00:00Z',
          updated_at: '2024-01-25T10:00:00Z'
        }]
      };

      database.query = jest.fn().mockResolvedValue(mockResult);

      // Act
      const result = await eventsRepository.create(eventData);

      // Assert
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO events'),
        [
          eventData.title,
          eventData.description,
          eventData.event_date,
          eventData.location,
          eventData.organizer_id,
          eventData.organizer_id,
          eventData.organizer_id
        ]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('findByOrganizer', () => {
    test('should return paginated events for organizer', async () => {
      // Arrange
      const mockEvents = [
        { id: 1, title: 'Event 1', organizer_id: 1 },
        { id: 2, title: 'Event 2', organizer_id: 1 }
      ];

      const mockResult = {
        rows: mockEvents
      };

      const mockCountResult = {
        rows: [{ total: 2 }]
      };

      database.query = jest.fn()
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce(mockCountResult);

      // Act
      const result = await eventsRepository.findByOrganizer(1, { page: 1, limit: 20 });

      // Assert
      expect(result.events).toEqual(mockEvents);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      });
    });
  });
});
```

---

## Tests d'API

### Tests Endpoints

```javascript
// tests/api/events.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Events API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Créer un utilisateur de test et obtenir un token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
    userId = loginResponse.body.data.user.id;
  });

  describe('POST /api/events', () => {
    test('should create event with valid data', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        event_date: '2024-12-31T23:59:59Z',
        location: 'Test Location'
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(eventData.title);
      expect(response.body.data.organizer_id).toBe(userId);
    });

    test('should return 400 with invalid data', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '' }) // Invalid: empty title
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Location'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('TOKEN_MISSING');
    });
  });

  describe('GET /api/events/:id', () => {
    let eventId;

    beforeAll(async () => {
      // Créer un événement pour les tests
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Event for Get',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Location'
        });

      eventId = createResponse.body.data.id;
    });

    test('should return event when user is organizer', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(eventId);
    });

    test('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });
});
```

---

## Tests d'Intégration

### Tests Workflows

```javascript
// tests/integration/event-workflow.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Event Workflow Integration', () => {
  let authToken;
  let userId;
  let eventId;

  beforeAll(async () => {
    // Setup authentication
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
    userId = loginResponse.body.data.user.id;
  });

  describe('Complete Event Lifecycle', () => {
    test('should create event -> add guests -> generate tickets -> check-in guests', async () => {
      // 1. Créer un événement
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Test Event',
          description: 'Event for integration testing',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Location'
        })
        .expect(201);

      eventId = eventResponse.body.data.id;
      expect(eventResponse.body.success).toBe(true);

      // 2. Créer un type de billet
      const ticketTypeResponse = await request(app)
        .post('/api/tickets/types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_id: eventId,
          name: 'VIP Ticket',
          type: 'paid',
          quantity: 100,
          price: 99.99,
          currency: 'EUR'
        })
        .expect(201);

      const ticketTypeId = ticketTypeResponse.body.data.id;

      // 3. Ajouter des invités
      const guestResponse = await request(app)
        .post('/api/guests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+33612345678'
        })
        .expect(201);

      const guestId = guestResponse.body.data.id;

      // 4. Ajouter l'invité à l'événement
      await request(app)
        .post(`/api/events/${eventId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          guest_id: guestId,
          invitation_code: 'INV-TEST-123'
        })
        .expect(201);

      // 5. Générer un billet
      const ticketResponse = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticket_type_id: ticketTypeId,
          event_guest_id: 1, // ID de l'event_guest
          price: 99.99,
          currency: 'EUR'
        })
        .expect(201);

      const ticketCode = ticketResponse.body.data.ticket_code;

      // 6. Check-in l'invité
      const checkinResponse = await request(app)
        .post('/api/guests/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invitation_code: 'INV-TEST-123'
        })
        .expect(200);

      expect(checkinResponse.body.success).toBe(true);
      expect(checkinResponse.body.data.is_present).toBe(true);

      // 7. Vérifier les statistiques
      const statsResponse = await request(app)
        .get(`/api/events/${eventId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.total_guests).toBe(1);
      expect(statsResponse.body.data.checked_in_guests).toBe(1);
    });
  });
});
```

---

## Tests de Performance

### Tests de Charge

```javascript
// tests/performance/load.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Performance Tests', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
  });

  describe('API Response Times', () => {
    test('GET /api/events should respond within 200ms', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - start;
      expect(responseTime).toBeLessThan(200);
    });

    test('POST /api/events should respond within 500ms', async () => {
      const start = Date.now();

      await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Performance Test Event',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Location'
        })
        .expect(201);

      const responseTime = Date.now() - start;
      expect(responseTime).toBeLessThan(500);
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle 50 concurrent requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/events')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const start = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - start;

      // Toutes les réponses devraient être réussies
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Le temps total devrait être raisonnable
      expect(totalTime).toBeLessThan(5000);
    });
  });
});
```

---

## Tests de Sécurité

### Tests Vulnérabilités

```javascript
// tests/security/security.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Security Tests', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
  });

  describe('Input Validation', () => {
    test('should reject SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE events; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users --",
        "'; INSERT INTO events (title) VALUES ('hacked'); --"
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: input,
            event_date: '2024-12-31T23:59:59Z',
            location: 'Test Location'
          });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('SECURITY_VIOLATION');
      }
    });

    test('should reject XSS attempts', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
        '<iframe src="javascript:alert(\'xss\')"></iframe>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: payload,
            event_date: '2024-12-31T23:59:59Z',
            location: 'Test Location'
          });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('SECURITY_VIOLATION');
      }
    });
  });

  describe('Authentication & Authorization', () => {
    test('should reject requests without valid token', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('TOKEN_MISSING');
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });

    test('should prevent access to other users events', async () => {
      // Créer un événement avec l'utilisateur 1
      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'User 1 Event',
          event_date: '2024-12-31T23:59:59Z',
          location: 'Test Location'
        })
        .expect(201);

      const eventId = createResponse.body.data.id;

      // Essayer d'accéder avec un token d'utilisateur différent
      const response = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', 'Bearer different-user-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Rate Limiting', () => {
    test('should limit requests from same IP', async () => {
      const promises = [];
      
      // Faire beaucoup de requêtes rapidement
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app)
            .get('/api/events')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.allSettled(promises);
      
      // Certaines requêtes devraient être limitées
      const rateLimitedResponses = responses.filter(
        response => response.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Scripts de Test

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:api": "jest --testPathPattern=api",
    "test:security": "jest --testPathPattern=security",
    "test:performance": "jest --testPathPattern=performance",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

### GitHub Actions CI

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: event_planner_core_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm run test:ci
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: event_planner_core_test
        DB_USER: postgres
        DB_PASSWORD: postgres

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

---

## Configuration Coverage

### Ignorer les Fichiers

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/**',
    '!src/migrations/**',
    '!src/server.js',
    '!src/bootstrap.js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/'
  ]
};
```

### Rapports de Couverture

```bash
# Générer un rapport de couverture détaillé
npm run test:coverage

# Voir le rapport HTML
open coverage/lcov-report/index.html

# Filtrer la couverture par module
npm test -- --coverageReporters=text --collectCoverageFrom=src/modules/events/**
```

---

## Checklist de Testing

### Tests Unitaires
- [ ] Tous les services testés
- [ ] Tous les repositories testés
- [ ] Utilitaires testés
- [ ] Couverture > 80%

### Tests d'API
- [ ] Tous les endpoints testés
- [ ] Codes de statut validés
- [ ] Validation entrées testée
- [ ] Authentification testée

### Tests d'Intégration
- [ ] Workflows métier testés
- [] Interactions modules testées
- [] Base de données intégrée
- [ ] Services externes mockés

### Tests de Sécurité
- [ ] Injection SQL testée
- [ ] XSS testé
- [ ] CSRF testé
- [ ] Rate limiting testé

### Tests de Performance
- [ ] Temps de réponse mesurés
- [ ] Tests de charge effectués
- [ ] Tests concurrents
- [ ] Tests de stress

### CI/CD
- [ ] Tests automatisés dans CI
- [ ] Rapports de couverture générés
- [ ] Notifications d'échec
- [ ] Déploiement conditionné

Pour toute question sur les tests, contactez l'équipe QA ou consultez le guide de dépannage.
