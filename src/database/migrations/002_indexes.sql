-- Event Planner Core - Indexes Migration
-- Version: 002
-- Description: Create performance indexes for all tables
-- Author: Event Planner Team
-- Created: 2024-01-23

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_uid ON events(uid);

-- Guests indexes
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_guests_uid ON guests(uid);

-- EventGuests indexes
CREATE INDEX IF NOT EXISTS idx_event_guests_event_id ON event_guests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_guests_guest_id ON event_guests(guest_id);
CREATE INDEX IF NOT EXISTS idx_event_guests_invitation_code ON event_guests(invitation_code);
CREATE INDEX IF NOT EXISTS idx_event_guests_status ON event_guests(status);
CREATE INDEX IF NOT EXISTS idx_event_guests_is_present ON event_guests(is_present);
CREATE INDEX IF NOT EXISTS idx_event_guests_uid ON event_guests(uid);

-- Invitations indexes
CREATE INDEX IF NOT EXISTS idx_invitations_event_guest_id ON invitations(event_guest_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitation_code ON invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_sent_at ON invitations(sent_at);
CREATE INDEX IF NOT EXISTS idx_invitations_uid ON invitations(uid);

-- Ticket Types indexes
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_types_type ON ticket_types(type);
CREATE INDEX IF NOT EXISTS idx_ticket_types_available_from ON ticket_types(available_from);
CREATE INDEX IF NOT EXISTS idx_ticket_types_available_to ON ticket_types(available_to);
CREATE INDEX IF NOT EXISTS idx_ticket_types_uid ON ticket_types(uid);

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_id ON tickets(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_template_id ON tickets(ticket_template_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_guest_id ON tickets(event_guest_id);
CREATE INDEX IF NOT EXISTS idx_tickets_is_validated ON tickets(is_validated);
CREATE INDEX IF NOT EXISTS idx_tickets_validated_at ON tickets(validated_at);
CREATE INDEX IF NOT EXISTS idx_tickets_uid ON tickets(uid);

-- Ticket Templates indexes
CREATE INDEX IF NOT EXISTS idx_ticket_templates_name ON ticket_templates(name);
CREATE INDEX IF NOT EXISTS idx_ticket_templates_is_customizable ON ticket_templates(is_customizable);
CREATE INDEX IF NOT EXISTS idx_ticket_templates_uid ON ticket_templates(uid);

-- Ticket Generation Jobs indexes
CREATE INDEX IF NOT EXISTS idx_ticket_generation_jobs_event_id ON ticket_generation_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_generation_jobs_status ON ticket_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ticket_generation_jobs_created_at ON ticket_generation_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_generation_jobs_started_at ON ticket_generation_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_ticket_generation_jobs_completed_at ON ticket_generation_jobs(completed_at);
CREATE INDEX IF NOT EXISTS idx_ticket_generation_jobs_uid ON ticket_generation_jobs(uid);

-- Designers indexes
CREATE INDEX IF NOT EXISTS idx_designers_user_id ON designers(user_id);
CREATE INDEX IF NOT EXISTS idx_designers_is_verified ON designers(is_verified);
CREATE INDEX IF NOT EXISTS idx_designers_brand_name ON designers(brand_name);
CREATE INDEX IF NOT EXISTS idx_designers_uid ON designers(uid);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_designer_id ON templates(designer_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_price ON templates(price);
CREATE INDEX IF NOT EXISTS idx_templates_uid ON templates(uid);

-- Purchases indexes
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_template_id ON purchases(template_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_transaction_id ON purchases(transaction_id);
CREATE INDEX IF NOT EXISTS idx_purchases_uid ON purchases(uid);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_template_id ON reviews(template_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_uid ON reviews(uid);

-- System Logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_by ON system_logs(created_by);

-- Unique constraints to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_guests_unique ON event_guests(event_id, guest_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique ON reviews(user_id, template_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_organizer_status ON events(organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_event_guests_event_status ON event_guests(event_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_type_validated ON tickets(ticket_type_id, is_validated);
CREATE INDEX IF NOT EXISTS idx_templates_designer_status ON templates(designer_id, status);
CREATE INDEX IF NOT EXISTS idx_purchases_user_date ON purchases(user_id, purchase_date);

-- Record this migration
INSERT INTO migrations (version, filename, checksum) 
VALUES ('002', '002_indexes.sql', 'sha256:indexes_checksum')
ON CONFLICT (version) DO NOTHING;
