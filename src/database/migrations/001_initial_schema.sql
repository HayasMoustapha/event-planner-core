-- Event Planner Core - Initial Schema Migration
-- Version: 001
-- Description: Create complete database schema based on event-planner-core-diagram.md
-- Author: Event Planner Team
-- Created: 2024-01-24

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS event_planner_core;
\c event_planner_core;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE event_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE guest_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE invitation_status AS ENUM ('sent', 'opened', 'failed');
CREATE TYPE ticket_type_enum AS ENUM ('free', 'paid', 'donation');
CREATE TYPE ticket_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE template_status AS ENUM ('pending_review', 'approved', 'rejected');
CREATE TYPE log_level AS ENUM ('info', 'warning', 'error');

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255) NOT NULL,
    status event_status DEFAULT 'draft',
    organizer_id BIGINT NOT NULL,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);

-- Guests table
CREATE TABLE IF NOT EXISTS guests (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) UNIQUE,
    status guest_status DEFAULT 'pending',
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);

-- Event Guests junction table
CREATE TABLE IF NOT EXISTS event_guests (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    is_present BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT,
    UNIQUE(event_id, guest_id)
);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id BIGSERIAL PRIMARY KEY,
    event_guest_id BIGINT NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
    invitation_code VARCHAR(255) UNIQUE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status invitation_status DEFAULT 'sent',
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);

-- Ticket Types table
CREATE TABLE IF NOT EXISTS ticket_types (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ticket_type_enum NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    available_from TIMESTAMP WITH TIME ZONE,
    available_to TIMESTAMP WITH TIME ZONE,
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_code VARCHAR(255) UNIQUE NOT NULL,
    qr_code_data TEXT,
    is_validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP WITH TIME ZONE,
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    ticket_type_id BIGINT NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
    event_guest_id BIGINT NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
    ticket_template_id BIGINT REFERENCES ticket_templates(id) ON DELETE SET NULL,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);

-- Ticket Templates table
CREATE TABLE IF NOT EXISTS ticket_templates (
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

-- Ticket Generation Jobs table
CREATE TABLE IF NOT EXISTS ticket_generation_jobs (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status ticket_status_enum DEFAULT 'pending',
    details JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);

-- Designers table
CREATE TABLE IF NOT EXISTS designers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    brand_name VARCHAR(255) NOT NULL,
    portfolio_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);

-- Templates table (Marketplace)
CREATE TABLE IF NOT EXISTS templates (
    id BIGSERIAL PRIMARY KEY,
    designer_id BIGINT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    preview_url VARCHAR(500),
    source_files_path VARCHAR(500),
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    status template_status DEFAULT 'pending_review',
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT
);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
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

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    template_id BIGINT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT,
    updated_by BIGINT,
    UNIQUE(user_id, template_id)
);

-- System Logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    level log_level NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    created_by BIGINT,
    uid UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_guests_updated_at BEFORE UPDATE ON event_guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON ticket_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_templates_updated_at BEFORE UPDATE ON ticket_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_generation_jobs_updated_at BEFORE UPDATE ON ticket_generation_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_designers_updated_at BEFORE UPDATE ON designers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_status ON guests(status);
CREATE INDEX idx_event_guests_event_id ON event_guests(event_id);
CREATE INDEX idx_event_guests_guest_id ON event_guests(guest_id);
CREATE INDEX idx_invitations_event_guest_id ON invitations(event_guest_id);
CREATE INDEX idx_invitations_code ON invitations(invitation_code);
CREATE INDEX idx_ticket_types_event_id ON ticket_types(event_id);
CREATE INDEX idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_event_guest_id ON tickets(event_guest_id);
CREATE INDEX idx_tickets_ticket_type_id ON tickets(ticket_type_id);
CREATE INDEX idx_ticket_generation_jobs_event_id ON ticket_generation_jobs(event_id);
CREATE INDEX idx_designers_user_id ON designers(user_id);
CREATE INDEX idx_templates_designer_id ON templates(designer_id);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_template_id ON purchases(template_id);
CREATE INDEX idx_reviews_template_id ON reviews(template_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- Insert initial data
INSERT INTO events (title, description, event_date, location, organizer_id) VALUES 
('Sample Conference', 'This is a sample conference event', NOW() + INTERVAL '7 days', 'Paris, France', 1),
('Sample Workshop', 'This is a sample workshop event', NOW() + INTERVAL '14 days', 'Lyon, France', 1)
ON CONFLICT DO NOTHING;

-- Insert sample ticket types
INSERT INTO ticket_types (event_id, name, description, type, quantity, price) VALUES 
(1, 'Standard Ticket', 'Standard access to the conference', 'paid', 100, 49.99),
(1, 'VIP Ticket', 'VIP access with additional benefits', 'paid', 20, 199.99),
(2, 'Workshop Ticket', 'Full access to the workshop', 'paid', 30, 29.99)
ON CONFLICT DO NOTHING;
