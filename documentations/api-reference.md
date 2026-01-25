# API Reference - Event Planner Core

## Overview

Cette documentation décrit tous les endpoints de l'API Event Planner Core avec exemples, schémas de requêtes/réponses et codes d'erreur.

## Base URL

```
Development: http://localhost:3001
Production:  https://api.eventplanner.com/core
```

## Authentication

Toutes les requêtes (sauf health checks) nécessitent un token JWT dans l'en-tête :

```http
Authorization: Bearer <jwt_token>
```

Le token est obtenu via le service d'authentification Event Planner Auth.

## Response Format

Toutes les réponses suivent ce format :

```json
{
  "success": true|false,
  "data": {}, // ou null
  "message": "Message descriptif",
  "error": "Code d'erreur" // uniquement si success: false
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Health & Monitoring

### GET /health

Health check simple de l'API.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-25T10:30:00Z",
    "uptime": 3600,
    "version": "1.0.0"
  }
}
```

### GET /health/detailed

Health check détaillé de tous les composants.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-25T10:30:00Z",
    "uptime": 3600,
    "version": "1.0.0",
    "components": {
      "database": {
        "status": "healthy",
        "responseTime": 15
      },
      "auth_service": {
        "status": "healthy",
        "responseTime": 45
      },
      "filesystem": {
        "status": "healthy"
      }
    }
  }
}
```

### GET /metrics

Métriques Prometheus au format texte.

---

## Events Module

### GET /api/events

Récupérer la liste des événements de l'utilisateur.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `status` (string, optional): Filter by status (`draft`, `published`, `archived`)
- `search` (string, optional): Search in title and description

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Conférence Tech 2024",
      "description": "Une conférence sur les nouvelles technologies",
      "event_date": "2024-06-15T09:00:00Z",
      "location": "Paris Expo Porte de Versailles",
      "status": "published",
      "organizer_id": 123,
      "guest_count": 150,
      "checked_in_count": 45,
      "created_at": "2024-01-20T10:00:00Z",
      "updated_at": "2024-01-25T09:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### POST /api/events

Créer un nouvel événement.

**Request Body:**
```json
{
  "title": "Nouvel Événement",
  "description": "Description de l'événement",
  "event_date": "2024-12-31T23:59:59Z",
  "location": "Lieu de l'événement"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "title": "Nouvel Événement",
    "description": "Description de l'événement",
    "event_date": "2024-12-31T23:59:59Z",
    "location": "Lieu de l'événement",
    "status": "draft",
    "organizer_id": 123,
    "created_at": "2024-01-25T10:00:00Z",
    "updated_at": "2024-01-25T10:00:00Z"
  },
  "message": "Événement créé avec succès"
}
```

### GET /api/events/:id

Récupérer un événement spécifique.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Conférence Tech 2024",
    "description": "Une conférence sur les nouvelles technologies",
    "event_date": "2024-06-15T09:00:00Z",
    "location": "Paris Expo Porte de Versailles",
    "status": "published",
    "organizer_id": 123,
    "created_at": "2024-01-20T10:00:00Z",
    "updated_at": "2024-01-25T09:30:00Z"
  }
}
```

### PUT /api/events/:id

Mettre à jour un événement.

**Request Body:**
```json
{
  "title": "Titre modifié",
  "description": "Description mise à jour",
  "event_date": "2024-07-01T09:00:00Z"
}
```

### DELETE /api/events/:id

Supprimer un événement (uniquement si statut = draft).

### POST /api/events/:id/publish

Publier un événement (change le statut de draft à published).

### POST /api/events/:id/archive

Archiver un événement (change le statut à archived).

### GET /api/events/:id/stats

Statistiques d'un événement.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_guests": 150,
    "confirmed_guests": 120,
    "checked_in_guests": 45,
    "pending_guests": 25,
    "cancelled_guests": 5,
    "tickets_sold": 120,
    "revenue": 12000.00
  }
}
```

---

## Guests Module

### GET /api/guests

Lister les invités.

**Query Parameters:**
- `page` (number, optional)
- `limit` (number, optional)
- `status` (string, optional): `pending`, `confirmed`, `cancelled`
- `search` (string, optional)
- `event_id` (number, optional)

### POST /api/guests

Créer un nouvel invité.

**Request Body:**
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "email": "jean.dupont@example.com",
  "phone": "+33612345678"
}
```

### GET /api/guests/:id

Récupérer un invité spécifique.

### PUT /api/guests/:id

Mettre à jour un invité.

### DELETE /api/guests/:id

Supprimer un invité.

### POST /api/events/:eventId/guests

Ajouter un invité à un événement.

**Request Body:**
```json
{
  "guest_id": 45,
  "invitation_code": "INV-ABC123"
}
```

### POST /api/guests/checkin

Check-in d'un invité.

**Request Body:**
```json
{
  "invitation_code": "INV-ABC123"
}
```

### GET /api/events/:eventId/guests

Lister les invités d'un événement.

### GET /api/events/:eventId/guests/stats

Statistiques des invités d'un événement.

---

## Tickets Module

### Ticket Types

#### GET /api/tickets/types

Lister les types de billets.

#### POST /api/tickets/types

Créer un type de billet.

**Request Body:**
```json
{
  "event_id": 1,
  "name": "VIP",
  "description": "Accès VIP avec avantages",
  "type": "paid",
  "quantity": 100,
  "price": 199.99,
  "currency": "EUR",
  "available_from": "2024-01-01T00:00:00Z",
  "available_to": "2024-06-01T23:59:59Z"
}
```

#### GET /api/tickets/types/:id

Récupérer un type de billet.

#### PUT /api/tickets/types/:id

Mettre à jour un type de billet.

#### DELETE /api/tickets/types/:id

Supprimer un type de billet.

### Tickets

#### GET /api/tickets

Lister les billets.

#### POST /api/tickets

Créer un billet.

**Request Body:**
```json
{
  "ticket_type_id": 1,
  "event_guest_id": 45,
  "price": 199.99,
  "currency": "EUR"
}
```

#### GET /api/tickets/:id

Récupérer un billet.

#### PUT /api/tickets/:id/validate

Valider un billet.

**Request Body:**
```json
{
  "ticket_code": "TICKET-XYZ789"
}
```

---

## Marketplace Module

### Designers

#### GET /api/marketplace/designers

Lister les designers.

#### POST /api/marketplace/designers

Devenir designer.

**Request Body:**
```json
{
  "user_id": 123,
  "brand_name": "Creative Studio",
  "portfolio_url": "https://creativestudio.com"
}
```

#### GET /api/marketplace/designers/:id

Récupérer un designer.

#### PUT /api/marketplace/designers/:id

Mettre à jour un profil designer.

### Templates

#### GET /api/marketplace/templates

Lister les templates.

**Query Parameters:**
- `designer_id` (number, optional)
- `status` (string, optional): `pending_review`, `approved`, `rejected`
- `min_price` (number, optional)
- `max_price` (number, optional)

#### POST /api/marketplace/templates

Créer un template.

**Request Body:**
```json
{
  "designer_id": 1,
  "name": "Template Élégant",
  "description": "Template moderne et élégant",
  "preview_url": "https://example.com/preview.jpg",
  "source_files_path": "/templates/elegant",
  "price": 49.99,
  "currency": "EUR"
}
```

#### GET /api/marketplace/templates/:id

Récupérer un template.

#### PUT /api/marketplace/templates/:id

Mettre à jour un template.

#### DELETE /api/marketplace/templates/:id

Supprimer un template.

### Purchases

#### GET /api/marketplace/purchases

Lister les achats.

#### POST /api/marketplace/purchases

Acheter un template.

**Request Body:**
```json
{
  "template_id": 1,
  "amount": 49.99,
  "currency": "EUR",
  "transaction_id": "txn_123456789"
}
```

### Reviews

#### GET /api/marketplace/reviews

Lister les avis.

#### POST /api/marketplace/reviews

Ajouter un avis.

**Request Body:**
```json
{
  "template_id": 1,
  "rating": 5,
  "comment": "Excellent template, très facile à utiliser !"
}
```

---

## Admin Module

### Dashboard

#### GET /api/admin/dashboard

Tableau de bord administrateur.

**Response:**
```json
{
  "success": true,
  "data": {
    "global_stats": {
      "total_events": 1250,
      "published_events": 890,
      "total_guests": 45000,
      "total_tickets": 38000,
      "total_revenue": 1250000.00,
      "total_designers": 45,
      "approved_templates": 234
    },
    "recent_activity": [
      {
        "type": "event_created",
        "description": "Nouvel événement créé",
        "timestamp": "2024-01-25T09:30:00Z",
        "user": "John Doe"
      }
    ]
  }
}
```

#### GET /api/admin/stats

Statistiques globales.

**Query Parameters:**
- `period` (string, optional): `7d`, `30d`, `90d`, `1y`
- `metric` (string, optional): `events`, `users`, `tickets`, `revenue`

### Users Management

#### GET /api/admin/users

Lister tous les utilisateurs.

#### GET /api/admin/users/:id

Récupérer un utilisateur.

#### PUT /api/admin/users/:id/status

Mettre à jour le statut d'un utilisateur.

#### DELETE /api/admin/users/:id

Supprimer un utilisateur.

### Templates Moderation

#### GET /api/admin/templates/pending

Lister les templates en attente de validation.

#### POST /api/admin/templates/:id/approve

Approuver un template.

#### POST /api/admin/templates/:id/reject

Rejeter un template.

### System Logs

#### GET /api/admin/logs

Lister les logs système.

**Query Parameters:**
- `level` (string, optional): `info`, `warning`, `error`
- `start_date` (string, optional)
- `end_date` (string, optional)
- `page` (number, optional)
- `limit` (number, optional)

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Erreur de validation des données |
| `NOT_FOUND` | Ressource non trouvée |
| `UNAUTHORIZED` | Non authentifié |
| `FORBIDDEN` | Accès refusé |
| `CONFLICT` | Conflit de données |
| `RATE_LIMIT_EXCEEDED` | Limite de requêtes dépassée |
| `SECURITY_VIOLATION` | Tentative d'attaque détectée |
| `EXTERNAL_SERVICE_ERROR` | Erreur service externe |
| `DATABASE_ERROR` | Erreur base de données |

---

## Rate Limiting

Les limites suivantes s'appliquent :

- **Endpoints généraux**: 100 requêtes / 15 minutes
- **Endpoints d'auth**: 5 requêtes / 15 minutes
- **Endpoints admin**: 200 requêtes / 15 minutes

En cas de dépassement, l'API retourne `429 Too Many Requests`.

---

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class EventPlannerAPI {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createEvent(eventData) {
    try {
      const response = await this.client.post('/api/events', eventData);
      return response.data;
    } catch (error) {
      throw new Error(error.response.data.error);
    }
  }

  async getEvents(options = {}) {
    const response = await this.client.get('/api/events', { params: options });
    return response.data;
  }
}

// Usage
const api = new EventPlannerAPI('http://localhost:3001', 'your-jwt-token');

const event = await api.createEvent({
  title: 'Mon Événement',
  description: 'Description',
  event_date: '2024-12-31T23:59:59Z',
  location: 'Paris'
});
```

### Python

```python
import requests

class EventPlannerAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def create_event(self, event_data):
        response = requests.post(
            f'{self.base_url}/api/events',
            json=event_data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def get_events(self, **params):
        response = requests.get(
            f'{self.base_url}/api/events',
            params=params,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
api = EventPlannerAPI('http://localhost:3001', 'your-jwt-token')

event = api.create_event({
    'title': 'Mon Événement',
    'description': 'Description',
    'event_date': '2024-12-31T23:59:59Z',
    'location': 'Paris'
})
```

---

## Changelog

### v1.0.0 (2024-01-25)
- Version initiale de l'API
- Modules Events, Guests, Tickets, Marketplace, Admin
- Sécurité avancée et monitoring
- Documentation complète

---

Pour plus d'informations, contactez l'équipe de développement ou consultez le [guide de dépannage](./troubleshooting.md).
