-- Migration: Add scalability improvements and metrics
-- RAG-011: Escalabilidad y Optimización
-- Date: 2026-01-14

-- ═══════════════════════════════════════════════════════════════════════════
-- SYSTEM METRICS TABLE
-- Para monitoreo y alertas
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  metric_name VARCHAR(100) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  -- 'counter', 'gauge', 'histogram', 'summary'
  
  value DECIMAL(20, 6) NOT NULL,
  
  -- Dimensiones
  dimensions JSONB DEFAULT '{}',
  -- Ej: {"provider": "openai", "operation": "embed", "account_id": "xxx"}
  
  -- Timestamp con precisión de milisegundos
  recorded_at TIMESTAMP(3) DEFAULT now() NOT NULL,
  
  -- Para particionamiento
  recorded_date DATE DEFAULT CURRENT_DATE NOT NULL
);

-- Índices para queries de métricas
CREATE INDEX IF NOT EXISTS idx_metrics_name_time 
ON fluxcore_system_metrics(metric_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_date 
ON fluxcore_system_metrics(recorded_date);

-- Particionamiento por fecha (habilitar en producción)
-- CREATE TABLE fluxcore_system_metrics_YYYY_MM PARTITION OF fluxcore_system_metrics
-- FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM+1-01');

-- ═══════════════════════════════════════════════════════════════════════════
-- VECTOR STORE STATISTICS
-- Cache de estadísticas para evitar COUNT(*) costosos
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_vector_store_stats (
  vector_store_id UUID PRIMARY KEY REFERENCES fluxcore_vector_stores(id) ON DELETE CASCADE,
  
  -- Conteos
  file_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  
  -- Embeddings
  embedded_chunk_count INTEGER DEFAULT 0,
  embedding_coverage_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Uso
  total_queries BIGINT DEFAULT 0,
  queries_this_month INTEGER DEFAULT 0,
  avg_query_time_ms INTEGER DEFAULT 0,
  
  -- Última actividad
  last_file_added_at TIMESTAMP,
  last_query_at TIMESTAMP,
  last_reindex_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════
-- QUERY CACHE
-- Cache de queries frecuentes para reducir carga
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hash del query para lookup rápido
  query_hash VARCHAR(64) NOT NULL,
  vector_store_ids UUID[] NOT NULL,
  
  -- Query original
  query_text TEXT NOT NULL,
  
  -- Resultado cacheado
  cached_chunk_ids UUID[] NOT NULL,
  cached_similarities DECIMAL[] NOT NULL,
  
  -- Metadata
  hit_count INTEGER DEFAULT 1,
  
  -- TTL
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  
  UNIQUE(query_hash, vector_store_ids)
);

CREATE INDEX IF NOT EXISTS idx_cache_hash ON fluxcore_query_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON fluxcore_query_cache(expires_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS PARA ACTUALIZAR ESTADÍSTICAS
-- ═══════════════════════════════════════════════════════════════════════════

-- Trigger: Actualizar stats cuando se añade/elimina un archivo
CREATE OR REPLACE FUNCTION update_vs_stats_on_file_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO fluxcore_vector_store_stats (vector_store_id, file_count, last_file_added_at)
    VALUES (NEW.vector_store_id, 1, now())
    ON CONFLICT (vector_store_id) 
    DO UPDATE SET 
      file_count = fluxcore_vector_store_stats.file_count + 1,
      last_file_added_at = now(),
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE fluxcore_vector_store_stats 
    SET file_count = GREATEST(0, file_count - 1), updated_at = now()
    WHERE vector_store_id = OLD.vector_store_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vs_stats_files ON fluxcore_vector_store_files;
CREATE TRIGGER trigger_vs_stats_files
  AFTER INSERT OR DELETE ON fluxcore_vector_store_files
  FOR EACH ROW EXECUTE FUNCTION update_vs_stats_on_file_change();

-- Trigger: Actualizar stats cuando se añaden/eliminan chunks
CREATE OR REPLACE FUNCTION update_vs_stats_on_chunk_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO fluxcore_vector_store_stats (vector_store_id, chunk_count, total_tokens)
    VALUES (NEW.vector_store_id, 1, COALESCE(NEW.token_count, 0))
    ON CONFLICT (vector_store_id) 
    DO UPDATE SET 
      chunk_count = fluxcore_vector_store_stats.chunk_count + 1,
      total_tokens = fluxcore_vector_store_stats.total_tokens + COALESCE(NEW.token_count, 0),
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE fluxcore_vector_store_stats 
    SET 
      chunk_count = GREATEST(0, chunk_count - 1),
      total_tokens = GREATEST(0, total_tokens - COALESCE(OLD.token_count, 0)),
      updated_at = now()
    WHERE vector_store_id = OLD.vector_store_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vs_stats_chunks ON fluxcore_document_chunks;
CREATE TRIGGER trigger_vs_stats_chunks
  AFTER INSERT OR DELETE ON fluxcore_document_chunks
  FOR EACH ROW EXECUTE FUNCTION update_vs_stats_on_chunk_change();

-- ═══════════════════════════════════════════════════════════════════════════
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════

-- Índice parcial para chunks sin embedding (para reprocesamiento)
CREATE INDEX IF NOT EXISTS idx_chunks_no_embedding 
ON fluxcore_document_chunks(vector_store_id) 
WHERE embedding IS NULL;

-- Índice para búsqueda por metadata JSONB
CREATE INDEX IF NOT EXISTS idx_chunks_metadata_gin 
ON fluxcore_document_chunks USING gin(metadata);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCIONES DE MANTENIMIENTO
-- ═══════════════════════════════════════════════════════════════════════════

-- Limpiar cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM fluxcore_query_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Recalcular estadísticas de un vector store
CREATE OR REPLACE FUNCTION recalculate_vs_stats(p_vector_store_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO fluxcore_vector_store_stats (
    vector_store_id, file_count, chunk_count, total_tokens, 
    embedded_chunk_count, embedding_coverage_percent
  )
  SELECT 
    p_vector_store_id,
    (SELECT COUNT(*) FROM fluxcore_vector_store_files WHERE vector_store_id = p_vector_store_id),
    COUNT(*),
    COALESCE(SUM(token_count), 0),
    COUNT(*) FILTER (WHERE embedding IS NOT NULL),
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE embedding IS NOT NULL)::DECIMAL / COUNT(*) * 100)
      ELSE 0 
    END
  FROM fluxcore_document_chunks
  WHERE vector_store_id = p_vector_store_id
  ON CONFLICT (vector_store_id) DO UPDATE SET
    file_count = EXCLUDED.file_count,
    chunk_count = EXCLUDED.chunk_count,
    total_tokens = EXCLUDED.total_tokens,
    embedded_chunk_count = EXCLUDED.embedded_chunk_count,
    embedding_coverage_percent = EXCLUDED.embedding_coverage_percent,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Vacuum y reindex de tablas principales (ejecutar en mantenimiento)
-- NOTA: Ejecutar manualmente o via pg_cron
-- VACUUM ANALYZE fluxcore_document_chunks;
-- REINDEX INDEX CONCURRENTLY idx_document_chunks_embedding_hnsw;
