# Guide Développeur - Event Planner Core

## Overview

Ce guide est destiné aux développeurs qui souhaitent contribuer au code d'Event Planner Core ou comprendre l'architecture interne du service.

## Architecture du Code

### Structure des Répertoires

```
src/
├── app.js                    # Point d'entrée principal
├── server.js                 # Configuration du serveur HTTP
├── bootstrap.js              # Initialisation de l'application
├── config/                   # Configuration et validation
│   ├── database.js          # Configuration base de données
│   ├── clients.js           # Clients HTTP services externes
│   └── validation.js        # Validation configuration
├── middleware/               # Middlewares Express
│   ├── auth.js              # Authentification JWT
│   ├── security.js          # Sécurité avancée
│   ├── metrics.js           # Métriques Prometheus
│   └── rate-limit.js        # Rate limiting
├── modules/                  # Modules métier
│   ├── events/              # Gestion événements
│   ├── guests/              # Gestion participants
│   ├── tickets/             # Gestion billets
│   ├── marketplace/         # Marketplace templates
│   └── admin/               # Administration
├── health/                   # Health checks
├── security/                 # Services sécurité
├── shared/                   # Utilitaires partagés
├── utils/                    # Utilitaires généraux
│   ├── errors.js            # Gestion erreurs
│   ├── response.js          # Formatage réponses
│   └── logger.js            # Logging
└── services/                 # Services externes
```

### Pattern Architecture

Chaque module métier suit la même structure :

```
modules/[module]/
├── [module].controller.js   # Contrôleur Express
├── [module].service.js      # Logique métier
├── [module].repository.js   # Accès données
└── [module].routes.js       # Définition routes
```

## Conventions de Code

### 1. Nommage

- **Fichiers**: kebab-case (`events.controller.js`)
- **Classes**: PascalCase (`EventsController`)
- **Fonctions/Méthodes**: camelCase (`createEvent`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Variables**: camelCase (`eventData`)

### 2. Structure des Classes

```javascript
class EventsService {
  async createEvent(eventData, userId) {
    try {
      // Validation des entrées
      if (!eventData.title) {
        throw new ValidationError('Title is required');
      }

      // Logique métier
      const event = await this.eventsRepository.create(eventData);

      // Retour standardisé
      return {
        success: true,
        data: event,
        message: 'Event created successfully'
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        success: false,
        error: error.message || 'Failed to create event'
      };
    }
  }
}
```

### 3. Gestion des Erreurs

Utiliser les classes d'erreur personnalisées :

```javascript
const { ValidationError, NotFoundError, AuthorizationError } = require('../../utils/errors');

// Validation error
if (!title) {
  throw new ValidationError('Title is required', { field: 'title' });
}

// Not found error
if (!event) {
  throw new NotFoundError('Event');
}

// Authorization error
if (event.organizer_id !== userId) {
  throw new AuthorizationError('Access denied');
}
```

### 4. Format des Réponses

Toutes les réponses API doivent suivre ce format :

```javascript
// Succès
res.status(200).json({
  success: true,
  data: eventData,
  message: 'Event retrieved successfully'
});

// Erreur
res.status(400).json({
  success: false,
  error: 'Validation error',
  details: { field: 'title', message: 'Title is required' }
});
```

## Sécurité

### 1. Validation des Entrées

Toutes les entrées utilisateur doivent être validées :

```javascript
// Dans le contrôleur
const { title, description, event_date, location } = req.body;

if (!title || typeof title !== 'string' || title.trim().length < 3) {
  return res.status(400).json(validationErrorResponse({
    field: 'title',
    message: 'Le titre est requis et doit contenir au moins 3 caractères'
  }));
}

// Détection XSS
if (title.includes('<script>') || title.includes('javascript:')) {
  recordSecurityEvent('xss_attempt', 'high');
  return res.status(403).json(errorResponse('XSS attempt detected'));
}
```

### 2. Protection SQL Injection

Utiliser toujours des requêtes paramétrées :

```javascript
// ❌ NEVER DO THIS
const query = `SELECT * FROM events WHERE title = '${title}'`;

// ✅ ALWAYS DO THIS
const query = 'SELECT * FROM events WHERE title = $1';
const result = await database.query(query, [title]);
```

### 3. Permissions

Vérifier systématiquement les permissions :

```javascript
// Vérifier que l'utilisateur est le propriétaire
if (event.organizer_id !== req.user.id) {
  recordSecurityEvent('unauthorized_access', 'high');
  return res.status(403).json(forbiddenResponse('Access denied'));
}

// Pour les admins, vérifier le rôle
if (!req.user.roles || !req.user.roles.includes('admin')) {
  throw new AuthorizationError('Admin access required');
}
```

## Base de Données

### 1. Connexion

La connexion est gérée par le pool PostgreSQL :

```javascript
const { database } = require('../config/database');

async function getEvent(id) {
  const query = 'SELECT * FROM events WHERE id = $1';
  const result = await database.query(query, [id]);
  return result.rows[0];
}
```

### 2. Transactions

Pour les opérations complexes :

```javascript
async function createEventWithGuests(eventData, guestsData, userId) {
  const client = await database.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Créer l'événement
    const event = await createEvent(client, eventData, userId);
    
    // Ajouter les invités
    for (const guestData of guestsData) {
      await addGuestToEvent(client, event.id, guestData, userId);
    }
    
    await client.query('COMMIT');
    return event;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 3. Migrations

Les migrations sont gérées dans `database/migrations/` :

```sql
-- 001_initial_schema.sql
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    organizer_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Testing

### 1. Structure des Tests

```
tests/
├── setup.js                 # Configuration Jest
├── integration/             # Tests d'intégration
├── events.test.js          # Tests module Events
├── guests.test.js          # Tests module Guests
├── tickets.test.js         # Tests module Tickets
├── marketplace.test.js      # Tests module Marketplace
├── admin.test.js           # Tests module Admin
└── error-handling.test.js  # Tests gestion erreurs
```

### 2. Écriture des Tests

```javascript
describe('Events API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Setup: créer utilisateur et obtenir token
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
        .send({ title: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });
  });
});
```

### 3. Mock Services

Pour les services externes :

```javascript
// __mocks__/auth-service.js
module.exports = {
  validateToken: jest.fn().mockResolvedValue({
    valid: true,
    user: { id: 1, email: 'test@example.com', roles: ['user'] }
  })
};
```

## Performance

### 1. Database Queries

- Utiliser des index appropriés
- Éviter N+1 queries avec JOINs
- Utiliser LIMIT pour les listes

```javascript
// ❌ N+1 query
const events = await db.query('SELECT * FROM events');
for (const event of events) {
  event.guests = await db.query('SELECT * FROM guests WHERE event_id = $1', [event.id]);
}

// ✅ Single query with JOIN
const events = await db.query(`
  SELECT e.*, COUNT(eg.id) as guest_count 
  FROM events e 
  LEFT JOIN event_guests eg ON e.id = eg.event_id 
  GROUP BY e.id
`);
```

### 2. Caching

Utiliser Redis pour le caching :

```javascript
const redis = require('../config/redis');

async function getEvent(id) {
  const cacheKey = `event:${id}`;
  
  // Vérifier le cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Récupérer depuis la BDD
  const event = await database.query('SELECT * FROM events WHERE id = $1', [id]);
  
  // Mettre en cache (5 minutes)
  await redis.setex(cacheKey, 300, JSON.stringify(event.rows[0]));
  
  return event.rows[0];
}
```

### 3. Connection Pooling

Configurer le pool de connexions :

```javascript
// config/database.js
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Logging

### 1. Structured Logging

```javascript
const logger = require('../utils/logger');

logger.info('Event created', {
  eventId: event.id,
  organizerId: userId,
  title: event.title,
  timestamp: new Date().toISOString()
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  query: query,
  timestamp: new Date().toISOString()
});
```

### 2. Security Events

```javascript
const { recordSecurityEvent } = require('../middleware/metrics');

recordSecurityEvent('sql_injection_attempt', 'critical', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  input: suspiciousInput,
  userId: req.user?.id
});
```

## Monitoring

### 1. Métriques Custom

```javascript
const { registerCounter, registerHistogram } = require('../middleware/metrics');

const eventCreationCounter = registerCounter('events_created_total', 'Total events created');
const eventCreationDuration = registerHistogram('event_creation_duration_seconds', 'Event creation duration');

async function createEvent(eventData, userId) {
  const endTimer = eventCreationDuration.startTimer();
  
  try {
    const event = await eventsRepository.create(eventData, userId);
    eventCreationCounter.inc();
    return event;
  } finally {
    endTimer();
  }
}
```

### 2. Health Checks

```javascript
// health/custom.js
async function checkTicketGenerator() {
  try {
    const response = await axios.get(`${process.env.TICKET_GENERATOR_URL}/health`, {
      timeout: 5000
    });
    
    return {
      status: response.data.status === 'healthy' ? 'healthy' : 'unhealthy',
      responseTime: response.headers['x-response-time'] || 0
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}
```

## Développement Local

### 1. Environment Setup

```bash
# Cloner le projet
git clone <repository-url>
cd event-planner-core

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env

# Démarrer les services
docker-compose up -d postgres

# Démarrer en développement
npm run dev
```

### 2. Debugging

Utiliser Node.js Inspector :

```bash
# Démarrer avec debug
npm run debug

# Ou avec VSCode
# Créer .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Event Planner Core",
  "program": "${workspaceFolder}/src/server.js",
  "env": {
    "NODE_ENV": "development"
  },
  "console": "integratedTerminal"
}
```

### 3. Hot Reload

Le service utilise nodemon pour le hot reload :

```json
// nodemon.json
{
  "watch": ["src"],
  "ext": "js,json",
  "ignore": ["src/**/*.test.js"],
  "exec": "node src/server.js"
}
```

## Contribuer

### 1. Processus de Contribution

1. Forker le projet
2. Créer une branche feature
3. Faire les changements
4. Ajouter des tests
5. Vérifier la couverture de code
6. Soumettre une PR

### 2. Code Review Checklist

- [ ] Le code suit les conventions de style
- [ ] Les tests passent
- [ ] La couverture de code est > 80%
- [ ] Les logs sont appropriés
- [ ] La sécurité est prise en compte
- [ ] La documentation est mise à jour
- [ ] Les métriques sont ajoutées si nécessaire

### 3. Commit Messages

Utiliser des messages de commit clairs :

```
feat(events): add event publishing functionality
fix(guests): resolve invitation code duplication
docs(api): update authentication documentation
test(tickets): add integration tests for validation
refactor(admin): optimize database queries
```

## Bonnes Pratiques

### 1. Sécurité

- Toujours valider les entrées
- Utiliser des requêtes paramétrées
- Vérifier les permissions
- Logger les événements de sécurité

### 2. Performance

- Utiliser les index de base de données
- Éviter les requêtes N+1
- Mettre en cache les données fréquemment accédées
- Monitorer les performances

### 3. Maintenabilité

- Écrire du code lisible et documenté
- Suivre les patterns établis
- Tests complets
- Gestion d'erreurs robuste

### 4. Scalabilité

- Design stateless quand possible
- Utiliser des queues pour les tâches asynchrones
- Partitionner les données si nécessaire
- Monitorer les ressources

---

Pour toute question sur le développement, contactez l'équipe lead ou consultez la documentation API.
