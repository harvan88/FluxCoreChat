-- Asset-Centric RAG Migration

-- 1. Depurar columnas redundantes y establecer FK en vector_store_files
ALTER TABLE "fluxcore_vector_store_files" DROP COLUMN IF EXISTS "name";
ALTER TABLE "fluxcore_vector_store_files" DROP COLUMN IF EXISTS "mime_type";
ALTER TABLE "fluxcore_vector_store_files" DROP COLUMN IF EXISTS "size_bytes";

-- Limpiar legacy data que viola la integridad referencial
TRUNCATE TABLE "fluxcore_vector_store_files" CASCADE;

-- Si existiera una FK anterior, la limpiamos por si acaso
ALTER TABLE "fluxcore_vector_store_files" DROP CONSTRAINT IF EXISTS "fluxcore_vector_store_files_file_id_fkey";
-- Para asegurar consistencia referencial con la tabla maestra de Assets
ALTER TABLE "fluxcore_vector_store_files"
  ADD CONSTRAINT "fluxcore_vector_store_files_file_id_fkey"
  FOREIGN KEY ("file_id") REFERENCES "assets"("id") ON DELETE CASCADE;

-- 2. Depurar y agregar campos en document_chunks
-- Como estamos reconstruyendo el RAG Asset-Centric y el usuario autorizó "Base de datos cero" para chunks,
-- limpiamos los chunks actuales que no tienen el modelo.
TRUNCATE TABLE "fluxcore_document_chunks";

-- La columna es obligatoria
ALTER TABLE "fluxcore_document_chunks" ADD COLUMN IF NOT EXISTS "embedding_model" varchar(255) NOT NULL;

-- Ya no dependemos del vector store
ALTER TABLE "fluxcore_document_chunks" DROP COLUMN IF EXISTS "vector_store_id" CASCADE;

-- Si existía el FK viejo hacia vector_store_files, lo reemplazamos por el FK hacia assets
ALTER TABLE "fluxcore_document_chunks" DROP CONSTRAINT IF EXISTS "fluxcore_document_chunks_file_id_fluxcore_vector_store_files_id_fk";
ALTER TABLE "fluxcore_document_chunks" DROP CONSTRAINT IF EXISTS "fluxcore_document_chunks_file_id_fkey";

ALTER TABLE "fluxcore_document_chunks"
  ADD CONSTRAINT "fluxcore_document_chunks_file_id_fkey"
  FOREIGN KEY ("file_id") REFERENCES "assets"("id") ON DELETE CASCADE;

-- Actualizamos el índice único (que ahora exige coincidencia de modelo vectorial)
-- Actualizamos el índice único (que ahora exige coincidencia de modelo vectorial)
DROP INDEX IF EXISTS "idx_document_chunks_file_chunk";
DROP INDEX IF EXISTS "idx_document_chunks_file_chunk_model";
CREATE UNIQUE INDEX IF NOT EXISTS "idx_document_chunks_file_chunk_model" ON "fluxcore_document_chunks"("file_id", "embedding_model", "chunk_index");

-- Eliminamos el viejo índice del vector store y establecemos el nuevo
DROP INDEX IF EXISTS "idx_document_chunks_vector_store_drizzle";
DROP INDEX IF EXISTS "idx_document_chunks_file_drizzle";
DROP INDEX IF EXISTS "idx_document_chunks_file_model";
CREATE INDEX IF NOT EXISTS "idx_document_chunks_file_model" ON "fluxcore_document_chunks"("file_id", "embedding_model");


-- REPARACIÓN DE LÓGICA DE ESTADÍSTICAS (Asset-Centric)

-- 1. Reparación de la Función de Trigger
CREATE OR REPLACE FUNCTION update_vs_stats_on_chunk_change()
RETURNS TRIGGER AS $$
DECLARE
  v_vector_store_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Buscamos todos los VS vinculados a este Asset/File y actualizamos a cada uno
    FOR v_vector_store_id IN (SELECT vector_store_id FROM fluxcore_vector_store_files WHERE file_id = NEW.file_id) LOOP
      INSERT INTO fluxcore_vector_store_stats (vector_store_id, chunk_count, total_tokens)
      VALUES (v_vector_store_id, 1, COALESCE(NEW.token_count, 0))
      ON CONFLICT (vector_store_id) 
      DO UPDATE SET 
        chunk_count = fluxcore_vector_store_stats.chunk_count + 1,
        total_tokens = fluxcore_vector_store_stats.total_tokens + COALESCE(NEW.token_count, 0),
        updated_at = now();
    END LOOP;
  ELSIF TG_OP = 'DELETE' THEN
    FOR v_vector_store_id IN (SELECT vector_store_id FROM fluxcore_vector_store_files WHERE file_id = OLD.file_id) LOOP
      UPDATE fluxcore_vector_store_stats 
      SET 
        chunk_count = GREATEST(0, chunk_count - 1),
        total_tokens = GREATEST(0, total_tokens - COALESCE(OLD.token_count, 0)),
        updated_at = now()
      WHERE vector_store_id = v_vector_store_id;
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Reparación de la Función de Recálculo Manual
CREATE OR REPLACE FUNCTION recalculate_vs_stats(p_vector_store_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO fluxcore_vector_store_stats (
    vector_store_id, file_count, chunk_count, total_tokens, 
    embedded_chunk_count, embedding_coverage_percent
  )
  SELECT 
    p_vector_store_id,
    (SELECT COUNT(*) FROM fluxcore_vector_store_files WHERE vector_store_id = p_vector_store_id),
    COUNT(c.id),
    COALESCE(SUM(c.token_count), 0),
    COUNT(c.id) FILTER (WHERE c.embedding IS NOT NULL),
    CASE 
      WHEN COUNT(c.id) > 0 
      THEN (COUNT(c.id) FILTER (WHERE c.embedding IS NOT NULL)::DECIMAL / COUNT(c.id) * 100)
      ELSE 0 
    END
  FROM fluxcore_vector_store_files vsf
  INNER JOIN fluxcore_document_chunks c ON vsf.file_id = c.file_id
  WHERE vsf.vector_store_id = p_vector_store_id
  ON CONFLICT (vector_store_id) DO UPDATE SET
    file_count = EXCLUDED.file_count,
    chunk_count = EXCLUDED.chunk_count,
    total_tokens = EXCLUDED.total_tokens,
    embedded_chunk_count = EXCLUDED.embedded_chunk_count,
    embedding_coverage_percent = EXCLUDED.embedding_coverage_percent,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

