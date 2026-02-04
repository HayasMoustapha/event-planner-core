-- -- Add missing invitation_code column on event_guests (align with schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_guests' AND column_name = 'invitation_code'
  ) THEN
    ALTER TABLE event_guests ADD COLUMN invitation_code VARCHAR(255);
    -- Backfill existing rows with a unique code
    UPDATE event_guests
    SET invitation_code = 'INV-' || id || '-' || substr(md5(random()::text), 1, 6)
    WHERE invitation_code IS NULL;
    ALTER TABLE event_guests ALTER COLUMN invitation_code SET NOT NULL;
  END IF;
END $$;

-- Ensure unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_guests_invitation_code
  ON event_guests(invitation_code);
