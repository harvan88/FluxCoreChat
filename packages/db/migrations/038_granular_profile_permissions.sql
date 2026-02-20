-- Add granular AI permission columns to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_include_name BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_include_bio BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_include_private_context BOOLEAN DEFAULT true NOT NULL;
