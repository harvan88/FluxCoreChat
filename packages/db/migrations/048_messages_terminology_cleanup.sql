-- Migration: 048_messages_terminology_cleanup.sql
-- Purpose: Add new overwrite columns and migrate data from redacted columns
-- Date: 2026-03-13
-- Refactoring: Redacción → Sobrescritura

-- Paso 1: Agregar nuevas columnas (sin datos)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS overwritten_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS overwritten_by TEXT;

-- Paso 2: Migrar datos existentes de redacted a overwritten
UPDATE messages 
SET overwritten_at = redacted_at, 
    overwritten_by = redacted_by
WHERE redacted_at IS NOT NULL;

-- Paso 3: Crear índices para nuevas columnas (si no existen)
CREATE INDEX IF NOT EXISTS idx_messages_overwritten_at ON messages(overwritten_at);
CREATE INDEX IF NOT EXISTS idx_messages_overwritten_by ON messages(overwritten_by);

-- Paso 4: Verificación de migración
DO $$
DECLARE
    redacted_count INTEGER;
    overwritten_count INTEGER;
BEGIN
    -- Contar mensajes con datos redacted
    SELECT COUNT(*) INTO redacted_count 
    FROM messages 
    WHERE redacted_at IS NOT NULL;
    
    -- Contar mensajes con datos overwritten
    SELECT COUNT(*) INTO overwritten_count 
    FROM messages 
    WHERE overwritten_at IS NOT NULL;
    
    -- Verificar que todos los datos migraron correctamente
    IF redacted_count != overwritten_count THEN
        RAISE EXCEPTION 'Migration failed: redacted_count (%) != overwritten_count (%)', redacted_count, overwritten_count;
    END IF;
    
    RAISE NOTICE 'Migration successful: % messages migrated from redacted to overwritten', redacted_count;
END $$;

-- Comentario sobre la migración
COMMENT ON COLUMN messages.overwritten_at IS 'Replaces redacted_at - timestamp when message was overwritten for all users';
COMMENT ON COLUMN messages.overwritten_by IS 'Replaces redacted_by - account ID that performed the overwrite';
COMMENT ON COLUMN messages.redacted_at IS 'DEPRECATED - Use overwritten_at instead';
COMMENT ON COLUMN messages.redacted_by IS 'DEPRECATED - Use overwritten_by instead';
