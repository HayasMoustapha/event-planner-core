-- Migration initiale pour core-service
-- Crée les tables de base avec structure minimale

-- Extension UUID pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table de configuration du service (pour stocker des métadonnées)
CREATE TABLE IF NOT EXISTS service_config (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table d'audit pour suivre les opérations importantes
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    uid UUID NOT NULL DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    user_id BIGINT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Commentaires pour documentation
COMMENT ON TABLE service_config IS 'Configuration du service core-service';
COMMENT ON TABLE audit_logs IS 'Journal d''audit pour core-service';

-- Insertion de la configuration de base
INSERT INTO service_config (key, value, description) VALUES 
('service_name', 'core-service', 'Nom du service'),
('database_name', 'event_planner_core', 'Nom de la base de données'),
('version', '1.0.0', 'Version du service'),
('initialized_at', CURRENT_TIMESTAMP, 'Date d''initialisation')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- TABLES WEBHOOKS (IDEMPOTENT)
-- ========================================

-- Table des webhooks de paiement
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payment_intent_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP,
    service_name VARCHAR(100) NOT NULL,
    request_id VARCHAR(255),
    webhook_timestamp TIMESTAMP,
    signature VARCHAR(500),
    raw_data JSONB,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    payment_service_id VARCHAR(255) UNIQUE NOT NULL,
    user_id BIGINT,
    event_id BIGINT,
    template_id BIGINT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(50) DEFAULT 'pending',
    gateway VARCHAR(50),
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    canceled_at TIMESTAMP,
    error_message TEXT,
    webhook_id BIGINT REFERENCES payment_webhooks(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des achats de templates par les utilisateurs
CREATE TABLE IF NOT EXISTS user_template_purchases (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    template_id BIGINT NOT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    webhook_id BIGINT REFERENCES payment_webhooks(id),
    UNIQUE(user_id, template_id)
);

-- Table des webhooks de tickets
CREATE TABLE IF NOT EXISTS ticket_webhooks (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    job_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP,
    service_name VARCHAR(100) NOT NULL,
    request_id VARCHAR(255),
    webhook_timestamp TIMESTAMP,
    signature VARCHAR(500),
    raw_data JSONB,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les tables webhooks
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_payment_intent_id ON payment_webhooks(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_type ON payment_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_created_at ON payment_webhooks(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_payment_service_id ON payments(payment_service_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_user_template_purchases_user_id ON user_template_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_template_purchases_template_id ON user_template_purchases(template_id);
CREATE INDEX IF NOT EXISTS idx_ticket_webhooks_job_id ON ticket_webhooks(job_id);
CREATE INDEX IF NOT EXISTS idx_ticket_webhooks_event_type ON ticket_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_ticket_webhooks_created_at ON ticket_webhooks(created_at);

-- Commentaires pour les tables webhooks
COMMENT ON TABLE payment_webhooks IS 'Table des webhooks reçus du service de paiement';
COMMENT ON TABLE payments IS 'Table des paiements traités';
COMMENT ON TABLE user_template_purchases IS 'Table des achats de templates par les utilisateurs';
COMMENT ON TABLE ticket_webhooks IS 'Table des webhooks reçus du service de tickets';
