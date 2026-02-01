# 📋 Guide d'Import des Invités par Fichier CSV

## 🎯 Objectif

Ce guide explique comment importer des invités en masse dans un événement en utilisant un fichier CSV. L'import permet d'ajouter rapidement des centaines d'invités avec validation automatique des données.

---

## 🚀 Endpoint d'Import

### URL
```
POST /api/guests/events/{eventId}/guests/import
```

### Headers
```http
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Body (FormData)
```
file: {fichier_csv}
```

### Permissions Requises
- `guests.create` - Création d'invités
- Authentification obligatoire

---

## 📄 Structure du Fichier CSV

### Colonnes Obligatoires
| Colonne | Description | Exemple | Validation |
|---------|-------------|---------|------------|
| `first_name` | Prénom de l'invité | `Jean` | Requis, non vide |
| `last_name` | Nom de l'invité | `Dupont` | Requis, non vide |
| `email` | Email de l'invité | `jean.dupont@example.com` | Requis, format valide |

### Colonnes Optionnelles
| Colonne | Description | Exemple | Validation |
|---------|-------------|---------|------------|
| `phone` | Téléphone de l'invité | `+33612345678` | Optionnel, format international |

### Exemple de Fichier CSV
```csv
first_name,last_name,email,phone
Jean,Dupont,jean.dupont@example.com,+33612345678
Marie,Curie,marie.curie@example.com,+33687654321
Albert,Einstein,albert.einstein@example.com,+33611223344
```

---

## ✅ Format des Données

### Email
- Doit être un email valide
- Format : `nom@domaine.extension`
- Insensible à la casse (automatiquement converti en minuscules)

### Téléphone
- Format international accepté
- Doit commencer par `+` pour les numéros internationaux
- Espaces, tirets et points autorisés
- Longueur minimale : 7 caractères

**Exemples valides :**
- `+33612345678`
- `+33 6 12 34 56 78`
- `+336-12-34-56-78`
- `+336.12.34.56.78`

---

## 🔄 Processus d'Import

### 1. Upload du Fichier
- Le fichier est uploadé via multipart/form-data
- Taille maximale : 10MB
- Extensions acceptées : `.csv`, `.xls`, `.xlsx`

### 2. Parsing et Validation
- Le fichier est parsé ligne par ligne
- Validation des headers obligatoires
- Validation des données de chaque ligne

### 3. Déduplication
- Vérification des emails existants pour l'événement
- Les doublons sont ignorés avec notification

### 4. Import Transactionnel
- Création des guests en base de données
- Association automatique à l'événement (event_guests)
- Transaction SQL pour garantir la cohérence

### 5. Nettoyage
- Suppression automatique du fichier temporaire
- Gestion des erreurs sans corruption des données

---

## 📊 Réponse de l'API

### Succès
```json
{
  "success": true,
  "message": "Guest import completed",
  "data": {
    "summary": {
      "total_rows": 5,
      "imported": 4,
      "ignored": 1,
      "duplicates": 0,
      "errors": 0
    },
    "details": {
      "imported_guests": [
        {
          "id": "123",
          "first_name": "Jean",
          "last_name": "Dupont",
          "email": "jean.dupont@example.com",
          "phone": "+33612345678",
          "status": "pending"
        }
      ],
      "parsing_errors": [],
      "import_errors": [],
      "duplicate_guests": []
    },
    "metadata": {
      "totalRows": 5,
      "validRows": 4,
      "errorRows": 1
    }
  }
}
```

### Erreur
```json
{
  "success": false,
  "error": "Missing required headers: first_name, last_name",
  "details": {
    "headers": ["name", "email"],
    "missing": ["first_name", "last_name"]
  }
}
```

---

## ⚠️ Cas d'Erreurs

### Erreurs de Parsing
- **Headers manquants** : Colonnes obligatoires absentes
- **Format invalide** : Fichier non CSV ou corrompu
- **Encodage** : Problèmes d'encodage des caractères

### Erreurs de Validation
- **Email requis** : Ligne sans email
- **Email invalide** : Format d'email incorrect
- **Téléphone invalide** : Format de téléphone incorrect

### Erreurs d'Import
- **Doublon** : Email déjà existant pour l'événement
- **Contrainte BD** : Erreur de base de données
- **Transaction** : Échec de transaction SQL

---

## 🎯 Bonnes Pratiques

### Préparation du Fichier
1. **Headers** : Utiliser exactement les noms de colonnes requis
2. **Encodage** : Sauvegarder en UTF-8
3. **Format** : Utiliser des virgules comme séparateurs
4. **Nettoyage** : Supprimer les lignes vides

### Validation Avant Import
1. **Vérifier les emails** : Assurer la validité des adresses
2. **Normaliser les téléphones** : Format international
3. **Supprimer les doublons** : Vérifier manuellement si possible

### Performance
1. **Taille limite** : 10MB maximum par fichier
2. **Lots** : Traitement par lots de 100 lignes
3. **Temps** : Prévoir 1-2 secondes par 100 invités

---

## 🛠️ Exemples d'Utilisation

### cURL
```bash
curl -X POST http://localhost:3001/api/guests/events/123/guests/import \
  -H "Authorization: Bearer {token}" \
  -F "file=@invites.csv"
```

### JavaScript (Fetch)
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch(`/api/guests/events/${eventId}/guests/import`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

### Postman
1. Méthode : `POST`
2. URL : `http://localhost:3001/api/guests/events/123/guests/import`
3. Headers :
   - `Authorization: Bearer {token}`
4. Body :
   - Type : `form-data`
   - Clé : `file`
   - Type : `File`
   - Valeur : Votre fichier CSV

---

## 📈 Monitoring et Débogage

### Logs Serveur
- Parsing du fichier
- Validation des lignes
- Création des guests
- Erreurs détaillées avec contexte

### Métriques Disponibles
- `total_rows` : Nombre total de lignes
- `imported` : Invités importés avec succès
- `ignored` : Lignes ignorées (doublons)
- `errors` : Erreurs de parsing ou d'import

### Débogage
1. **Vérifier les headers** du fichier CSV
2. **Valider les formats** (email, téléphone)
3. **Contrôler la taille** du fichier (< 10MB)
4. **Vérifier les permissions** de l'utilisateur

---

## 🔧 Configuration

### Limites
- Taille fichier : 10MB
- Fichiers simultanés : 1
- Formats supportés : CSV, XLS, XLSX

### Extensions MIME Acceptées
- `text/csv`
- `application/csv`
- `text/plain` (pour curl)
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

## 🎉 Résumé

L'import CSV permet d'ajouter rapidement des invités avec :
- ✅ Validation automatique des données
- ✅ Gestion des erreurs détaillée
- ✅ Support des formats multiples
- ✅ Transaction SQL pour la cohérence
- ✅ Rapport d'import complet
- ✅ Intégration automatique avec les événements

Pour une utilisation optimale, préparez votre fichier CSV en suivant les spécifications ci-dessus et utilisez les bonnes pratiques recommandées.
