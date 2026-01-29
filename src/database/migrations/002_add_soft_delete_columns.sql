-- ========================================
-- MIGRATION: AJOUT DES COLONNES SOFT DELETE
-- ========================================
-- Ajoute les colonnes deleted_at et deleted_by à toutes les tables principales
-- Permet le soft delete (suppression logique) des enregistrements

-- ========================================
-- TABLE EVENTS
-- ========================================
-- Vérification si la colonne existe déjà pour éviter les erreurs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE events ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE events ADD COLUMN deleted_by BIGINT;
        
        -- Création d'index pour optimiser les requêtes avec deleted_at
        CREATE INDEX idx_events_deleted_at ON events(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table events';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table events';
    END IF;
END $$;

-- ========================================
-- TABLE GUESTS
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guests' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE guests ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE guests ADD COLUMN deleted_by BIGINT;
        
        CREATE INDEX idx_guests_deleted_at ON guests(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table guests';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table guests';
    END IF;
END $$;

-- ========================================
-- TABLE EVENT_GUESTS
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_guests' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE event_guests ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE event_guests ADD COLUMN deleted_by BIGINT;
        
        CREATE INDEX idx_event_guests_deleted_at ON event_guests(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table event_guests';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table event_guests';
    END IF;
END $$;

-- ========================================
-- TABLE INVITATIONS
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE invitations ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE invitations ADD COLUMN deleted_by BIGINT;
        
        CREATE INDEX idx_invitations_deleted_at ON invitations(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table invitations';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table invitations';
    END IF;
END $$;

-- ========================================
-- TABLE TICKET_TYPES
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_types' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE ticket_types ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE ticket_types ADD COLUMN deleted_by BIGINT;
        
        CREATE INDEX idx_ticket_types_deleted_at ON ticket_types(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table ticket_types';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table ticket_types';
    END IF;
END $$;

-- ========================================
-- TABLE TICKETS
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE tickets ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE tickets ADD COLUMN deleted_by BIGINT;
        
        CREATE INDEX idx_tickets_deleted_at ON tickets(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table tickets';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table tickets';
    END IF;
END $$;

-- ========================================
-- TABLE TICKET_TEMPLATES
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_templates' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE ticket_templates ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE ticket_templates ADD COLUMN deleted_by BIGINT;
        
        CREATE INDEX idx_ticket_templates_deleted_at ON ticket_templates(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table ticket_templates';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table ticket_templates';
    END IF;
END $$;

-- ========================================
-- TABLE DESIGNERS
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'designers' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE designers ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE designers ADD COLUMN deleted_by BIGINT;
        
        CREATE INDEX idx_designers_deleted_at ON designers(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table designers';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table designers';
    END IF;
END $$;

-- ========================================
-- TABLE TEMPLATES
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'templates' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE templates ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE templates ADD COLUMN deleted_by BIGINT;
        
        CREATE INDEX idx_templates_deleted_at ON templates(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table templates';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table templates';
    END IF;
END $$;

-- ========================================
-- TABLE PURCHASES
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchases' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE purchases ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE purchases ADD COLUMN deleted_by BIGINT;
        
        CREATE INDEX idx_purchases_deleted_at ON purchases(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table purchases';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table purchases';
    END IF;
END $$;

-- ========================================
-- TABLE REVIEWS
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE reviews ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE reviews ADD COLUMN deleted_by BIGINT;
        
        CREATE INDEX idx_reviews_deleted_at ON reviews(deleted_at);
        
        RAISE NOTICE 'Colonnes deleted_at/deleted_by ajoutées à la table reviews';
    ELSE
        RAISE NOTICE 'Colonnes deleted_at/deleted_by existent déjà dans la table reviews';
    END IF;
END $$;

-- ========================================
-- MISE À JOUR DES TRIGGERS POUR SOFT DELETE
-- ========================================
-- Création de triggers pour mettre automatiquement à jour updated_at lors du soft delete

-- Trigger pour events
CREATE OR REPLACE FUNCTION update_events_updated_at_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_events_updated_at_soft_delete ON events;
CREATE TRIGGER update_events_updated_at_soft_delete
    BEFORE UPDATE ON events
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
    EXECUTE FUNCTION update_events_updated_at_soft_delete();

-- ========================================
-- RAPPORT DE MIGRATION
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION SOFT DELETE TERMINÉE AVEC SUCCÈS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables mises à jour: events, guests, event_guests, invitations, ticket_types, tickets, ticket_templates, designers, templates, purchases, reviews';
    RAISE NOTICE 'Colonnes ajoutées: deleted_at (TIMESTAMP), deleted_by (BIGINT)';
    RAISE NOTICE 'Indexes créés: idx_*_deleted_at pour chaque table';
    RAISE NOTICE 'Trigger ajouté: update_events_updated_at_soft_delete';
    RAISE NOTICE '========================================';
END $$;
