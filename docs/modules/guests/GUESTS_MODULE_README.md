# 📋 Module Guests - Documentation Rapide

## 🎯 Vue d'Ensemble

Le module `guests` gère la création, la modification, l'import et le suivi des invités dans les événements. Il offre des fonctionnalités CRUD complètes, des opérations bulk, et un système d'import CSV.

---

## 🚀 Endpoints Principaux

### CRUD Guests
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/guests` | Créer un invité |
| `GET` | `/api/guests/:id` | Lire un invité |
| `GET` | `/api/guests` | Lister les invités (paginé) |
| `PUT` | `/api/guests/:id` | Mettre à jour un invité |
| `DELETE` | `/api/guests/:id` | Supprimer un invité (soft delete) |

### Gestion Événement-Invités
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/guests/events/:eventId/guests` | Ajouter invités à un événement |
| `GET` | `/api/guests/events/:eventId/guests` | Lister les invités d'un événement |
| `POST` | `/api/guests/events/:eventId/guests/bulk` | Ajout bulk d'invités |
| `POST` | `/api/guests/events/:eventId/guests/import` | Importer depuis CSV/Excel |
| `POST` | `/api/guests/events/:eventId/guests/:guestId/checkin` | Check-in d'un invité |

### Statistiques
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/guests/events/:eventId/stats` | Statistiques de l'événement |

---

## 📄 Import CSV - Guide Rapide

### Structure du Fichier
```csv
first_name,last_name,email,phone
Jean,Dupont,jean.dupont@example.com,+33612345678
Marie,Curie,marie.curie@example.com,+33687654321
```

### Commande cURL
```bash
curl -X POST http://localhost:3001/api/guests/events/{eventId}/guests/import \
  -H "Authorization: Bearer {token}" \
  -F "file=@invites.csv"
```

### Réponse Attendue
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_rows": 2,
      "imported": 2,
      "ignored": 0,
      "errors": 0
    }
  }
}
```

---

## 🔧 Validation des Données

### Champs Obligatoires
- `first_name` : Prénom (non vide)
- `last_name` : Nom (non vide)  
- `email` : Email valide (format: nom@domaine.extension)

### Champs Optionnels
- `phone` : Téléphone (format international, commence par +)

### Formats Acceptés
- **Email** : `jean.dupont@example.com`
- **Téléphone** : `+33612345678`, `+33 6 12 34 56 78`

---

## 📊 Réponses API

### Succès (Création)
```json
{
  "success": true,
  "message": "Guest created",
  "data": {
    "id": "123",
    "first_name": "Jean",
    "last_name": "Dupont",
    "email": "jean.dupont@example.com",
    "phone": "+33612345678",
    "status": "pending"
  }
}
```

### Erreur
```json
{
  "success": false,
  "error": "Email is required",
  "code": "VALIDATION_ERROR"
}
```

---

## 🎯 Cas d'Usage Courants

### 1. Créer un Invité Simple
```bash
curl -X POST http://localhost:3001/api/guests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "first_name": "Jean",
    "last_name": "Dupont", 
    "email": "jean.dupont@example.com",
    "phone": "+33612345678"
  }'
```

### 2. Ajouter des Invités à un Événement
```bash
curl -X POST http://localhost:3001/api/guests/events/123/guests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "guests": [
      {"guest_id": 456},
      {"guest_id": 789}
    ]
  }'
```

### 3. Bulk Add (Création + Liaison)
```bash
curl -X POST http://localhost:3001/api/guests/events/123/guests/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "guests": [
      {
        "first_name": "Marie",
        "last_name": "Curie",
        "email": "marie.curie@example.com"
      }
    ]
  }'
```

### 4. Check-in d'un Invité
```bash
curl -X POST http://localhost:3001/api/guests/events/123/guests/456/checkin \
  -H "Authorization: Bearer {token}"
```

---

## 📈 Pagination

### Liste des Invités
```
GET /api/guests?page=1&limit=10&search=jean
```

### Réponse Paginée
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 🔍 Recherche et Filtrage

### Paramètres de Recherche
- `search` : Recherche par nom ou email
- `status` : Filtrer par statut (pending, confirmed, cancelled)
- `page` : Numéro de page
- `limit` : Nombre par page (max 100)

### Exemples
```
GET /api/guests?search=dupont&status=pending&page=1&limit=20
```

---

## 🛡️ Permissions Requises

| Action | Permission Requise |
|--------|-------------------|
| Créer un invité | `guests.create` |
| Lire un invité | `guests.read` |
| Mettre à jour | `guests.update` |
| Supprimer | `guests.delete` |
| Check-in | `guests.checkin` |
| Import CSV | `guests.create` |
| Statistiques | `guests.stats.read` |

---

## 📋 Statuts Disponibles

| Statut | Description |
|--------|-------------|
| `pending` | Invité en attente de confirmation |
| `confirmed` | Invité confirmé pour l'événement |
| `cancelled` | Invité annulé |

---

## 🎯 Bonnes Pratiques

### 1. Import CSV
- Toujours valider le fichier avant import
- Utiliser UTF-8 pour l'encodage
- Vérifier les formats d'email et téléphone

### 2. Performance
- Utiliser les endpoints bulk pour plusieurs invités
- Limiter les requêtes à 100 invités par lot
- Utiliser la pagination pour les grandes listes

### 3. Gestion d'Erreurs
- Vérifier les réponses `success: false`
- Consulter les messages d'erreur détaillés
- Utiliser les codes d'erreur pour le débogage

---

## 🔧 Débogage

### Erreurs Communes
- **400** : Erreur de validation
- **401** : Non authentifié
- **403** : Permissions insuffisantes
- **404** : Ressource introuvable
- **500** : Erreur serveur

### Logs Disponibles
- Création/Mise à jour des invités
- Erreurs de validation
- Import CSV détaillé
- Check-in des invités

---

## 📚 Documentation Complète

Pour plus de détails :
- 📖 [Guide Complet Import CSV](./IMPORT_CSV_GUIDE.md)
- 📄 [Exemple Fichier CSV](./EXEMPLE_IMPORT_CSV.csv)
- 🔧 [API Reference](./API_REFERENCE.md)

---

## 🎉 Résumé

Le module guests offre :
- ✅ CRUD complet
- ✅ Import CSV robuste
- ✅ Opérations bulk optimisées
- ✅ Check-in et suivi
- ✅ Statistiques détaillées
- ✅ Validation stricte
- ✅ Gestion d'erreurs complète

Utilisez ce guide comme référence rapide pour les opérations courantes.
