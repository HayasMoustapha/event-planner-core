-- Add missing status column on event_guests (align with schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_guests' AND column_name = 'status'
  ) THEN
    ALTER TABLE event_guests
      ADD COLUMN status VARCHAR(20) DEFAULT 'pending'
      CHECK (status IN ('pending', 'confirmed', 'cancelled'));
  END IF;
END $$;
