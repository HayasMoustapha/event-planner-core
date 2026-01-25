# Event Planner Core API

Service cœur métier de Event Planner - Orchestration des événements et gestion des règles métier.

## 🏗️ Architecture Overview

Event Planner Core est le service central de l'architecture microservices qui gère :

- **Gestion des événements** (CRUD, états, permissions)
- **Gestion des participants** (invitations, check-in, statuts)
- **Gestion des billets** (types, génération, validation)
- **Marketplace** (templates, designers, achats)
- **Administration** (stats, modération, logs)

### Stack Technique
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Base de données**: PostgreSQL 12+
- **ORM**: SQL natif (performance et contrôle maximal)
- **Container**: Docker & Docker Compose
- **Monitoring**: Prometheus + Health checks

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

---

## 📋 Prérequis

- Node.js 18+
- PostgreSQL 12+
- Docker & Docker Compose
- Service Event Planner Auth (port 3000)

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone <repository-url>
cd event-planner-core
npm install
cp .env.example .env
```

### 2. Configuration
```bash
# Éditer .env avec votre configuration
PORT=3001
DB_HOST=localhost
DB_NAME=event_planner_core
AUTH_SERVICE_URL=http://localhost:3000
```

### 3. Démarrage
```bash
# Avec Docker (recommandé)
docker-compose up -d

# En développement
npm run dev

# En production
npm start
```

### 4. Vérification
```bash
# Health check
curl http://localhost:3001/health

# API documentation
curl http://localhost:3001/docs
```

---

## 📚 Documentation Complète

Pour une documentation détaillée, consultez le dossier `/docs` :

- **[API Reference](./docs/api-reference.md)** - Documentation complète des endpoints
- **[Guide Développeur](./docs/developer-guide.md)** - Guide pour contribuer au code
- **[Schéma de Données](./docs/database-schema.md)** - Structure complète de la base de données
- **[Déploiement](./docs/deployment.md)** - Guide de déploiement en production
- **[Sécurité](./docs/security.md)** - Détails sur l'implémentation sécurité
- **[Monitoring](./docs/monitoring.md)** - Configuration monitoring et alerting
- **[Testing](./docs/testing.md)** - Guide pour les tests
- **[Dépannage](./docs/troubleshooting.md)** - Problèmes communs et solutions

---

## ⚙️ Configuration Essentielle

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
JWT_SECRET=your_jwt_secret_for_validation

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🔌 API Endpoints Principaux

### Health & Monitoring
- `GET /health` - Health check simple
- `GET /health/detailed` - Health check complet
- `GET /metrics` - Métriques Prometheus

### Modules Métier
- `GET /api/events` - Gestion des événements
- `GET /api/guests` - Gestion des participants
- `GET /api/tickets` - Gestion des billets
- `GET /api/marketplace` - Marketplace
- `GET /api/admin` - Administration

> **Note**: Pour la documentation complète des API avec exemples et schémas, voir [API Reference](./docs/api-reference.md)

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

## 🧪 Testing

```bash
# Tous les tests
npm test

# Tests en continu
npm run test:watch

# Couverture de code
npm run test:coverage

# Tests d'intégration
npm run test:integration
```

---

## 🚨 Production Checklist

### Configuration
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` fort (32+ caractères)
- [ ] `DB_PASSWORD` sécurisé
- [ ] `AUTH_SERVICE_TOKEN` configuré

### Sécurité
- [ ] HTTPS activé
- [ ] Firewall configuré
- [ ] Rate limiting activé
- [ ] Monitoring activé

### Monitoring
- [ ] Prometheus configuré
- [ ] Health checks activés
- [ ] Logs configurés
- [ ] Alertes configurées

---

## 🤝 Contributing

1. Fork le projet
2. Créer une feature branch (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branch (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

> **Important**: Consultez le [Guide Développeur](./docs/developer-guide.md) avant de contribuer

---

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Consulter le [guide de dépannage](./docs/troubleshooting.md)
- Contacter l'équipe de développement

---

**Event Planner Core** - Service robuste et sécurisé pour la gestion d'événements 🎉
