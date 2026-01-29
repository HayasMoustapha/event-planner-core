-- ========================================
-- OPTIMISATION PERFORMANCE - EVENT PLANNER CORE
-- ========================================
-- Index supplémentaires pour optimiser les performances

-- ========================================
-- INDEX SUPPLÉMENTAIRES
-- ========================================

-- Index pour les recherches textuelles
CREATE INDEX IF NOT EXISTS idx_events_title_search 
ON events USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_guests_name_search 
ON guests USING gin(to_tsvector('french', first_name || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, '')));

-- Index pour les requêtes temporelles
CREATE INDEX IF NOT EXISTS idx_events_created_at_desc 
ON events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_event_date_desc 
ON events(event_date DESC);

-- ========================================
-- COMMENTAIRES
-- ========================================

COMMENT ON INDEX idx_events_title_search IS 'Index de recherche textuelle plein texte sur les titres et descriptions d''événements';
COMMENT ON INDEX idx_guests_name_search IS 'Index de recherche textuelle plein texte sur les noms et emails des invités';
COMMENT ON INDEX idx_events_created_at_desc IS 'Index temporel décroissant sur la création des événements';
COMMENT ON INDEX idx_events_event_date_desc IS 'Index temporel décroissant sur la date des événements';
