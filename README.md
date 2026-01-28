# 🎯 Event Planner - Service Core

## 📋 Description

Le service Core est le cerveau opérationnel de la plateforme Event Planner. Il gère la logique métier principale: création d'événements, gestion des participants, organisation, et toutes les fonctionnalités centrales.

## 🏗️ Architecture Technique

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE SERVICE (Port 3001)                 │
├─────────────────────────────────────────────────────────────┤
│  📦 Modules Principaux:                                      │
│  ├── events/         (Création, gestion événements)         │
│  ├── participants/   (Gestion participants)                  │
│  ├── organizers/     (Gestion organisateurs)                 │
│  ├── venues/         (Lieux et salles)                       │
│  ├── tickets/        (Types de billets)                      │
│  └── admin/          (Administration système)                │
│                                                             │
│  🔧 Technologies:                                            │
│  ├── Node.js + Express                                      │
│  ├── PostgreSQL (Base de données)                           │
│  ├── Auth Integration (JWT + RBAC)                          │
│  ├── File Upload (Images, documents)                        │
│  └── Notifications (Emails, SMS)                            │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- Service Auth (port 3000) démarré
- Service Notification (port 3002) optionnel

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd event-planner-backend/event-planner-core

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos configurations

# Démarrer la base de données
npm run db:up

# Lancer les migrations
npm run db:migrate

# Démarrer le service
npm run dev
```

### Vérification
```bash
# Health check
curl http://localhost:3001/health

# Doit retourner:
{
  "status": "healthy",
  "service": "core-service",
  "version": "1.0.0",
  "dependencies": {
    "auth": "connected",
    "database": "connected"
  }
}
```

## 📡 API Endpoints

### 🎪 Événements
```http
GET    /api/events              (Lister événements)
POST   /api/events              (Créer événement)
GET    /api/events/:id          (Détails événement)
PUT    /api/events/:id          (Mettre à jour)
DELETE /api/events/:id          (Supprimer)
POST   /api/events/:id/publish  (Publier)
POST   /api/events/:id/archive  (Archiver)
GET    /api/events/stats        (Statistiques)
```

### 👥 Participants
```http
GET    /api/participants        (Lister participants)
POST   /api/participants        (Ajouter participant)
GET    /api/participants/:id    (Détails participant)
PUT    /api/participants/:id    (Mettre à jour)
DELETE /api/participants/:id    (Supprimer)
```

### 🏛️ Organisateurs
```http
GET    /api/organizers          (Lister organisateurs)
POST   /api/organizers          (Créer organisateur)
GET    /api/organizers/:id      (Détails organisateur)
PUT    /api/organizers/:id      (Mettre à jour)
```

### 🏢 Lieux (Venues)
```http
GET    /api/venues              (Lister lieux)
POST   /api/venues              (Ajouter lieu)
GET    /api/venues/:id          (Détails lieu)
PUT    /api/venues/:id          (Mettre à jour)
```

## 🔄 Flux Métier Principaux

### 1. Création d'Événement
```mermaid
sequenceDiagram
    participant Organizer
    participant CoreAPI
    participant AuthAPI
    participant Database
    participant NotifService

    Organizer->>CoreAPI: POST /api/events
    CoreAPI->>AuthAPI: Vérifier token + permissions
    AuthAPI-->>CoreAPI: Utilisateur autorisé
    CoreAPI->>Database: Créer événement
    Database-->>CoreAPI: Événement créé
    CoreAPI->>NotifService: Notifier création
    CoreAPI-->>Organizer: 201 - Événement créé
```

### 2. Inscription Participant
```mermaid
sequenceDiagram
    participant Participant
    participant CoreAPI
    participant Database
    participant TicketService
    participant NotifService

    Participant->>CoreAPI: POST /api/participants
    CoreAPI->>Database: Vérifier places disponibles
    Database-->>CoreAPI: Places OK
    CoreAPI->>TicketService: Générer billet
    TicketService-->>CoreAPI: Billet créé
    CoreAPI->>Database: Enregistrer participant
    CoreAPI->>NotifService: Envoyer confirmation
    CoreAPI-->>Participant: 201 - Inscription confirmée
```

## 📊 Base de Données

### Tables Principales
```sql
events          -- Événements
participants    -- Participants aux événements
organizers      -- Organisateurs
venues          -- Lieux des événements
tickets         -- Types de billets
event_tickets   -- Billets générés
categories      -- Catégories d'événements
```

### Schéma Simplifié
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    venue_id INTEGER REFERENCES venues(id),
    organizer_id INTEGER REFERENCES organizers(id),
    max_participants INTEGER,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    user_id INTEGER, -- ID depuis auth service
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Sécurité & Authentification

### Intégration Auth Service
Le service Core utilise l'architecture d'authentification robuste:

```javascript
// Configuration dans server.js
const UnifiedJWTSecret = require('../../shared/config/unified-jwt-secret');
UnifiedJWTSecret.configureService('event-planner-core');

// Protection des routes
app.use('/api', RobustAuthMiddleware.authenticate());
```

### Permissions Requises
- `events.create` - Créer un événement
- `events.update` - Modifier un événement
- `events.delete` - Supprimer un événement
- `participants.manage` - Gérer les participants
- `admin.access` - Accès administration

## 🔧 Configuration

### Variables d'Environnement Essentielles
```bash
# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/event_planner_core

# Authentification
SHARED_SERVICE_TOKEN=shared-service-token-abcdef12345678901234567890
AUTH_SERVICE_URL=http://localhost:3000
JWT_SECRET=votre-secret-partage

# Services externes
NOTIFICATION_SERVICE_URL=http://localhost:3002
TICKET_SERVICE_URL=http://localhost:3004

# Serveur
PORT=3001
NODE_ENV=development

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10MB
```

## 🧪 Tests

### Lancer les tests
```bash
# Tests unitaires
npm run test

# Tests d'intégration
npm run test:integration

# Tests avec couverture
npm run test:coverage
```

### Tests API Importants
```bash
# Créer un événement (nécessite token auth)
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Mon Événement",
    "description": "Description de l événement",
    "start_date": "2024-06-15T10:00:00Z",
    "end_date": "2024-06-15T18:00:00Z",
    "max_participants": 100
  }'

# Lister les événements
curl -X GET http://localhost:3001/api/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚨 Erreurs Communes

### 1. "Unauthorized"
- Vérifier que le token JWT est valide
- Confirmer que l'utilisateur a les permissions requises

### 2. "Event not found"
- Vérifier l'ID de l'événement
- Confirmer que l'événement n'est pas archivé

### 3. "No available spots"
- Vérifier `max_participants` de l'événement
- Compter les participants actuels

## 📈 Monitoring

### Logs Importants
```bash
# Créations d'événements
grep "event.*created" logs/core.log

# Inscriptions participants
grep "participant.*registered" logs/core.log

# Erreurs d'autorisation
grep "unauthorized" logs/core.log
```

### Métriques à Surveiller
- Nombre d'événements créés/jour
- Taux de conversion inscriptions
- Temps de réponse des endpoints critiques
- Erreurs d'autorisation

## 🤝 Intégration avec Autres Services

### Communication Auth Service
```javascript
// Vérifier permissions utilisateur
const authResponse = await fetch(`${AUTH_SERVICE_URL}/api/auth/verify`, {
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'X-Service-Token': SHARED_SERVICE_TOKEN
  }
});
```

### Notification Service
```javascript
// Envoyer notification inscription
await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Service-Token': SHARED_SERVICE_TOKEN
  },
  body: JSON.stringify({
    to: participant.email,
    template: 'event-registration',
    data: { eventName, participantName }
  })
});
```

## 📁 Gestion des Fichiers

### Upload d'Images
Les événements peuvent avoir des images (bannières, logos):
```javascript
// Endpoint: POST /api/events/:id/upload
// Formats supportés: jpg, png, gif
// Taille max: 10MB
// Stockage: ./uploads/events/
```

### Types de Fichiers
- **Bannières événements**: 1920x1080px recommandé
- **Logos organisateurs**: 512x512px recommandé
- **Photos lieux**: 1920x1080px recommandé

## 📚 Documentation Complémentaire

- [Guide de Déploiement](./docs/DEPLOYMENT.md)
- [Référence API Complète](./docs/API_ROUTES.md)
- [Modèles de Données](./docs/DATA_MODELS.md)
- [Dépannage](./docs/TROUBLESHOOTING.md)

## 🆘 Support

En cas de problème:
1. Vérifier les logs: `tail -f logs/core.log`
2. Confirmer que le service Auth est accessible
3. Vérifier la connexion à la base de données
4. Consulter la documentation de dépannage

---

**🎯 Ce service est le moteur métier qui transforme les idées en événements mémorables !**
