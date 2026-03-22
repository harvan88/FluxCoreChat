-- Migration: Remove authorized_data_scopes from fluxcore_assistants
-- Reason: Código muerto - no se usa en resolveBusinessProfile()
-- Impact: CERO - funcionalidad se maneja con ai_include_* fields
-- Date: 2026-03-22

ALTER TABLE fluxcore_assistants 
DROP COLUMN IF EXISTS authorized_data_scopes;
