# Documentation Event Planner Core

## 📚 Index de la Documentation

Bienvenue dans la documentation complète d'Event Planner Core. Cette documentation est conçue pour les développeurs, testeurs, administrateurs système et toute personne travaillant avec le service.

## 🚀 Démarrage Rapide

Pour commencer rapidement :

1. **Installation** : Consultez le [README.md](../README.md) pour l'installation et la configuration
2. **API Reference** : Voir [API Reference](./api-reference.md) pour tous les endpoints
3. **Développement** : Consultez le [Guide Développeur](./developer-guide.md) pour contribuer au code

## 📋 Documentation Disponible

### 📖 Guides Essentiels

| Document | Description | Public |
|----------|-------------|---------|
| [API Reference](./api-reference.md) | Documentation complète des endpoints API | Développeurs, Testeurs |
| [Guide Développeur](./developer-guide.md) | Guide pour contribuer au code | Développeurs |
| [Schéma de Données](./database-schema.md) | Structure complète de la base de données | Développeurs, DBAs |
| [Déploiement](./deployment.md) | Guide de déploiement en production | DevOps, Admins |

### 🔧 Documentation Technique

| Document | Description | Public |
|----------|-------------|---------|
| [Sécurité](./security.md) | Implémentation sécurité et best practices | Développeurs, SecOps |
| [Monitoring](./monitoring.md) | Configuration monitoring et alerting | DevOps, SRE |
| [Testing](./testing.md) | Stratégie de testing et guides | QA, Développeurs |
| [Dépannage](./troubleshooting.md) | Problèmes communs et solutions | Tous |

---

## 🎯 Par Outil

### Pour les Développeurs

1. **Commencer ici** : [Guide Développeur](./developer-guide.md)
2. **Référence API** : [API Reference](./api-reference.md)
3. **Base de données** : [Schéma de Données](./database-schema.md)
4. **Testing** : [Testing Guide](./testing.md)

### Pour les DevOps/SRE

1. **Déploiement** : [Déploiement](./deployment.md)
2. **Monitoring** : [Monitoring](./monitoring.md)
3. **Sécurité** : [Sécurité](./security.md)
4. **Dépannage** : [Dépannage](./troubleshooting.md)

### Pour les Testeurs/QA

1. **API Testing** : [API Reference](./api-reference.md#testing)
2. **Testing Strategy** : [Testing Guide](./testing.md)
3. **Security Testing** : [Sécurité](./security.md#security-testing)
4. **Performance Testing** : [Testing Guide](./testing.md#performance-tests)

---

## 🏗️ Architecture du Service

Event Planner Core est le service central de l'architecture microservices Event Planner :

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │  Event Planner  │    │   Mobile App    │
│   (React/Vue)   │◄──►│      Core      │◄──►│   (React Native) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────────────────┐
                    │        Services Externes        │
                    │  ┌─────────┐ ┌─────────────────┐   │
                    │  │  Auth   │ │ Notifications  │   │
                    │  │ Service │ │   Service     │   │
                    │  └─────────┘ └─────────────────┘   │
                    │  ┌─────────┐ ┌─────────────────┐   │
                    │  │ Ticket  │ │   Payment     │   │
                    │  │ Generator│ │   Service     │   │
                    │  └─────────┘ └─────────────────┘   │
                    └─────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────────────┐
                    │         Infrastructure          │
                    │  ┌─────────┐ ┌─────────────────┐   │
                    │  │PostgreSQL│ │   Prometheus   │   │
                    │  │  Database│ │   + Grafana    │   │
                    │  └─────────┘ └─────────────────┘   │
                    │  ┌─────────┐ ┌─────────────────┐   │
                    │  │  Redis  │ │   ELK Stack    │   │
                    │  │  Cache  │ │   (Logs)       │   │
                    │  └─────────┘ └─────────────────┘   │
                    └─────────────────────────────────┘
```

### Modules Principaux

1. **Events** - Gestion des événements
2. **Guests** - Gestion des participants
3. **Tickets** - Gestion des billets
4. **Marketplace** - Templates et designers
5. **Admin** - Administration et monitoring

---

## 🔧 Quick Reference

### Variables d'Environnement Essentielles

```bash
# Service
PORT=3001
NODE_ENV=production

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=event_planner_core
DB_USER=postgres
DB_PASSWORD=secure_password

# Authentification
AUTH_SERVICE_URL=https://auth.eventplanner.com
JWT_SECRET=votre_secret_32_caracteres

# Sécurité
CORS_ORIGIN=https://app.eventplanner.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Health Checks

```bash
# Health check simple
curl http://localhost:3001/health

# Health check détaillé
curl http://localhost:3001/health/detailed

# Métriques Prometheus
curl http://localhost:9090/metrics
```

### Commandes Utiles

```bash
# Démarrer en développement
npm run dev

# Démarrer en production
npm start

# Lancer les tests
npm test

# Vérifier la configuration
npm run validate-config

# Builder pour production
docker build -t event-planner-core .
```

---

## 📊 Statistiques du Service

### Performance Cibles

| Métrique | Cible | Actuel |
|----------|-------|--------|
| Temps de réponse API | < 200ms (95th percentile) | ✅ |
| Taux d'erreur | < 1% | ✅ |
| Uptime | > 99.9% | ✅ |
| Couverture de code | > 80% | ✅ |

### Sécurité

| Métrique | Statut |
|----------|--------|
| Authentification JWT | ✅ Implémenté |
| Rate Limiting | ✅ Configuré |
| Input Validation | ✅ Actif |
| SQL Injection Protection | ✅ Actif |
| XSS Protection | ✅ Actif |

---

## 🔄 Cycle de Vie

### Développement

1. **Feature Branch** → **Code Review** → **Tests** → **Merge**
2. **Tests Automatisés** → **CI/CD** → **Déploiement Staging**
3. **Validation Staging** → **Déploiement Production**

### Monitoring

1. **Health Checks** → **Métriques** → **Alertes**
2. **Logs Structurés** → **Dashboard Grafana** → **Incident Response**

---

## 🤝 Contribuer

### Comment Contribuer

1. Forker le projet
2. Créer une branche feature
3. Suivre le [Guide Développeur](./developer-guide.md)
4. Ajouter des tests
5. Soumettre une Pull Request

### Standards de Code

- **ESLint** + **Prettier** configurés
- **Tests** requis pour tout changement
- **Documentation** à jour
- **Messages de commit** clairs

---

## 📞 Support

### Obtenir de l'Aide

1. **Documentation** - Consultez les guides ci-dessus
2. **GitHub Issues** - Pour les bugs et features
3. **Slack** - Pour les discussions en temps réel
4. **Email** - support@eventplanner.com

### Niveaux de Support

| Niveau | Canal | Temps de réponse |
|--------|-------|----------------|
| **Critical** | Slack + Phone | < 1 heure |
| **High** | Slack + Email | < 4 heures |
| **Medium** | GitHub Issues | < 24 heures |
| **Low** | GitHub Issues | < 72 heures |

---

## 📈 Feuille de Route

### Prochaines Versions

- **v1.1.0** - Améliorations performance
- **v1.2.0** - Nouveaux endpoints marketplace
- **v2.0.0** - Architecture microservices complète

### En Développement

- [ ] Cache Redis distribué
- [ ] Distributed tracing
- [ ] GraphQL API
- [ ] Real-time notifications

---

## 📚 Ressources Externes

### Documentation Officielle

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

### Outils Recommandés

- **API Testing** : Postman, Insomnia
- **Database Management** : pgAdmin, DBeaver
- **Monitoring** : Grafana, Kibana
- **Development** : VS Code, WebStorm

---

## 🏆 Bonnes Pratiques

### Pour les Développeurs

- ✅ Toujours valider les entrées
- ✅ Utiliser des requêtes paramétrées
- ✅ Gérer les erreurs proprement
- ✅ Logger les événements importants
- ✅ Écrire des tests unitaires

### Pour les Ops

- ✅ Monitoring proactif
- ✅ Backup régulier
- ✅ Sécurité par défaut
- ✅ Documentation à jour
- ✅ Tests de charge réguliers

---

## 📝 Notes de Version

### v1.0.0 (2024-01-25)

- ✅ Version initiale complète
- ✅ Documentation complète
- ✅ Tests automatisés
- ✅ Monitoring configuré
- ✅ Sécurité implémentée

---

## 🔗 Liens Rapides

- **Repository** : [GitHub](https://github.com/eventplanner/core)
- **API Live** : [https://api.eventplanner.com](https://api.eventplanner.com)
- **Monitoring** : [Grafana Dashboard](https://grafana.eventplanner.com)
- **Documentation** : [docs.eventplanner.com](https://docs.eventplanner.com)

---

*Dernière mise à jour : 25 Janvier 2024*

Pour toute question ou suggestion d'amélioration de cette documentation, n'hésitez pas à créer une issue ou à contacter l'équipe de documentation.
