-- Migration initiale pour Event Planner Core
-- RESPECT STRICTEMENT le diagramme event-planner-core-diagram.md

-- Extension UUID pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- Module Events & Guests (Section 5.2)
-- ========================================

-- Table Event (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS events (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title VARCHAR NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    location VARCHAR NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'))
);

-- Table Guest (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS guests (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

-- Table EventGuest (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS event_guests (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    is_present BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP,
    -- Foreign keys selon les relations du diagramme
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    -- Invitation code pour la relation avec Invitation
    invitation_code VARCHAR UNIQUE NOT NULL,
    -- Status pour suivre l'état de l'invitation
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

-- Table Invitation (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS invitations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    invitation_code VARCHAR UNIQUE NOT NULL,
    sent_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('sent', 'opened', 'failed')),
    -- Foreign key vers EventGuest selon le diagramme
    event_guest_id BIGINT NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE
);

-- ========================================
-- Module Tickets Management (Section 5.3)
-- ========================================

-- Table Ticket (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS tickets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ticket_code VARCHAR UNIQUE NOT NULL,
    qr_code_data TEXT,
    is_validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    -- Relations selon le diagramme
    ticket_type_id BIGINT NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
    event_guest_id BIGINT NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE
);

-- Table TicketType (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS ticket_types (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('free', 'paid', 'donation')),
    quantity INT NOT NULL DEFAULT 0,
    available_from TIMESTAMP,
    available_to TIMESTAMP,
    -- Relation avec Event
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE
);

-- Table TicketTemplate (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS ticket_templates (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    description TEXT,
    preview_url VARCHAR,
    source_files_path VARCHAR,
    is_customizable BOOLEAN DEFAULT FALSE
);

-- Table TicketGenerationJob (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS ticket_generation_jobs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    details JSON
);

-- ========================================
-- Module Marketplace (Section 5.4)
-- ========================================

-- Table Template (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS templates (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    description TEXT,
    preview_url VARCHAR,
    source_files_path VARCHAR,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected'))
);

-- Table Designer (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS designers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    brand_name VARCHAR NOT NULL,
    portfolio_url VARCHAR,
    -- Relation avec User (héritage)
    user_id BIGINT UNIQUE NOT NULL
);

-- Table Purchase (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS purchases (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    transaction_id VARCHAR UNIQUE,
    -- Relations selon le diagramme
    user_id BIGINT NOT NULL,
    template_id BIGINT NOT NULL REFERENCES templates(id) ON DELETE CASCADE
);

-- Table Review (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Relations selon le diagramme
    user_id BIGINT NOT NULL,
    template_id BIGINT NOT NULL REFERENCES templates(id) ON DELETE CASCADE
);

-- ========================================
-- Module Admin Dashboard (Section 5.8)
-- ========================================

-- Table SystemLog (conforme exactement au diagramme)
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    context JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Index pour optimiser les performances
-- ========================================

-- Index pour Events & Guests
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_event_guests_event_id ON event_guests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_guests_guest_id ON event_guests(guest_id);
CREATE INDEX IF NOT EXISTS idx_event_guests_invitation_code ON event_guests(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_invitation_code ON invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Index pour Tickets
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_id ON tickets(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_guest_id ON tickets(event_guest_id);
CREATE INDEX IF NOT EXISTS idx_tickets_is_validated ON tickets(is_validated);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_types_type ON ticket_types(type);

-- Index pour Marketplace
CREATE INDEX IF NOT EXISTS idx_templates_designer_id ON templates(designer_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_designers_user_id ON designers(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_template_id ON purchases(template_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_template_id ON reviews(template_id);

-- Index pour System Logs
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- ========================================
-- Contraintes UNIQUE pour éviter les doublons
-- ========================================

-- Un event_guest ne peut être lié qu'à un seul event et un seul guest
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_guests_unique ON event_guests(event_id, guest_id);

-- Un utilisateur ne peut évaluer qu'un template une seule fois
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique ON reviews(user_id, template_id);

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
