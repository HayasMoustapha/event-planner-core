# Event Planner Core - API Routes Documentation

## Overview

Le Event Planner Core est le service principal de la plateforme Event Planner, gérant les événements, invités, tickets, et le marketplace.

## Base URL
```
http://localhost:3001/api
```

## Authentication

Toutes les routes nécessitent une authentification JWT:
```
Authorization: Bearer <token>
```

## Permissions

Les permissions requises pour chaque route sont spécifiées ci-dessous.

---

## 🏠 **Health Routes**

### Health Check
```
GET /health
```
- **Description**: Vérification de santé du service
- **Authentification**: Non requise
- **Permissions**: Aucune
- **Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-25T15:30:00.000Z",
  "service": "event-planner-core",
  "version": "1.0.0",
  "uptime": "2.5 hours",
  "environment": "development"
}
```

### API Info
```
GET /api/info
```
- **Description**: Informations sur le service et endpoints disponibles
- **Authentification**: Non requise
- **Permissions**: Aucune
- **Response**:
```json
{
  "name": "Event Planner Core API",
  "version": "1.0.0",
  "description": "API pour la gestion des événements, invités et tickets",
  "environment": "development",
  "uptime": "2.5 hours",
  "timestamp": "2024-01-25T15:30:00.000Z",
  "documentation": "/api-docs",
  "endpoints": {
    "events": "/api/events",
    "guests": "/api/guests",
    "tickets": "/api/tickets",
    "marketplace": "/api/marketplace",
    "admin": "/api/admin"
  }
}
```

### API Root
```
GET /api
```
- **Description**: Racine de l'API avec liste des endpoints
- **Authentification**: Requise
- **Permissions**: Aucune
- **Response**:
```json
{
  "name": "Event Planner Core API",
  "version": "1.0.0",
  "description": "Backend API for Event Planner Core platform",
  "endpoints": {
    "events": "/api/events",
    "guests": "/api/guests",
    "tickets": "/api/tickets",
    "marketplace": "/api/marketplace",
    "admin": "/api/admin"
  },
  "documentation": "/api/docs",
  "health": "/health"
}
```

---

## 🎫 **Events Routes**

### Create Event
```
POST /api/events
```
- **Description**: Créer un nouvel événement
- **Authentification**: Requise
- **Permissions**: `events.create`
- **Request Body**:
```json
{
  "title": "Annual Tech Conference 2025",
  "description": "Une conférence sur les dernières technologies",
  "event_date": "2025-06-15T10:00:00.000Z",
  "location": "Paris Expo Porte de Versailles",
  "organizer_id": 123
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": "evt_123456789",
    "title": "Annual Tech Conference 2025",
    "slug": "annual-tech-conference-2025",
    "status": "draft",
    "created_at": "2024-01-25T15:30:00.000Z",
    "created_by": "user-123"
  }
}
```

### Get Events
```
GET /api/events
```
- **Description**: Lister les événements de l'utilisateur
- **Authentification**: Requise
- **Permissions**: `events.read`
- **Query Parameters**:
- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre par page (défaut: 20)
- `status`: Filtrer par statut (draft, published, archived)
- `search`: Terme de recherche
- **Response**:
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": {
    "events": [
      {
        "id": "evt_123456789",
        "title": "Annual Tech Conference 2025",
        "slug": "annual-tech-conference-2025",
        "status": "published",
        "event_date": "2025-06-15T10:00:00.000Z",
        "location": "Paris Expo Porte de Versailles",
        "created_at": "2024-01-25T15:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### Get Event by ID
```
GET /api/events/:id
```
- **Description**: Récupérer un événement spécifique
- **Authentification**: Requise
- **Permissions**: `events.read`

### Update Event
```
PUT /api/events/:id
```
- **Description**: Mettre à jour un événement
- **Authentification**: Requise
- **Permissions**: `events.update`

### Delete Event
```
DELETE /api/events/:id
```
- **Description**: Supprimer un événement
- **Authentification**: Requise
- **Permissions**: `events.delete`

### Publish Event
```
POST /api/events/:id/publish
```
- **Description**: Publier un événement
- **Authentification**: Requise
- **Permissions**: `events.publish`

### Archive Event
```
POST /api/events/:id/archive
```
- **Description**: Archiver un événement
- **Authentification**: Requise
- **Permissions**: `events.archive`

### Get Event Statistics
```
GET /api/events/stats
```
- **Description**: Statistiques des événements
- **Authentification**: Requise
- **Permissions**: `events.read`

---

## 👥 **Guests Routes**

### Create Guest
```
POST /api/guests
```
- **Description**: Créer un invité
- **Authentification**: Requise
- **Permissions**: `guests.create`
- **Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+33612345678",
  "created_by": 123
}
```

### Get Guests
```
GET /api/guests
```
- **Description**: Lister les invités
- **Authentification**: Requise
- **Permissions**: `guests.read`

### Get Guest by ID
```
GET /api/guests/:id
```
- **Description**: Récupérer un invité spécifique
- **Authentification**: Requise
- **Permissions**: `guests.read`

### Update Guest
```
PUT /api/guests/:id
```
- **Description**: Mettre à jour un invité
- **Authentification**: Requise
- **Permissions**: `guests.update`

### Delete Guest
```
DELETE /api/guests/:id
```
- **Description**: Supprimer un invité
- **Authentification**: Requise
- **Permissions**: `guests.delete`

### Get Event Guests
```
GET /api/guests/events/:eventId/guests
```
- **Description**: Récupérer les invités d'un événement
- **Authentification**: Requise
- **Permissions**: `guests.read`

### Add Guest to Event
```
POST /api/guests/events/:eventId/guests
```
- **Description**: Ajouter un invité à un événement
- **Authentification**: Requise
- **Permissions**: `guests.create`

### Add Guests in Bulk
```
POST /api/guests/events/:eventId/guests/bulk
```
- **Description**: Ajouter plusieurs invités en lot à un événement
- **Authentification**: Requise
- **Permissions**: `guests.create`

### Check-in Guest
```
POST /api/guests/check-in
```
- **Description**: Check-in un invité
- **Authentification**: Requise
- **Permissions**: `guests.update`

### Check-in Guest by ID
```
POST /api/guests/events/:eventId/guests/:guestId/checkin
```
- **Description**: Check-in un invité par ID
- **Authentification**: Requise
- **Permissions**: `guests.update`

### Get Guest Statistics
```
GET /api/guests/events/:eventId/stats
```
- **Description**: Statistiques des invités d'un événement
- **Authentification**: Requise
- **Permissions**: `guests.read`

---

## 🎫 **Tickets Routes**

### Generate Ticket
```
POST /api/tickets
```
- **Description**: Générer un ticket
- **Authentification**: Requise
- **Permissions**: `tickets.create`

### Get Tickets
```
GET /api/tickets
```
- **Description**: Lister les tickets
- **Authentification**: Requise
- **Permissions**: `tickets.read`

### Get Ticket by Code
```
GET /api/tickets/code/:ticketCode
```
- **Description**: Récupérer un ticket par son code
- **Authentification**: Requise
- **Permissions**: `tickets.read`

### Get Event Tickets
```
GET /api/tickets/events/:eventId/tickets
```
- **Description**: Récupérer les tickets d'un événement
- **Authentification**: Requise
- **Permissions**: `tickets.read`

### Validate Ticket
```
POST /api/tickets/:id/validate
```
- **Description**: Valider un ticket
- **Authentification**: Requise
- **Permissions**: `tickets.validate`

### Validate Ticket by Code
```
POST /api/tickets/validate
```
- **Description**: Valider un ticket par son code
- **Authentification**: Requise
- **Permissions**: `tickets.validate`

### Bulk Generate Tickets
```
POST /api/tickets/bulk/generate
```
- **Description**: Générer des tickets en lot
- **Authentification**: Requise
- **Permissions**: `tickets.create`

### Create Job
```
POST /api/tickets/jobs
```
- **Description**: Créer un job de génération
- **Authentification**: Requise
- **Permissions**: `tickets.create`

### Process Job
```
POST /api/tickets/jobs/:jobId/process
```
- **Description**: Traiter un job spécifique
- **Authentification**: Requise
- **Permissions**: `tickets.update`

### Get Event Ticket Statistics
```
GET /api/tickets/events/:eventId/stats
```
- **Description**: Statistiques de tickets d'un événement
- **Authentification**: Requise
- **Permissions**: `tickets.read`

---

## 🏪 **Ticket Types Routes**

### Create Ticket Type
```
POST /api/tickets/types
```
- **Description**: Créer un type de ticket
- **Authentification**: Requise
- **Permissions**: `tickets.types.create`

### Get Ticket Types
```
GET /api/tickets/types
```
- **Description**: Lister les types de tickets
- **Authentification**: Requise
- **Permissions**: `tickets.types.read`

### Get Ticket Type by ID
```
GET /api/tickets/types/:id
```
- **Description**: Récupérer un type de ticket
- **Authentification**: Requise
- **Permissions**: `tickets.types.read`

### Update Ticket Type
```
PUT /api/tickets/types/:id
```
- **Description**: Mettre à jour un type de ticket
- **Authentification**: Requise
- **Permissions**: `tickets.types.update`

### Delete Ticket Type
```
DELETE /api/tickets/types/:id
```
- **Description**: Supprimer un type de ticket
- **Authentification**: Requise
- **Permissions**: `tickets.types.delete`

---

## 🎨 **Ticket Templates Routes**

### Create Template
```
POST /api/tickets/templates
```
- **Description**: Créer un template de ticket
- **Authentification**: Requise
- **Permissions**: `tickets.templates.create`

### Get Templates
```
GET /api/tickets/templates
```
- **Description**: Lister les templates
- **Authentification**: Requise
- **Permissions**: `tickets.templates.read`

### Get Popular Templates
```
GET /api/tickets/templates/popular
```
- **Description**: Lister les templates populaires
- **Authentification**: Requise
- **Permissions**: `tickets.templates.read`

### Get Template by ID
```
GET /api/tickets/templates/:id
```
- **Description**: Récupérer un template spécifique
- **Authentification**: Requise
- **Permissions**: `tickets.templates.read`

### Update Template
```
PUT /api/tickets/templates/:id
```
- **Description**: Mettre à jour un template
- **Authentification**: Requise
- **Permissions**: `tickets.templates.update`

### Delete Template
```
DELETE /api/tickets/templates/:id
```
- **Description**: Supprimer un template
- **Authentification**: Requise
- **Permissions**: `tickets.templates.delete`

---

## 🛍 **Marketplace Routes**

### Become Designer
```
POST /api/marketplace/designers
```
- **Description**: Devenir designer
- **Authentification**: Requise
- **Permissions**: `marketplace.create`

### Get Designers
```
GET /api/marketplace/designers
```
- **Description**: Lister les designers
- **Authentification**: Requise
- **Permissions**: `marketplace.read`

### Get Designer by ID
```
GET /api/marketplace/designers/:id
```
- **Description**: Récupérer un designer
- **Authentification**: Requise
- **Permissions**: `marketplace.read`

### Update Designer
```
PUT /api/marketplace/designers/:id
```
- **Description**: Mettre à jour un designer
- **Authentification**: Requise
- **Permissions**: `marketplace.update`

### Create Template
```
POST /api/marketplace/templates
```
- **Description**: Créer un template
- **Authentification**: Requise
- **Permissions**: `marketplace.create`

### Get Templates
```
GET /api/marketplace/templates
```
- **Description**: Lister les templates
- **Authentification**: Requise
- **Permissions**: `marketplace.read`

### Get Popular Templates
```
GET /api/marketplace/templates/popular
```
- **Description**: Lister les templates populaires
- **Authentification**: Requise
- **Permissions**: `marketplace.read`

### Get Template by ID
```
GET /api/marketplace/templates/:id
```
- **Description**: Récupérer un template spécifique
- **Authentification**: Requise
- **Permissions**: `marketplace.read`

### Update Template
```
PUT /api/marketplace/templates/:id
```
- **Description**: Mettre à jour un template
- **Authentification**: Requise
- **Permissions**: `marketplace.update`

### Delete Template
```
DELETE /api/marketplace/templates/:id
```
- **Description**: Supprimer un template
- **Authentification**: Requise
- **Permissions**: `marketplace.delete`

### Purchase Template
```
POST /api/marketplace/templates/:templateId/purchase
```
- **Description**: Acheter un template
- **Authentification**: Requise
- **Permissions**: `marketplace.purchase`

### Create Template Review
```
POST /api/marketplace/templates/:templateId/reviews
```
- **Description**: Créer une review de template
- **Authentification**: Requise
- **Permissions**: `marketplace.create`

### Get Template Reviews
```
GET /api/marketplace/templates/:templateId/reviews
```
- **Description**: Récupérer les reviews d'un template
- **Authentification**: Requise
- **Permissions**: `marketplace.read`

### Get User Purchases
```
GET /api/marketplace/purchases
```
- **Description**: Récupérer les achats de l'utilisateur
- **Authentification**: Requise
- **Permissions**: `marketplace.read`

### Get Marketplace Statistics
```
GET /api/marketplace/stats
```
- **Description**: Statistiques du marketplace
- **Authentification**: Requise
- **Permissions**: `marketplace.read`

### Approve Template
```
POST /api/marketplace/templates/:id/approve
```
- **Description**: Approuver un template
- **Authentification**: Requise
- **Permissions**: `marketplace.moderate`

### Reject Template
```
POST /api/marketplace/templates/:id/reject
```
- **Description**: Rejeter un template
- **Authentification**: Requise
- **Permissions**: `marketplace.moderate`

### Verify Designer
```
POST /api/marketplace/designers/:id/verify
```
- **Description**: Vérifier un designer
- **Authentification**: Requise
- **Permissions**: `marketplace.moderate`

---

## 🛠️ **Admin Routes**

### Dashboard
```
GET /api/admin/dashboard
```
- **Description**: Tableau de bord admin
- **Authentification**: Requise
- **Permissions**: `admin.read`

### Global Statistics
```
GET /api/admin/stats
```
- **Description**: Statistiques globales
- **Authentification**: Requise
- **Permissions**: `admin.read`

### Recent Activity
```
GET /api/admin/activity
```
- **Description**: Activité récente
- **Authentification**: Requise
- **Permissions**: `admin.read`

### System Logs
```
GET /api/admin/logs
```
- **Description**: Logs système
- **Authentification**: Requise
- **Permissions**: `admin.read`

### Create System Log
```
POST /api/admin/logs
```
- **Description**: Créer un log système
- **Authentification**: Requise
- **Permissions**: `admin.create`

### Get Users
```
GET /api/admin/users
```
- **Description**: Lister les utilisateurs
- **Authentification**: Requise
- **Permissions**: `admin.read`

### Get User by ID
```
GET /api/admin/users/:id
```
- **Description**: Récupérer un utilisateur
- **Authentification**: Requise
- **Permissions**: `admin.read`

### Get Events
```
GET /api/admin/events
```
- **Description**: Lister les événements
- **Authentification**: Requise
- **Permissions**: `admin.read`

### Get Templates Pending Approval
```
GET /api/admin/templates/pending
```
- **Description**: Templates en attente d'approbation
- **Authentification**: Requise
- **Permissions**: `admin.moderate`

### Get Designers Pending Verification
```
GET /api/admin/designers/pending
```
- **Description**: Designers en attente de vérification
- **Authentification**: Requise
- **Permissions**: `admin.moderate`

### Moderate Content
```
POST /api/admin/moderate
```
- **Description**: Modérer du contenu
- **Authentification**: Requise
- **Permissions**: `admin.moderate`

### Get Revenue Stats
```
GET /api/admin/analytics/revenue
```
- **Description**: Statistiques de revenus
- **Authentification**: Requise
- **Permissions**: `admin.read`

### Get Event Growth Stats
```
GET /api/admin/analytics/events
```
- **Description**: Statistiques de croissance d'événements
- **Authentification**: Requise
- **Permissions**: `admin.read`

### Export Data
```
GET /api/admin/export
```
- **Description**: Exporter des données
- **Authentification**: Requise
- **Permissions**: `admin.export`

### Get System Health
```
GET /api/admin/health
```
- **Description**: Santé du système
- **Authentification**: Requise
- **Permissions**: `admin.read`

### Create Backup
```
POST /api/admin/backup
```
- **Description**: Créer une sauvegarde
- **Authentification**: Requise
- **Permissions**: `admin.backup`

---

## 📊 **Error Responses**

Toutes les erreurs suivent ce format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description de l'erreur",
    "details": [
      {
        "field": "title",
        "message": "Event title is required"
      }
    ]
  }
}
```

### Codes d'erreur communs:
- `VALIDATION_ERROR`: Erreur de validation des données
- `EVENT_NOT_FOUND`: Événement non trouvé
- `GUEST_NOT_FOUND`: Invité non trouvé
- `TICKET_NOT_FOUND`: Ticket non trouvé
- `INSUFFICIENT_PERMISSIONS`: Permissions insuffisantes
- `DUPLICATE_ENTRY`: Entrée en double
- `DATABASE_ERROR`: Erreur de base de données
- `EXTERNAL_SERVICE_ERROR`: Erreur service externe

---

## 🚀 **Rate Limiting**

- **Limite générale**: 200 requêtes par 15 minutes par IP
- **Limite création**: 50 créations par minute par IP
- **Limite bulk**: 10 bulk operations par heure par IP

---

## 📝 **Notes**

- Tous les timestamps sont en format ISO 8601
- Les IDs sont sensibles à la casse
- Les opérations bulk sont asynchrones
- Les templates supportent la personnalisation
- Le marketplace utilise un système de reviews

---

## 🔗 **Liens Utiles**

- [Documentation Events](../modules/events/)
- [Documentation Guests](../modules/guests/)
- [Documentation Tickets](../modules/tickets/)
- [Documentation Marketplace](../modules/marketplace/)
- [Documentation Admin](../modules/admin/)
- [Postman Collection](../postman/collections/Event Planner Core.postman_collection.json)
