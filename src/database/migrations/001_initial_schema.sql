-- Migration initiale pour Event Planner Core
-- RESPECT STRICTEMENT le diagramme event-planner-core-diagram.md
-- Ajout des champs d'audit complets : created_at, updated_at, deleted_at, created_by, updated_by, deleted_by

-- Extension UUID pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- Module Events & Guests (Section 5.2)
-- ========================================

-- Table Event (conforme exactement au diagramme + champs audit complets)
CREATE TABLE IF NOT EXISTS events (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title VARCHAR NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    -- Organizer selon diagramme: User "1" -- "*" Event
    organizer_id BIGINT NOT NULL,
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT
);

-- Table Guest (conforme exactement au diagramme + champs audit complets)
CREATE TABLE IF NOT EXISTS guests (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT
);

-- Table EventGuest (conforme exactement au diagramme + champs audit complets)
CREATE TABLE IF NOT EXISTS event_guests (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    is_present BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    -- Foreign keys selon les relations du diagramme
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT,
    -- Contrainte unique
    UNIQUE(event_id, guest_id)
);

-- Table Invitation (conforme exactement au diagramme + champs audit complets)
CREATE TABLE IF NOT EXISTS invitations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    invitation_code VARCHAR UNIQUE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'confirmed', 'failed', 'cancelled')),
    -- Foreign key vers EventGuest selon le diagramme
    event_guest_id BIGINT NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT
);

-- ========================================
-- Module Tickets Management (Section 5.3)
-- ========================================

-- Table TicketType (créée AVANT tickets pour éviter les erreurs de foreign key)
CREATE TABLE IF NOT EXISTS ticket_types (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('free', 'paid', 'donation')),
    quantity INT NOT NULL DEFAULT 0,
    available_from TIMESTAMP WITH TIME ZONE,
    available_to TIMESTAMP WITH TIME ZONE,
    -- Relation avec Event
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT
);

-- Table TicketTemplate (créée AVANT tickets pour éviter les erreurs de foreign key)
CREATE TABLE IF NOT EXISTS ticket_templates (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    description TEXT,
    preview_url VARCHAR,
    source_files_path VARCHAR,
    is_customizable BOOLEAN DEFAULT FALSE,
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT
);

-- Table Ticket (conforme exactement au diagramme + champs audit complets)
CREATE TABLE IF NOT EXISTS tickets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ticket_code VARCHAR UNIQUE NOT NULL,
    qr_code_data TEXT,
    is_validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP WITH TIME ZONE,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    -- Relations selon le diagramme (ticket_types et ticket_templates existent maintenant)
    ticket_type_id BIGINT NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
    ticket_template_id BIGINT REFERENCES ticket_templates(id) ON DELETE SET NULL,
    event_guest_id BIGINT NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT,
    -- Champs spécifiques à l'action
    validated_by BIGINT
);

-- Table TicketGenerationJob (conforme exactement au diagramme + champs audit complets)
CREATE TABLE IF NOT EXISTS ticket_generation_jobs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    details JSON,
    -- Relation avec Event selon le diagramme: Event "1" -- "*" TicketGenerationJob
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT,
    -- Champs spécifiques aux actions
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

-- ========================================
-- Module Marketplace (Section 5.4)
-- ========================================

-- Table Designer (CRÉÉE EN PREMIER pour éviter les FK violations)
-- Conforme exactement au diagramme + champs audit complets
CREATE TABLE IF NOT EXISTS designers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    brand_name VARCHAR NOT NULL,
    portfolio_url VARCHAR,
    -- Relation avec User (héritage) - référence externe au service auth
    user_id BIGINT UNIQUE NOT NULL,
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT,
    -- Champs spécifiques aux actions
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by BIGINT
);

-- Table Template (conforme exactement au diagramme + champs audit complets)
CREATE TABLE IF NOT EXISTS templates (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    description TEXT,
    preview_url VARCHAR,
    source_files_path VARCHAR,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    -- Designer selon diagramme: Designer "1" -- "*" Template
    -- designers existe maintenant (créé ci-dessus)
    designer_id BIGINT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT,
    -- Champs spécifiques aux actions
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by BIGINT,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by BIGINT
);

-- Table Purchase (conforme exactement au diagramme + champs audit complets)
CREATE TABLE IF NOT EXISTS purchases (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    transaction_id VARCHAR UNIQUE,
    -- Relations selon le diagramme
    user_id BIGINT NOT NULL,
    template_id BIGINT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    -- Champs d'audit complets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT,
    -- Champs spécifiques aux actions
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by BIGINT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refunded_by BIGINT
);

-- Table Review (conforme exactement au diagramme + champs audit complets)
CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Relations selon le diagramme
    user_id BIGINT NOT NULL,
    template_id BIGINT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    -- Champs d'audit complets
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_by BIGINT,
    -- Contrainte unique
    UNIQUE(user_id, template_id)
);

-- ========================================
-- Module Admin Dashboard (Section 5.8)
-- ========================================

-- Table SystemLog (conforme exactement au diagramme + champs audit complets)
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    context JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Champ d'audit
    created_by BIGINT
);

-- ========================================
-- Index pour optimiser les performances
-- ========================================

-- Index pour Events & Guests
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_guests_created_at ON guests(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_guests_created_by ON guests(created_by) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_guests_event_id ON event_guests(event_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_guests_guest_id ON event_guests(guest_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_guests_created_at ON event_guests(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_guests_created_by ON event_guests(created_by) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invitations_invitation_code ON invitations(invitation_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON invitations(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON invitations(created_by) WHERE deleted_at IS NULL;

-- Index pour Tickets
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_id ON tickets(ticket_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_event_guest_id ON tickets(event_guest_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_is_validated ON tickets(is_validated) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON ticket_types(event_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_types_type ON ticket_types(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_templates_created_at ON ticket_templates(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_templates_created_by ON ticket_templates(created_by) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_generation_jobs_event_id ON ticket_generation_jobs(event_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_generation_jobs_status ON ticket_generation_jobs(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_generation_jobs_created_at ON ticket_generation_jobs(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_generation_jobs_created_by ON ticket_generation_jobs(created_by) WHERE deleted_at IS NULL;

-- Index pour Marketplace
CREATE INDEX IF NOT EXISTS idx_templates_designer_id ON templates(designer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_designers_user_id ON designers(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_designers_created_at ON designers(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_designers_created_by ON designers(created_by) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_template_id ON purchases(template_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_created_by ON purchases(created_by) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_template_id ON reviews(template_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_created_by ON reviews(created_by) WHERE deleted_at IS NULL;

-- Index pour System Logs
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_by ON system_logs(created_by);

-- ========================================
-- Commentaires pour documentation
-- ========================================

COMMENT ON TABLE events IS 'Table Event - Section 5.2 du diagramme';
COMMENT ON TABLE guests IS 'Table Guest - Section 5.2 du diagramme';
COMMENT ON TABLE event_guests IS 'Table EventGuest - Section 5.2 du diagramme';
COMMENT ON TABLE invitations IS 'Table Invitation - Section 5.2 du diagramme';

COMMENT ON TABLE tickets IS 'Table Ticket - Section 5.3 du diagramme';
COMMENT ON TABLE ticket_types IS 'Table TicketType - Section 5.3 du diagramme';
COMMENT ON TABLE ticket_templates IS 'Table TicketTemplate - Section 5.3 du diagramme';
COMMENT ON TABLE ticket_generation_jobs IS 'Table TicketGenerationJob - Section 5.3 du diagramme';

COMMENT ON TABLE templates IS 'Table Template - Section 5.4 du diagramme';
COMMENT ON TABLE designers IS 'Table Designer - Section 5.4 du diagramme';
COMMENT ON TABLE purchases IS 'Table Purchase - Section 5.4 du diagramme';
COMMENT ON TABLE reviews IS 'Table Review - Section 5.4 du diagramme';

COMMENT ON TABLE system_logs IS 'Table SystemLog - Section 5.8 du diagramme';
