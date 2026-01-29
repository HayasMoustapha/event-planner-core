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
COMMENT ON TABLE audit_logs IS 'Journal d'audit pour core-service';

-- Insertion de la configuration de base
INSERT INTO service_config (key, value, description) VALUES 
('service_name', 'core-service', 'Nom du service'),
('database_name', 'event_planner_core', 'Nom de la base de données'),
('version', '1.0.0', 'Version du service'),
('initialized_at', CURRENT_TIMESTAMP, 'Date d'initialisation')
ON CONFLICT (key) DO NOTHING;
