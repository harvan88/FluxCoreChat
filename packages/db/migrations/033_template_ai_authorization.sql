-- Add authorize_for_ai column to templates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'templates' AND column_name = 'authorize_for_ai'
  ) THEN
    ALTER TABLE templates ADD COLUMN authorize_for_ai boolean NOT NULL DEFAULT false;
  END IF;
END $$;
