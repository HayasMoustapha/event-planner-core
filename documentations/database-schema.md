# Schéma de Données - Event Planner Core

## Overview

Ce document décrit le schéma complet de la base de données PostgreSQL utilisée par Event Planner Core, aligné avec le diagramme d'architecture.

## Structure Générale

La base de données est organisée en 5 modules principaux :

1. **Events & Guests** - Gestion des événements et participants
2. **Tickets Management** - Gestion des billets et types
3. **Marketplace** - Templates, designers et transactions
4. **Admin & System** - Logs et administration
5. **Relations** - Tables de jonction

---

## Module Events & Guests

### Table: events

Table centrale des événements.

```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    organizer_id BIGINT NOT NULL, -- Foreign key to Auth Service users table
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

**Champs:**
- `id`: Identifiant unique auto-incrémenté
- `title`: Titre de l'événement (requis)
- `description`: Description détaillée (optionnel)
- `event_date`: Date et heure de l'événement (requis)
- `location`: Lieu de l'événement (requis)
- `status`: Statut (`draft`, `published`, `archived`)
- `organizer_id`: ID de l'organisateur (clé étrangère)
- `uid`: UUID universel unique
- `created_at/updated_at`: Timestamps automatiques
- `created_by/updated_by**: Utilisateurs de création/modification

**Indexes:**
```sql
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_created_at ON events(created_at);
```

### Table: guests

Table des participants/invités.

```sql
CREATE TABLE guests (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

**Champs:**
- `first_name`: Prénom (requis)
- `last_name`: Nom (optionnel)
- `email`: Email unique (requis)
- `phone`: Téléphone unique (optionnel)
- `status`: Statut (`pending`, `confirmed`, `cancelled`)

**Indexes:**
```sql
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_phone ON guests(phone);
CREATE INDEX idx_guests_status ON guests(status);
```

### Table: event_guests

Table de jonction entre événements et invités.

```sql
CREATE TABLE event_guests (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    is_present BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    invitation_code VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

**Champs:**
- `event_id`: ID de l'événement
- `guest_id`: ID de l'invité
- `is_present`: Indique si l'invité est présent
- `check_in_time`: Heure de check-in
- `invitation_code`: Code d'invitation unique
- `status`: Statut de l'invitation

**Contraintes:**
```sql
CREATE UNIQUE INDEX idx_event_guests_unique ON event_guests(event_id, guest_id);
CREATE INDEX idx_event_guests_event_id ON event_guests(event_id);
CREATE INDEX idx_event_guests_guest_id ON event_guests(guest_id);
CREATE INDEX idx_event_guests_invitation_code ON event_guests(invitation_code);
```

### Table: invitations

Table des invitations envoyées.

```sql
CREATE TABLE invitations (
    id BIGSERIAL PRIMARY KEY,
    event_guest_id BIGINT NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
    invitation_code VARCHAR(255) UNIQUE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'failed')),
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

---

## Module Tickets Management

### Table: ticket_types

Types de billets disponibles pour un événement.

```sql
CREATE TABLE ticket_types (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('free', 'paid', 'donation')),
    quantity INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    available_from TIMESTAMP WITH TIME ZONE,
    available_to TIMESTAMP WITH TIME ZONE,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

**Champs:**
- `event_id`: Événement associé
- `name`: Nom du type de billet
- `description`: Description
- `type`: Type (`free`, `paid`, `donation`)
- `quantity`: Quantité disponible
- `price`: Prix (0 pour gratuit)
- `currency`: Devise (ISO 4217)
- `available_from/to`: Période de disponibilité

### Table: tickets

Billets individuels générés.

```sql
CREATE TABLE tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_code VARCHAR(255) UNIQUE NOT NULL,
    qr_code_data TEXT,
    ticket_type_id BIGINT NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
    ticket_template_id BIGINT REFERENCES ticket_templates(id) ON DELETE SET NULL,
    event_guest_id BIGINT NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
    is_validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP WITH TIME ZONE,
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

**Champs:**
- `ticket_code`: Code unique du billet
- `qr_code_data`: Données QR code
- `ticket_type_id`: Type de billet
- `ticket_template_id`: Template utilisé (optionnel)
- `event_guest_id`: Invité associé
- `is_validated`: Statut de validation
- `validated_at`: Heure de validation

### Table: ticket_templates

Templates de design pour les billets.

```sql
CREATE TABLE ticket_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    preview_url VARCHAR(500),
    source_files_path VARCHAR(500),
    is_customizable BOOLEAN DEFAULT FALSE,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

---

## Module Marketplace

### Table: designers

Designers de templates (étend les utilisateurs).

```sql
CREATE TABLE designers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE, -- Foreign key to Auth Service users table
    brand_name VARCHAR(255) NOT NULL,
    portfolio_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

### Table: templates

Templates vendus sur la marketplace.

```sql
CREATE TABLE templates (
    id BIGSERIAL PRIMARY KEY,
    designer_id BIGINT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    preview_url VARCHAR(500),
    source_files_path VARCHAR(500),
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

**Champs:**
- `designer_id`: Designer créateur
- `price`: Prix du template
- `status`: Statut de modération

### Table: purchases

Achats de templates.

```sql
CREATE TABLE purchases (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL, -- Foreign key to Auth Service users table
    template_id BIGINT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    transaction_id VARCHAR(255) UNIQUE,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

### Table: reviews

Avis sur les templates.

```sql
CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL, -- Foreign key to Auth Service users table
    template_id BIGINT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);
```

**Contraintes:**
```sql
CREATE UNIQUE INDEX idx_reviews_unique ON reviews(user_id, template_id);
```

---

## Module Admin & System

### Table: system_logs

Logs système pour monitoring et audit.

```sql
CREATE TABLE system_logs (
    id BIGSERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    context JSONB,
    created_by BIGINT, -- Foreign key to Auth Service users table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Champs:**
- `level`: Niveau de log (`info`, `warning`, `error`)
- `message`: Message du log
- `context`: Contexte additionnel (JSON)
- `created_by`: Utilisateur à l'origine (si applicable)

---

## Relations et Clés Étrangères

### Diagramme des Relations

```
Users (Auth Service)
├── events (organizer_id)
├── guests (created_by/updated_by)
├── designers (user_id)
├── purchases (user_id)
├── reviews (user_id)
└── system_logs (created_by)

events
├── ticket_types (event_id)
└── event_guests (event_id)

guests
└── event_guests (guest_id)

event_guests
├── invitations (event_guest_id)
└── tickets (event_guest_id)

ticket_types
└── tickets (ticket_type_id)

ticket_templates
└── tickets (ticket_template_id)

designers
└── templates (designer_id)

templates
├── purchases (template_id)
└── reviews (template_id)
```

### Contraintes d'Intégrité

```sql
-- Contraintes CASCADE pour suppression automatique
ALTER TABLE event_guests ADD CONSTRAINT fk_event_guests_event 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE event_guests ADD CONSTRAINT fk_event_guests_guest 
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

-- Contraintes SET NULL pour préserver les données
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_template 
    FOREIGN KEY (ticket_template_id) REFERENCES ticket_templates(id) ON DELETE SET NULL;
```

---

## Triggers et Fonctions

### Trigger: updated_at automatique

```sql
-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Application sur toutes les tables
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... etc pour toutes les tables
```

---

## Performance et Indexation

### Index Stratégiques

```sql
-- Index composites pour les requêtes fréquentes
CREATE INDEX idx_event_guests_event_status ON event_guests(event_id, status);
CREATE INDEX idx_tickets_type_validated ON tickets(ticket_type_id, is_validated);
CREATE INDEX idx_templates_designer_status ON templates(designer_id, status);

-- Index sur les champs JSONB
CREATE INDEX idx_system_logs_context_gin ON system_logs USING GIN(context);
```

### Partitionnement (pour grandes échelles)

```sql
-- Partitionnement des logs par mois
CREATE TABLE system_logs_y2024m01 PARTITION OF system_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE system_logs_y2024m02 PARTITION OF system_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

---

## Sécurité des Données

### Rôles et Permissions

```sql
-- Rôle lecture seule pour les services de monitoring
CREATE ROLE readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- Rôle application avec permissions limitées
CREATE ROLE app_user;
GRANT SELECT, INSERT, UPDATE ON events TO app_user;
GRANT SELECT ON events TO app_user;
-- ... etc selon les besoins
```

### Chiffrement

```sql
-- Extension pour le chiffrement
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Exemple de colonne chiffrée
ALTER TABLE guests ADD COLUMN encrypted_phone TEXT;
UPDATE guests SET encrypted_phone = pgp_sym_encrypt(phone, 'encryption_key');
```

---

## Migration et Versioning

### Structure des Migrations

```
database/migrations/
├── 001_initial_schema.sql
├── 002_add_indexes.sql
├── 003_add_templates_table.sql
└── 004_add_audit_triggers.sql
```

### Script de Migration

```sql
-- Table de suivi des migrations
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vérification avant application
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '001_initial_schema') THEN
        -- Appliquer la migration
        EXECUTE 'CREATE TABLE events (...)';
        INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');
    END IF;
END $$;
```

---

## Backup et Restauration

### Script de Backup

```bash
#!/bin/bash
# backup.sh
DB_NAME="event_planner_core"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup complet
pg_dump -h localhost -U postgres -d $DB_NAME > $BACKUP_DIR/full_backup_$DATE.sql

# Backup compressé
pg_dump -h localhost -U postgres -d $DB_NAME | gzip > $BACKUP_DIR/compressed_backup_$DATE.sql.gz
```

### Restauration

```bash
# Restauration depuis backup
psql -h localhost -U postgres -d event_planner_core < backup_20240125_120000.sql

# Restauration depuis backup compressé
gunzip -c compressed_backup_20240125_120000.sql.gz | psql -h localhost -U postgres -d event_planner_core
```

---

## Monitoring des Performances

### Requêtes Lentes

```sql
-- Activer le monitoring des requêtes lentes
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1 seconde
SELECT pg_reload_conf();

-- Voir les requêtes lentes
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Statistiques des Tables

```sql
-- Taille des tables
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Nombre de lignes
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

---

## Bonnes Pratiques

### 1. Normalisation

- Respecter la 3ème forme normale
- Éviter la redondance des données
- Utiliser les clés étrangères pour l'intégrité

### 2. Performance

- Indexer les colonnes fréquemment interrogées
- Utiliser des index composites pour les requêtes complexes
- Éviter les SELECT * inutiles

### 3. Sécurité

- Utiliser des requêtes paramétrées
- Appliquer le principe du moindre privilège
- Chiffrer les données sensibles

### 4. Maintenabilité

- Documenter les schémas
- Versionner les migrations
- Automatiser les backups

---

Pour toute question sur le schéma de données, contactez l'équipe de base de données ou consultez les scripts de migration dans `database/migrations/`.
