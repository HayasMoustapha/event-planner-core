-- ========================================
-- MIGRATION 002: DONNÉES RÉFÉRENCE ESSENTIELLES
-- ========================================
-- Insertion idempotente des données de base requises
-- pour le fonctionnement du service event-planner-core
-- Version IDEMPOTENTE - Généré le 2026-01-26

-- ========================================
-- Types de tickets par défaut (IDEMPOTENT)
-- ========================================
-- Créer d'abord un événement par défaut pour les types de tickets
INSERT INTO events (title, description, event_date, location, status, organizer_id, created_at, updated_at)
SELECT 
    'Événement Système',
    'Événement système pour les types de tickets par défaut',
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    'Système',
    'published',
    1, -- Sera mis à jour avec un organizer_id valide du service auth
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM events WHERE title = 'Événement Système' AND deleted_at IS NULL
);

-- Utiliser l'ID de l'événement système ou NULL si non créé
INSERT INTO ticket_types (name, description, type, quantity, event_id, created_at, updated_at)
SELECT 
    'Standard',
    'Ticket standard pour événement',
    'free',
    1000,
    (SELECT id FROM events WHERE title = 'Événement Système' AND deleted_at IS NULL LIMIT 1),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_types WHERE name = 'Standard' AND deleted_at IS NULL
);

INSERT INTO ticket_types (name, description, type, quantity, event_id, created_at, updated_at)
SELECT 
    'VIP',
    'Ticket VIP avec avantages supplémentaires',
    'paid',
    100,
    (SELECT id FROM events WHERE title = 'Événement Système' AND deleted_at IS NULL LIMIT 1),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_types WHERE name = 'VIP' AND deleted_at IS NULL
);

INSERT INTO ticket_types (name, description, type, quantity, event_id, created_at, updated_at)
SELECT 
    'Donation',
    'Ticket avec montant libre (donation)',
    'donation',
    500,
    (SELECT id FROM events WHERE title = 'Événement Système' AND deleted_at IS NULL LIMIT 1),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_types WHERE name = 'Donation' AND deleted_at IS NULL
);

-- ========================================
-- Templates de tickets par défaut (IDEMPOTENT)
-- ========================================
INSERT INTO ticket_templates (name, description, preview_url, is_customizable, created_at, updated_at)
SELECT 
    'Standard Event',
    'Template standard pour événements',
    '/templates/standard-preview.png',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_templates WHERE name = 'Standard Event' AND deleted_at IS NULL
);

INSERT INTO ticket_templates (name, description, preview_url, is_customizable, created_at, updated_at)
SELECT 
    'VIP Event',
    'Template premium pour événements VIP',
    '/templates/vip-preview.png',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_templates WHERE name = 'VIP Event' AND deleted_at IS NULL
);

INSERT INTO ticket_templates (name, description, preview_url, is_customizable, created_at, updated_at)
SELECT 
    'Conference',
    'Template spécial pour conférences',
    '/templates/conference-preview.png',
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_templates WHERE name = 'Conference' AND deleted_at IS NULL
);

-- ========================================
-- Validation et rapport (IDEMPOTENT)
-- ========================================
DO $$
DECLARE
    ticket_types_count INTEGER;
    templates_count INTEGER;
BEGIN
    -- Compter les types de tickets créés
    SELECT COUNT(*) INTO ticket_types_count 
    FROM ticket_types 
    WHERE deleted_at IS NULL;
    
    -- Compter les templates créés
    SELECT COUNT(*) INTO templates_count 
    FROM ticket_templates 
    WHERE deleted_at IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RAPPORT DONNÉES RÉFÉRENCE - event-planner-core';
    RAISE NOTICE '══════════════════════════════════════════════════';
    RAISE NOTICE '🎫 Types de tickets créés: %', ticket_types_count;
    RAISE NOTICE '📋 Templates de tickets créés: %', templates_count;
    
    IF ticket_types_count >= 3 AND templates_count >= 3 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🏆 SUCCÈS : Données référence initialisées avec succès !';
        RAISE NOTICE '✅ Le service event-planner-core est prêt à fonctionner';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  ATTENTION : Certaines données référence manquent';
    END IF;
    
    RAISE NOTICE '══════════════════════════════════════════════════';
END $$;
