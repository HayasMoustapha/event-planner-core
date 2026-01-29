# 📁 ARBORESCENCE COMPLÈTE - EVENT PLANNER CORE SERVICE

## 🎯 Vue d'ensemble

Le **Core Service** est le cœur métier de la plateforme Event Planner SaaS. Il orchestre toutes les opérations principales : événements, invités, tickets, et coordonne les autres services.

```
📁 event-planner-core/
├── 📁 src/                    # Code source principal
├── 📁 database/               # Gestion base de données
├── 📁 tests/                  # Tests automatisés
├── 📁 docs/                   # Documentation
├── 📁 postman/                # Collections API
├── 📁 reports/                # Rapports
├── 📁 logs/                   # Logs applicatifs
└── 📄 Configuration files     # Fichiers de config
```

---

## 📁 DÉTAIL DE L'ARBORESCENCE

### 📁 src/ - Code source principal

```
📁 src/
├── 📁 modules/                # Modules métier
│   ├── 📁 events/             # Gestion événements
│   │   ├── 📄 events.controller.js
│   │   ├── 📄 events.service.js
│   │   ├── 📄 events.routes.js
│   │   ├── 📄 events.model.js
│   │   ├── 📄 events.validation.js
│   │   └── 📄 events.repository.js
│   │
│   ├── 📁 guests/             # Gestion invités
│   │   ├── 📄 guests.controller.js
│   │   ├── 📄 guests.service.js
│   │   ├── 📄 guests.routes.js
│   │   ├── 📄 guests.model.js
│   │   └── 📄 guests.repository.js
│   │
│   ├── 📁 tickets/            # Gestion tickets
│   │   ├── 📄 tickets.controller.js
│   │   ├── 📄 tickets.service.js
│   │   ├── 📄 tickets.routes.js
│   │   ├── 📄 tickets.model.js
│   │   └── 📄 tickets.repository.js
│   │
│   ├── 📁 ticket-types/        # Types de tickets
│   │   ├── 📄 ticket-types.controller.js
│   │   ├── 📄 ticket-types.service.js
│   │   ├── 📄 ticket-types.routes.js
│   │   └── 📄 ticket-types.model.js
│   │
│   ├── 📁 organizers/         # Gestion organisateurs
│   │   ├── 📄 organizers.controller.js
│   │   ├── 📄 organizers.service.js
│   │   ├── 📄 organizers.routes.js
│   │   └── 📄 organizers.model.js
│   │
│   ├── 📁 statistics/         # Statistiques
│   │   ├── 📄 statistics.controller.js
│   │   ├── 📄 statistics.service.js
│   │   ├── 📄 statistics.routes.js
│   │   └── 📄 statistics.repository.js
│   │
│   ├── 📁 reports/            # Rapports
│   │   ├── 📄 reports.controller.js
│   │   ├── 📄 reports.service.js
│   │   ├── 📄 reports.routes.js
│   │   └── 📄 reports.repository.js
│   │
│   ├── 📁 analytics/          # Analytics avancés
│   │   ├── 📄 analytics.controller.js
│   │   ├── 📄 analytics.service.js
│   │   ├── 📄 analytics.routes.js
│   │   └── 📄 analytics.repository.js
│   │
│   ├── 📁 notifications/      # Notifications internes
│   │   ├── 📄 notifications.controller.js
│   │   ├── 📄 notifications.service.js
│   │   ├── 📄 notifications.routes.js
│   │   └── 📄 notifications.repository.js
│   │
│   ├── 📁 workflows/          # Workflows métier
│   │   ├── 📄 workflows.controller.js
│   │   ├── 📄 workflows.service.js
│   │   ├── 📄 workflows.routes.js
│   │   └── 📄 workflows.repository.js
│   │
│   ├── 📁 integrations/       # Intégrations externes
│   │   ├── 📄 integrations.controller.js
│   │   ├── 📄 integrations.service.js
│   │   ├── 📄 integrations.routes.js
│   │   └── 📄 integrations.repository.js
│   │
│   ├── 📁 webhooks/           # Webhooks
│   │   ├── 📄 webhooks.controller.js
│   │   ├── 📄 webhooks.service.js
│   │   ├── 📄 webhooks.routes.js
│   │   └── 📄 webhooks.repository.js
│   │
│   └── 📁 admin/              # Administration
│       ├── 📄 admin.controller.js
│       ├── 📄 admin.service.js
│       ├── 📄 admin.routes.js
│       └── 📄 admin.repository.js
│
├── 📁 controllers/            # Contrôleurs globaux
│   ├── 📄 base.controller.js   # Contrôleur de base
│   ├── 📄 health.controller.js # Health checks
│   └── 📄 metrics.controller.js # Métriques
│
├── 📁 services/               # Services partagés
│   ├── 📄 database.service.js  # Service BDD
│   ├── 📄 cache.service.js     # Service cache
│   ├── 📄 queue.service.js     # Service queues
│   └── 📄 event.service.js     # Service événements
│
├── 📁 clients/                # Clients HTTP externes
│   ├── 📄 auth-client.js       # Client Auth Service
│   ├── 📄 notification-client.js # Client Notification Service
│   ├── 📄 payment-client.js    # Client Payment Service
│   ├── 📄 ticket-generator-client.js # Client Ticket Generator
│   └── 📄 scan-validation-client.js # Client Scan Validation
│
├── 📁 middleware/             # Middlewares
│   ├── 📄 auth.middleware.js   # Authentification
│   ├── 📄 validation.middleware.js # Validation
│   ├── 📄 error.middleware.js  # Gestion erreurs
│   └── 📄 logging.middleware.js # Logging
│
├── 📁 routes/                 # Routes principales
│   ├── 📄 index.js            # Route racine
│   ├── 📄 api.routes.js       # Routes API
│   └── 📄 health.routes.js    # Routes health
│
├── 📁 config/                 # Configuration
│   ├── 📄 database.js         # Config BDD
│   ├── 📄 redis.js            # Config Redis
│   ├── 📄 cache.js            # Config cache
│   ├── 📄 queues.js           # Config queues
│   ├── 📄 clients.js          # Config clients HTTP
│   ├── 📄 validation.js       # Config validation
│   ├── 📄 security.js         # Config sécurité
│   ├── 📄 monitoring.js       # Config monitoring
│   ├── 📄 logging.js          # Config logging
│   └── 📄 index.js            # Config principale
│
├── 📁 database/               # BDD locale
│   ├── 📄 connection.js       # Connexion BDD
│   ├── 📄 migrations.js       # Migrations
│   └── 📄 seeds.js            # Seeds
│
├── 📁 queues/                 # Files d'attente
│   ├── 📄 email-queue.js      # Queue emails
│   ├── 📄 sms-queue.js        # Queue SMS
│   ├── 📄 notification-queue.js # Queue notifications
│   ├── 📄 ticket-queue.js     # Queue tickets
│   └── 📄 report-queue.js     # Queue rapports
│
├── 📁 utils/                  # Utilitaires
│   ├── 📄 logger.js           # Logger
│   ├── 📄 helpers.js          # Helpers
│   ├── 📄 constants.js        # Constantes
│   └── 📄 validators.js       # Validateurs
│
├── 📁 security/               # Sécurité
│   ├── 📄 encryption.js       # Chiffrement
│   ├── 📄 tokens.js           # Tokens
│   └── 📄 permissions.js      # Permissions
│
├── 📁 health/                 # Health checks
│   ├── 📄 health.controller.js
│   ├── 📄 health.routes.js
│   └── 📄 health.service.js
│
├── 📁 monitoring/             # Monitoring
│   ├── 📄 metrics.service.js
│   ├── 📄 prometheus.js
│   └── 📄 dashboard.js
│
├── 📁 shared/                 # Partagé
│   └── 📄 shared-utils.js     # Utilitaires partagés
│
├── 📁 core/                   # Cœur métier
│   └── 📄 business-logic.js    # Logique métier
│
├── 📄 server.js               # Serveur principal
├── 📄 app.js                  # Application Express
├── 📄 bootstrap.js            # Initialisation
└── 📄 index.js                # Export principal
```

### 📁 database/ - Gestion base de données

```
📁 database/
├── 📁 bootstrap/              # Scripts bootstrap
│   ├── 📄 001_create_database.sql
│   ├── 📄 002_create_extensions.sql
│   ├── 📄 003_create_functions.sql
│   └── 📄 004_create_procedures.sql
│
├── 📁 migrations/             # Migrations SQL
│   ├── 📄 001_initial_schema.sql
│   ├── 📄 002_add_soft_delete_columns.sql
│   ├── 📄 003_performance_optimization.sql
│   ├── 📄 003_external_references_validation.sql
│   ├── 📄 004_add_indexes.sql
│   ├── 📄 005_add_constraints.sql
│   └── 📄 006_add_audit_tables.sql
│
├── 📁 schema/                 # Documentation schéma
│   ├── 📄 events.sql
│   ├── 📄 guests.sql
│   ├── 📄 tickets.sql
│   ├── 📄 ticket_types.sql
│   ├── 📄 organizers.sql
│   └── 📄 statistics.sql
│
├── 📁 seeds/                  # Données initiales
│   ├── 📄 001_sample_events.sql
│   ├── 📄 002_sample_guests.sql
│   ├── 📄 003_sample_tickets.sql
│   └── 📄 004_sample_organizers.sql
│
├── 📄 DATABASE_BOOTSTRAP.md   # Documentation BDD
├── 📄 README.md               # README database
└── 📄 connection.js           # Configuration connexion
```

### 📁 tests/ - Tests automatisés

```
📁 tests/
├── 📁 unit/                   # Tests unitaires
│   ├── 📁 modules/
│   │   ├── 📄 events.test.js
│   │   ├── 📄 guests.test.js
│   │   ├── 📄 tickets.test.js
│   │   └── 📄 statistics.test.js
│   ├── 📁 services/
│   │   ├── 📄 database.test.js
│   │   ├── 📄 cache.test.js
│   │   └── 📄 queue.test.js
│   └── 📁 clients/
│       ├── 📄 auth-client.test.js
│       └── 📄 notification-client.test.js
│
├── 📁 integration/            # Tests d'intégration
│   ├── 📄 events.integration.test.js
│   ├── 📄 guests.integration.test.js
│   ├── 📄 tickets.integration.test.js
│   └── 📄 workflows.integration.test.js
│
├── 📁 e2e/                    # Tests end-to-end
│   ├── 📄 event-creation.e2e.test.js
│   ├── 📄 guest-registration.e2e.test.js
│   ├── 📄 ticket-generation.e2e.test.js
│   └── 📄 statistics.e2e.test.js
│
├── 📁 fixtures/               # Données de test
│   ├── 📄 events.json
│   ├── 📄 guests.json
│   ├── 📄 tickets.json
│   └── 📄 organizers.json
│
├── 📁 helpers/                # Helpers de test
│   ├── 📄 database.helper.js
│   ├── 📄 queue.helper.js
│   └── 📄 mock.helper.js
│
├── 📄 setup.js                # Configuration tests
├── 📄 teardown.js             # Nettoyage tests
└── 📄 test.config.js          # Config tests
```

### 📁 docs/ - Documentation

```
📁 docs/
├── 📄 README.md               # Documentation principale
├── 📄 API_ROUTES.md           # Routes API
├── 📄 DEPLOYMENT.md           # Guide déploiement
├── 📄 PERFORMANCE.md          # Guide performance
├── 📄 MONITORING.md           # Guide monitoring
└── 📄 TROUBLESHOOTING.md      # Dépannage
```

### 📁 postman/ - Collections API

```
📁 postman/
├── 📄 Core-Service.postman_collection.json
├── 📄 Core-Service.postman_environment.json
├── 📄 Core-Service.postman_globals.json
└── 📁 examples/
    ├── 📄 event-creation.json
    ├── 📄 guest-registration.json
    └── 📄 ticket-generation.json
```

### 📁 reports/ - Rapports

```
📁 reports/
├── 📁 daily/                  # Rapports quotidiens
├── 📁 weekly/                 # Rapports hebdomadaires
├── 📁 monthly/                # Rapports mensuels
├── 📁 custom/                 # Rapports personnalisés
└── 📄 report-generator.js     # Générateur de rapports
```

---

## 📄 Fichiers de configuration

### 📄 Fichiers principaux

```
📄 package.json              # Dépendances et scripts
📄 package-lock.json          # Lock versions
📄 .env.example              # Variables environnement
📄 .gitignore                # Fichiers ignorés Git
📄 Dockerfile                # Configuration Docker
📄 docker-compose.yml        # Docker Compose
📄 API_ROUTES.md             # Documentation routes API
└── 📄 README.md               # README principal
```

---

## 🎯 Rôle de chaque dossier

### 📁 src/ - Code métier
Contient toute la logique applicative organisée en modules fonctionnels pour une meilleure maintenabilité.

### 📁 database/ - Persistance
Gère tout ce qui concerne la base de données : schéma, migrations, seeds et connexions.

### 📁 tests/ - Qualité
Assure la qualité du code avec des tests unitaires, d'intégration et end-to-end.

### 📁 docs/ - Documentation
Centralise toute la documentation technique et utilisateur.

### 📁 postman/ - API Testing
Facilite les tests manuels et l'exploration des API avec des collections Postman.

### 📁 reports/ - Reporting
Génère et stocke les rapports métier et techniques.

### 📁 logs/ - Logging
Centralise tous les logs applicatifs pour le debugging et le monitoring.

---

## 🚀 Points d'entrée principaux

### 📄 server.js
Point d'entrée principal du serveur Express. Configure et démarre l'application.

### 📄 app.js
Configuration principale de l'application Express : middlewares, routes, etc.

### 📄 bootstrap.js
Script d'initialisation : connexion BDD, migrations, démarrage services.

### 📄 index.js
Export principal pour les tests et l'utilisation comme module.

---

## 🔧 Configuration

### Variables d'environnement clés
- `NODE_ENV` : Environnement (development/production)
- `PORT` : Port d'écoute (3001)
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` : BDD
- `REDIS_URL` : Redis
- `AUTH_SERVICE_URL` : Service Auth
- `NOTIFICATION_SERVICE_URL` : Service Notification
- `PAYMENT_SERVICE_URL` : Service Payment
- `TICKET_GENERATOR_URL` : Service Ticket Generator
- `SCAN_VALIDATION_URL` : Service Scan Validation

### Scripts npm principaux
- `npm start` : Démarrage production
- `npm run dev` : Développement avec nodemon
- `npm test` : Tests unitaires
- `npm run test:integration` : Tests intégration
- `npm run test:e2e` : Tests E2E
- `npm run build` : Build production
- `npm run migrate` : Migrations BDD
- `npm run seed` : Seeding BDD

---

## 🔄 Communication inter-services

Le Core Service communique avec les autres services via :
- **HTTP/REST** : Pour les requêtes synchrones
- **Redis Queues** : Pour les traitements asynchrones
- **Webhooks** : Pour les notifications d'événements

### Clients HTTP configurés
- `auth-client.js` : Authentification et autorisation
- `notification-client.js` : Envoi de notifications
- `payment-client.js` : Traitement des paiements
- `ticket-generator-client.js` : Génération de tickets
- `scan-validation-client.js` : Validation des tickets

---

**Version** : 1.0.0  
**Dernière mise à jour** : 29 janvier 2026
