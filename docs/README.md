# 🎯 CORE SERVICE - DOCUMENTATION

## 🎯 Présentation

Le **Core Service** est le cœur de la plateforme Event Planner SaaS. Il orchestre toutes les opérations métier :

- 🎪 **Gestion des événements** : Création, modification, suppression
- 👥 **Gestion des invités** : Inscriptions, validations, suivi  
- 🎫 **Gestion des tickets** : Génération, validation, QR codes
- 🔄 **Orchestration** : Coordination des autres services
- 📊 **Business Logic** : Règles métier et validations

## 🏗️ Architecture

### Stack Technique
```
Node.js + Express.js
PostgreSQL (base de données principale)
Redis (cache & files d'attente)
Bull Queue (job processing)
JWT (authentification)
Winston (logs)
```

### Architecture en couches
```
┌─────────────────┐
│    API Layer    │ ← Routes HTTP
├─────────────────┤
│ Controllers     │ ← Logique métier
├─────────────────┤
│ Services        │ ← Traitements
├─────────────────┤
│ Clients         │ ← Communication inter-services
├─────────────────┤
│ Data Layer      │ ← PostgreSQL + Redis
└─────────────────┘
```

## ⚡ Fonctionnalités principales

### 🎪 Gestion des événements

```javascript
POST /api/events
{
  "title": "Tech Conference 2024",
  "description": "La plus grande conférence tech",
  "eventDate": "2024-12-31T23:59:59Z",
  "location": "Paris, La Défense",
  "maxAttendees": 500,
  "ticketTypes": [
    {
      "name": "VIP",
      "price": 299.99,
      "quantity": 50
    }
  ]
}
```

### 👥 Gestion des invités

```javascript
POST /api/events/:eventId/guests
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@example.com",
  "phone": "+33612345678",
  "ticketTypeId": 1
}
```

### 🎫 Gestion des tickets

```javascript
POST /api/tickets/:ticketId/validate
{
  "scannerId": "scanner-123",
  "location": "Entrance A"
}
```

## 🗄️ Base de données

### Schéma principal
```sql
events (id, title, description, event_date, location, organizer_id, status)
├── guests (id, event_id, first_name, last_name, email, phone, status)
├── ticket_types (id, event_id, name, price, quantity)
└── tickets (id, guest_id, ticket_code, qr_code_data, is_validated)
```

### Index de performance
```sql
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_guests_event ON guests(event_id);
CREATE INDEX idx_tickets_code ON tickets(ticket_code);
```

## 📚 API Reference

### Authentification
```javascript
Authorization: Bearer <jwt_token>
```

### Endpoints principaux

#### GET /api/events
```javascript
// Query: ?page=1&limit=20&search=tech&status=upcoming
{
  "success": true,
  "data": {
    "events": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

#### POST /api/events
```javascript
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Tech Conference 2024",
    "status": "draft"
  }
}
```

#### GET /api/tickets/:ticketId
```javascript
{
  "success": true,
  "data": {
    "id": 456,
    "ticketCode": "TC-2024-123456",
    "qrCodeData": "base64-encoded-qr",
    "guest": {...},
    "event": {...}
  }
}
```

## 🔄 Communication inter-services

### Clients HTTP
```javascript
// Auth Client
class AuthClient {
  async validateToken(token) { /* ... */ }
  async getUser(userId) { /* ... */ }
}

// Notification Client  
class NotificationClient {
  async sendEmail(data) { /* ... */ }
  async sendSMS(data) { /* ... */ }
}
```

### Files d'attente Redis
```javascript
// Queue Service
class QueueService {
  async addEmailJob(data) { /* ... */ }
  async addTicketGenerationJob(data) { /* ... */ }
}
```

## 🚀 Guide de déploiement

### Prérequis
```bash
Node.js 18+
PostgreSQL 14+
Redis 6+
```

### Configuration
```bash
# .env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_NAME=event_planner_core
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=your-secret-key
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p logs uploads
EXPOSE 3001
CMD ["npm", "start"]
```

### Docker Compose
```yaml
services:
  core-service:
    build: .
    ports: ["3001:3001"]
    environment:
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379/1
    depends_on: [postgres, redis]
```

## 📊 Monitoring

### Health checks
```javascript
GET /health
{
  "status": "healthy",
  "service": "core-service",
  "uptime": 3600
}

GET /health/ready  
{
  "status": "ready",
  "dependencies": {
    "database": true,
    "redis": true
  }
}
```

### Logs structurés
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "service": "core-service",
  "message": "Event created successfully",
  "data": {"eventId": 456}
}
```

## 🛠️ Dépannage

### Problèmes courants

#### 1. Connexion BDD échoue
```bash
# Diagnostic
psql -h localhost -U core_user -d event_planner_core

# Solution
sudo systemctl restart postgresql
```

#### 2. Performances dégradées
```bash
# Analyser les requêtes lentes
SELECT query, mean_time FROM pg_stat_statements;

# Ajouter des index
CREATE INDEX idx_events_composite ON events(status, event_date);
```

#### 3. Queue Redis saturée
```bash
# Vérifier les queues
redis-cli LLEN email-queue

# Scaler les workers
npm run worker:scale --count=5
```

## 🎯 Bonnes pratiques

### Validation des données
```javascript
const eventSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  eventDate: Joi.date().iso().min('now').required(),
  maxAttendees: Joi.number().integer().min(1).max(100000).required()
});
```

### Gestion des erreurs
```javascript
const errorHandler = (error, req, res, next) => {
  logger.error('Error', { requestId: req.id, error: error.message });
  
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
};
```

### Caching
```javascript
class CacheService {
  async get(key) { /* ... */ }
  async set(key, data, ttl = 3600) { /* ... */ }
}
```

---

**Version** : 1.0.0  
**Port** : 3001  
**Dernière mise à jour** : 29 janvier 2026
