-- Migration corrective pour la table designers
-- Ajoute les colonnes manquantes identifiées dans l'audit

-- Ajouter la colonne is_verified manquante
ALTER TABLE designers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Ajouter les colonnes de modération si elles n'existent pas
ALTER TABLE designers ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE designers ADD COLUMN IF NOT EXISTS moderated_by BIGINT;
ALTER TABLE designers ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP;

-- Créer les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_designers_is_verified ON designers(is_verified);
CREATE INDEX IF NOT EXISTS idx_designers_moderated_by ON designers(moderated_by);

-- Commentaire de migration
COMMENT ON COLUMN designers.is_verified IS 'Indique si le designer a été vérifié par un administrateur';
COMMENT ON COLUMN designers.moderation_reason IS 'Raison de la décision de modération';
COMMENT ON COLUMN designers.moderated_by IS 'ID de l''administrateur qui a modéré';
COMMENT ON COLUMN designers.moderated_at IS 'Date et heure de la modération';
