-- 044_decommission_legacy_media_and_conversation_columns.sql
-- Workstream 6: Legacy Decommissioning
-- Elimina tablas y columnas legacy según ChatCore Redesign v1.3
-- Idempotente: usa DROP IF EXISTS y DROP COLUMN IF EXISTS
-- Ejecutar solo después de confirmar que ningún código activo usa estos objetos

BEGIN;

-- 1. Eliminar tablas legacy de media y enriquecimientos
DROP TABLE IF EXISTS media_attachments CASCADE;
DROP TABLE IF EXISTS message_enrichments CASCADE;

-- 2. Eliminar columnas legacy de conversations
ALTER TABLE conversations
    DROP COLUMN IF EXISTS owner_account_id,
    DROP COLUMN IF EXISTS linked_account_id,
    DROP COLUMN IF EXISTS unread_count_a,
    DROP COLUMN IF EXISTS unread_count_b;

-- 3. Limpiar índices huérfanos si existen (idempotente)
DROP INDEX IF EXISTS idx_conversations_owner_account_id;
DROP INDEX IF EXISTS idx_conversations_linked_account_id;

COMMIT;

-- Validaciones post-migración (ejecutar manualmente si se desea):
-- \d conversations  -- debe mostrar columnas eliminadas ausentes
-- \dt media_attachments  -- debe fallar (no existe)
-- \dt message_enrichments -- debe fallar (no existe)
