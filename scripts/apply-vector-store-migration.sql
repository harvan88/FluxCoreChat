-- Add the source column
ALTER TABLE fluxcore_vector_stores
ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'primary';

-- Update existing records
UPDATE fluxcore_vector_stores
SET source = 'cache'
WHERE backend = 'openai';
