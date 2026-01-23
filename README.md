# Event Planner Core API

Service cœur métier de Event Planner - Orchestration des événements et gestion des règles métier.

## Architecture

- Node.js + Express

### 🛡️ **Sécurité Avancée**
- **Détection d'attaques** en temps réel (SQL injection, XSS, command injection)
- **Protection brute force** avec lockout automatique
- **IP blacklist** dynamique
- **Input sanitization** et validation renforcée
- **Rate limiting** différencié par type de requête
- **Security headers** (Helmet, CSP)

### 📊 **Monitoring & Observabilité**
- **Métriques Prometheus** complètes
- **Health checks** avancés (base de données, services externes, système)
- **Kubernetes ready** (readiness/liveness probes)
- **Logging structuré** avec niveaux de sévérité
- **Error tracking** avec IDs uniques

### 🔧 **Infrastructure**
- **Configuration validation** au démarrage
- **Error handling** centralisé et sécurisé
- **Docker optimisé** pour production
- **Environment validation** complète

---

## 📋 Prérequis

- Node.js 18+
- PostgreSQL 12+
- Docker & Docker Compose
- Service Event Planner Auth (port 3000)

---

## 🚀 Installation

### 1. Cloner le projet
```bash
git clone <repository-url>
cd event-planner-core
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
```bash
cp .env.example .env
# Éditer .env avec votre configuration
```

### 4. Démarrer avec Docker
```bash
docker-compose up -d
```

### 5. Démarrer en développement
```bash
npm run dev
```

---

## ⚙️ Configuration

### Variables d'Environnement Requises

```bash
# Serveur
PORT=3001
NODE_ENV=development

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=event_planner_core
DB_USER=postgres
DB_PASSWORD=postgres

# Service d'authentification
AUTH_SERVICE_URL=http://localhost:3000
AUTH_SERVICE_TOKEN=your_auth_service_token
JWT_SECRET=your_jwt_secret_for_validation

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=logs

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Variables Optionnelles

```bash
# Sécurité
ENABLE_SECURITY_MIDDLEWARE=true
BLOCK_ON_HIGH_RISK=true
SANITIZE_INPUT=true

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Docker
DB_SSL=false
DB_MAX_CONNECTIONS=20
```

---

## 🔌 API Endpoints

### Health Checks
- `GET /health` - Health check simple
- `GET /health/detailed` - Health check complet de tous les composants
- `GET /health/ready` - Readiness probe (Kubernetes)
- `GET /health/live` - Liveness probe (Kubernetes)
- `GET /health/components/:component` - Health check d'un composant spécifique

### Métriques
- `GET /metrics` - Métriques Prometheus

### API Routes
- `GET /api/events` - Lister les événements
- `POST /api/events` - Créer un événement
- `GET /api/guests` - Gérer les participants
- `GET /api/tickets` - Gestion des billets
- `GET /api/marketplace` - Marketplace de templates
- `GET /api/admin` - Administration

---

## 🛡️ Sécurité

### Middleware de Sécurité

Le service inclut plusieurs couches de protection :

1. **Security Middleware** - Analyse toutes les requêtes pour détecter :
   - SQL injection
   - XSS attacks
   - Command injection
   - Path traversal
   - LDAP injection

2. **Brute Force Protection** - Protège contre :
   - Tentatives de connexion répétées
   - Lockout automatique (30 minutes par défaut)
   - Rate limiting spécifique à l'auth

3. **IP Blacklist** - Gestion dynamique des IPs malveillantes

4. **Input Validation** - Validation et sanitization des entrées

### Configuration Sécurité

```javascript
// Dans app.js
app.use(securityMiddleware.security({
  enabled: true,
  logLevel: 'warn',
  blockOnHighRisk: true,
  sanitizeInput: true
}));

// Protection brute force
app.use('/api/auth', securityMiddleware.bruteForceProtection({
  identifier: 'email',
  maxAttempts: 5,
  windowMs: 900000,
  lockoutMs: 1800000
}));
```

---

## 📊 Monitoring

### Métriques Prometheus

Les métriques suivantes sont disponibles :

- `http_request_duration_seconds` - Durée des requêtes HTTP
- `http_requests_total` - Nombre total de requêtes
- `active_connections` - Connexions actives
- `security_events_total` - Événements de sécurité
- `authentication_attempts_total` - Tentatives d'authentification
- `database_operations_total` - Opérations base de données
- `business_operations_total` - Opérations métier
- `errors_total` - Erreurs par type et sévérité

### Health Checks

Le service vérifie automatiquement :

- **Base de données** - Connexion et temps de réponse
- **Service Auth** - Disponibilité et temps de réponse
- **Système de fichiers** - Lecture/écriture
- **Mémoire** - Utilisation heap et système
- **CPU** - Load average
- **Disque** - Espace disponible

---

## 🐳 Docker

### Docker Compose

```yaml
version: '3.8'
services:
  event-planner-core:
    build: .
    ports:
      - "3001:3001"
      - "9090:9090"  # Metrics
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - AUTH_SERVICE_URL=http://event-planner-auth:3000
    depends_on:
      - postgres
      - event-planner-auth

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: event_planner_core
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
```

### Build & Run

```bash
# Build l'image
docker build -t event-planner-core .

# Run avec Docker Compose
docker-compose up -d

# Vérifier les logs
docker-compose logs -f event-planner-core
```

---

## 🔧 Développement

### Scripts Disponibles

```bash
npm start          # Production
npm run dev        # Développement avec nodemon
npm test           # Tests
npm run test:watch # Tests en continu
npm run test:coverage # Tests avec couverture
```

### Structure du Projet

```
src/
├── config/          # Configuration et validation
├── middleware/      # Middlewares (sécurité, auth, etc.)
├── modules/         # Modules métier
├── security/        # Services de sécurité
├── health/          # Health checks
├── utils/           # Utilitaires (erreurs, etc.)
└── app.js           # Application principale
```

---

## 🚨 Production

### Checklist de déploiement

1. **Configuration**
   - [ ] `NODE_ENV=production`
   - [ ] `JWT_SECRET` fort (32+ caractères)
   - [ ] `DB_PASSWORD` sécurisé
   - [ ] `AUTH_SERVICE_TOKEN` configuré

2. **Sécurité**
   - [ ] HTTPS activé
   - [ ] Firewall configuré
   - [ ] Rate limiting activé
   - [ ] Monitoring activé

3. **Monitoring**
   - [ ] Prometheus configuré
   - [ ] Health checks activés
   - [ ] Logs configurés
   - [ ] Alertes configurées

4. **Performance**
   - [ ] Connection pooling configuré
   - [ ] Cache activé si nécessaire
   - [ ] Load testing effectué

---

## 🐛 Dépannage

### Problèmes Communs

1. **Configuration invalide**
   ```bash
   # Vérifier la configuration
   npm run validate-config
   ```

2. **Service Auth inaccessible**
   ```bash
   # Vérifier la connexion
   curl http://localhost:3000/health
   ```

3. **Base de données inaccessible**
   ```bash
   # Vérifier la connexion DB
   psql -h localhost -U postgres -d event_planner_core
   ```

### Logs

```bash
# Logs de l'application
docker-compose logs event-planner-core

# Logs de santé
curl http://localhost:3001/health/detailed
```

---

## 📝 Licence

MIT License - voir fichier LICENSE

---

## 🤝 Contributing

1. Fork le projet
2. Créer une feature branch
3. Commit les changements
4. Push vers la branch
5. Ouvrir une Pull Request

---

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Contacter l'équipe de développement

---

**Event Planner Core** - Service robuste et sécurisé pour la gestion d'événements 🎉r
