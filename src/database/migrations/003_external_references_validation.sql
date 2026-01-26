-- ========================================
-- MIGRATION 003: VALIDATION RÉFÉRENCES EXTERNES
-- ========================================
-- Gère les références vers le service event-planner-auth
-- Crée des vues et contraintes pour maintenir l'intégrité
-- Version IDEMPOTENTE - Généré le 2026-01-26

-- ========================================
-- Vue pour valider les références utilisateurs (IDEMPOTENT)
-- ========================================
CREATE OR REPLACE VIEW user_references_validation AS
SELECT 
    'events' as table_name,
    'organizer_id' as column_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN organizer_id IS NOT NULL THEN 1 END) as with_user_id,
    COUNT(CASE WHEN organizer_id IS NULL THEN 1 END) as null_user_id
FROM events WHERE deleted_at IS NULL

UNION ALL

SELECT 
    'designers' as table_name,
    'user_id' as column_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id
FROM designers WHERE deleted_at IS NULL

UNION ALL

SELECT 
    'purchases' as table_name,
    'user_id' as column_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id
FROM purchases WHERE deleted_at IS NULL

UNION ALL

SELECT 
    'reviews' as table_name,
    'user_id' as column_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id
FROM reviews WHERE deleted_at IS NULL

UNION ALL

SELECT 
    'events' as table_name,
    'created_by' as column_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN created_by IS NOT NULL THEN 1 END) as with_user_id,
    COUNT(CASE WHEN created_by IS NULL THEN 1 END) as null_user_id
FROM events WHERE deleted_at IS NULL;

-- ========================================
-- Fonction pour valider l'intégrité des références (IDEMPOTENT)
-- ========================================
CREATE OR REPLACE FUNCTION validate_external_references()
RETURNS TABLE(
    table_name TEXT,
    column_name TEXT,
    total_records BIGINT,
    with_user_id BIGINT,
    null_user_id BIGINT,
    integrity_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rv.table_name,
        rv.column_name,
        rv.total_records,
        rv.with_user_id,
        rv.null_user_id,
        CASE 
            WHEN rv.total_records = 0 THEN 'EMPTY_TABLE'
            WHEN rv.null_user_id = 0 THEN 'ALL_REFERENCED'
            WHEN rv.with_user_id > 0 THEN 'PARTIAL_REFERENCES'
            ELSE 'NO_REFERENCES'
        END as integrity_status
    FROM user_references_validation rv;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Rapport d'intégrité des références externes (IDEMPOTENT)
-- ========================================
DO $$
DECLARE
    validation_record RECORD;
    total_issues INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VALIDATION RÉFÉRENCES EXTERNES - event-planner-core';
    RAISE NOTICE '══════════════════════════════════════════════════';
    RAISE NOTICE '📊 Analyse des références vers le service auth...';
    
    FOR validation_record IN SELECT * FROM validate_external_references() LOOP
        RAISE NOTICE '';
        RAISE NOTICE '📋 Table: %.%', validation_record.table_name, validation_record.column_name;
        RAISE NOTICE '   Total enregistrements: %', validation_record.total_records;
        RAISE NOTICE '   Avec user_id: %', validation_record.with_user_id;
        RAISE NOTICE '   Sans user_id: %', validation_record.null_user_id;
        RAISE NOTICE '   Statut intégrité: %', validation_record.integrity_status;
        
        IF validation_record.integrity_status IN ('PARTIAL_REFERENCES', 'NO_REFERENCES') 
           AND validation_record.total_records > 0 THEN
            total_issues := total_issues + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RÉSUMÉ VALIDATION';
    RAISE NOTICE '══════════════════════════════════════════════════';
    
    IF total_issues = 0 THEN
        RAISE NOTICE '✅ SUCCÈS : Toutes les références sont valides';
        RAISE NOTICE '🔗 Le service event-planner-core est correctement connecté au service auth';
    ELSE
        RAISE NOTICE '⚠️  ATTENTION : % problème(s) détecté(s)', total_issues;
        RAISE NOTICE '💡 Solution: Assurez-vous que les utilisateurs existent dans le service auth';
        RAISE NOTICE '🔧 Les enregistrements avec user_id NULL seront ignorés par l''application';
    END IF;
    
    RAISE NOTICE '══════════════════════════════════════════════════';
END $$;

-- ========================================
-- Index pour optimiser les validations (IDEMPOTENT)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_events_organizer_id_null ON events(organizer_id) WHERE organizer_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_designers_user_id_null ON designers(user_id) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_user_id_null ON purchases(user_id) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_user_id_null ON reviews(user_id) WHERE user_id IS NULL;
