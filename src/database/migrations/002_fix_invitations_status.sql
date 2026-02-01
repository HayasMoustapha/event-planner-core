-- Migration pour corriger la contrainte de statut des invitations
-- Résout le problème : "new row for relation "invitations" violates check constraint "invitations_status_check""

-- Supprimer l'ancienne contrainte
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_status_check;

-- Ajouter la nouvelle contrainte avec tous les statuts valides
ALTER TABLE invitations 
ADD CONSTRAINT invitations_status_check 
CHECK (status IN ('pending', 'sent', 'opened', 'confirmed', 'failed', 'cancelled'));

-- Mettre à jour les invitations existantes avec le statut par défaut si nécessaire
UPDATE invitations 
SET status = 'pending' 
WHERE status IS NULL OR status NOT IN ('pending', 'sent', 'opened', 'confirmed', 'failed', 'cancelled');

COMMENT ON COLUMN invitations.status IS 'Statut de l''invitation: pending, sent, opened, confirmed, failed, cancelled';
