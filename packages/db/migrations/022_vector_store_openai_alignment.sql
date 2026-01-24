-- ════════════════════════════════════════════════════════════════════════════════
-- Migración: 022_vector_store_openai_alignment.sql
-- Fecha: 2026-01-23
-- Propósito: Alinear Vector Store con API oficial de OpenAI
--
-- CONFORMIDAD CON REGLAS ARQUITECTÓNICAS:
-- - Regla 2.1: vs.openai es fuente de verdad (campos para leer desde OpenAI)
-- - Regla 3.1: DB local es registro referencial (solo almacena referencias derivadas)
-- - Regla 6.1: Búsqueda es solo para QA/debugging (no reemplaza Assistant)
--
-- NOTA: Estos campos almacenan datos LEÍDOS desde OpenAI, no inferidos localmente.
-- ════════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTE 1: VECTOR STORES - Campos para reflejar estado de OpenAI
-- ════════════════════════════════════════════════════════════════════════════════

-- 1.1 Metadata de OpenAI (hasta 16 pares clave-valor, leídos desde OpenAI)
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN fluxcore_vector_stores.metadata IS 
  'OpenAI metadata: hasta 16 pares clave-valor. Valor LEÍDO desde OpenAI, no inferido.';

-- 1.2 Última actividad (leída desde OpenAI)
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN fluxcore_vector_stores.last_active_at IS 
  'Timestamp de última actividad LEÍDO desde OpenAI. FluxCore no lo calcula.';

-- 1.3 File counts detallado (objeto completo de OpenAI)
-- Reemplaza el simple fileCount integer con el objeto completo de OpenAI
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS file_counts JSONB DEFAULT '{
    "in_progress": 0,
    "completed": 0,
    "failed": 0,
    "cancelled": 0,
    "total": 0
  }';

COMMENT ON COLUMN fluxcore_vector_stores.file_counts IS 
  'Conteos de archivos LEÍDOS desde OpenAI: {in_progress, completed, failed, cancelled, total}. No inferir localmente.';

-- 1.4 Expires after en formato OpenAI
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS expires_after JSONB;

COMMENT ON COLUMN fluxcore_vector_stores.expires_after IS 
  'Política de expiración en formato OpenAI: {"anchor": "last_active_at", "days": N}. NULL = no expira.';

-- 1.5 Usage bytes (leído desde OpenAI, diferente a sizeBytes local)
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS usage_bytes BIGINT DEFAULT 0;

COMMENT ON COLUMN fluxcore_vector_stores.usage_bytes IS 
  'Bytes usados LEÍDOS desde OpenAI. Para backend=local, puede diferir de sizeBytes.';

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTE 2: VECTOR STORE FILES - Campos para configuración y estado de OpenAI
-- ════════════════════════════════════════════════════════════════════════════════

-- 2.1 Atributos de archivo (para filtrado en búsquedas OpenAI)
ALTER TABLE fluxcore_vector_store_files
  ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}';

COMMENT ON COLUMN fluxcore_vector_store_files.attributes IS 
  'Atributos para filtrado en VS.search() de OpenAI. Hasta 16 pares clave-valor.';

-- 2.2 Estrategia de chunking (configurada al subir a OpenAI)
ALTER TABLE fluxcore_vector_store_files
  ADD COLUMN IF NOT EXISTS chunking_strategy JSONB;

COMMENT ON COLUMN fluxcore_vector_store_files.chunking_strategy IS 
  'Estrategia de chunking usada en OpenAI: {"type": "auto"} o {"type": "static", "static": {...}}.';

-- 2.3 Usage bytes por archivo (leído desde OpenAI)
ALTER TABLE fluxcore_vector_store_files
  ADD COLUMN IF NOT EXISTS usage_bytes BIGINT DEFAULT 0;

COMMENT ON COLUMN fluxcore_vector_store_files.usage_bytes IS 
  'Bytes usados por este archivo LEÍDOS desde OpenAI.';

-- 2.4 Last error en formato OpenAI (reemplaza errorMessage simple)
ALTER TABLE fluxcore_vector_store_files
  ADD COLUMN IF NOT EXISTS last_error JSONB;

COMMENT ON COLUMN fluxcore_vector_store_files.last_error IS 
  'Último error LEÍDO desde OpenAI: {"code": "...", "message": "..."}. NULL si no hay error.';

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTE 3: MIGRACIÓN DE DATOS EXISTENTES
-- ════════════════════════════════════════════════════════════════════════════════

-- 3.1 Migrar fileCount existente a file_counts (solo para backend=local o registros legacy)
UPDATE fluxcore_vector_stores
SET file_counts = jsonb_build_object(
  'in_progress', 0,
  'completed', COALESCE(file_count, 0),
  'failed', 0,
  'cancelled', 0,
  'total', COALESCE(file_count, 0)
)
WHERE file_counts IS NULL 
   OR file_counts = '{}'::jsonb
   OR file_counts = '{"in_progress": 0, "completed": 0, "failed": 0, "cancelled": 0, "total": 0}'::jsonb;

-- 3.2 Migrar expirationPolicy/expirationDays existentes a expires_after
-- Solo para registros que tienen política definida
UPDATE fluxcore_vector_stores
SET expires_after = CASE 
  WHEN expiration_policy = 'days_after_last_use' THEN 
    jsonb_build_object('anchor', 'last_active_at', 'days', COALESCE(expiration_days, 7))
  ELSE NULL
END
WHERE expires_after IS NULL 
  AND expiration_policy IS NOT NULL 
  AND expiration_policy != 'never';

-- 3.3 Migrar errorMessage a last_error (para archivos con errores)
UPDATE fluxcore_vector_store_files
SET last_error = jsonb_build_object(
  'code', 'legacy_error',
  'message', error_message
)
WHERE error_message IS NOT NULL 
  AND error_message != ''
  AND last_error IS NULL;

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTE 4: ÍNDICES PARA CONSULTAS EFICIENTES
-- ════════════════════════════════════════════════════════════════════════════════

-- Índice para buscar por backend (importante para separación de mundos)
CREATE INDEX IF NOT EXISTS idx_vs_backend 
  ON fluxcore_vector_stores (backend);

-- Índice para buscar por external_id (sincronización con OpenAI)
CREATE INDEX IF NOT EXISTS idx_vs_external_id 
  ON fluxcore_vector_stores (external_id) 
  WHERE external_id IS NOT NULL;

-- Índice GIN para metadata (búsquedas por atributos)
CREATE INDEX IF NOT EXISTS idx_vs_metadata 
  ON fluxcore_vector_stores USING GIN (metadata);

-- Índice GIN para atributos de archivos (filtros en búsqueda)
CREATE INDEX IF NOT EXISTS idx_vs_files_attributes 
  ON fluxcore_vector_store_files USING GIN (attributes);

-- Índice para archivos por external_id
CREATE INDEX IF NOT EXISTS idx_vs_files_external_id 
  ON fluxcore_vector_store_files (external_id) 
  WHERE external_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTE 5: DOCUMENTACIÓN
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE fluxcore_vector_stores IS 
  'Vector Stores: para backend=openai, todos los campos de estado son REGISTRO REFERENCIAL 
   derivado de OpenAI (fuente de verdad). Para backend=local, FluxCore es fuente de verdad.';

COMMENT ON TABLE fluxcore_vector_store_files IS 
  'Archivos en Vector Stores: para backend=openai del VS padre, el status y atributos 
   deben LEERSE desde OpenAI, no inferirse localmente.';

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN POST-MIGRACIÓN
-- ════════════════════════════════════════════════════════════════════════════════
-- Ejecutar para verificar la migración:
-- 
-- SELECT 
--   id, name, backend, 
--   file_count, file_counts,
--   expiration_policy, expires_after,
--   metadata
-- FROM fluxcore_vector_stores 
-- LIMIT 5;
--
-- SELECT 
--   id, name, status, 
--   attributes, chunking_strategy, last_error
-- FROM fluxcore_vector_store_files 
-- LIMIT 5;
