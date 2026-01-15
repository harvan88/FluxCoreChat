-- Migration: Add RAG configurations table
-- RAG-003: Configuración Granular de RAG
-- Date: 2026-01-14

-- ═══════════════════════════════════════════════════════════════════════════
-- RAG Configuration Table
-- Permite configurar chunking, embedding y retrieval por Vector Store o cuenta
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_rag_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dónde aplica esta configuración (uno de estos, o ninguno para global)
  vector_store_id UUID REFERENCES fluxcore_vector_stores(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  
  name VARCHAR(100),
  is_default BOOLEAN DEFAULT false,
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- CHUNKING CONFIGURATION
  -- ═══════════════════════════════════════════════════════════════════════════
  chunking_strategy VARCHAR(50) NOT NULL DEFAULT 'recursive',
  -- 'fixed': Tamaño fijo de tokens
  -- 'recursive': Divide por separadores jerárquicos
  -- 'semantic': Agrupa por similitud semántica
  -- 'sentence': Por oraciones completas
  -- 'paragraph': Por párrafos
  -- 'page': Por páginas (para PDFs)
  -- 'custom': Regex personalizado
  
  chunk_size_tokens INTEGER DEFAULT 512,
  chunk_overlap_tokens INTEGER DEFAULT 50,
  chunk_separators JSONB DEFAULT '["\\n\\n", "\\n", ". ", " "]',
  chunk_custom_regex TEXT,
  
  -- Límites
  min_chunk_size INTEGER DEFAULT 50,
  max_chunk_size INTEGER DEFAULT 2000,
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- EMBEDDING CONFIGURATION
  -- ═══════════════════════════════════════════════════════════════════════════
  embedding_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
  -- 'openai', 'cohere', 'google', 'azure', 'local', 'custom'
  
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  embedding_dimensions INTEGER DEFAULT 1536,
  embedding_batch_size INTEGER DEFAULT 100,
  
  -- Para proveedores custom
  embedding_endpoint_url TEXT,
  embedding_api_key_ref VARCHAR(255),  -- Referencia a secret en vault
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- RETRIEVAL CONFIGURATION
  -- ═══════════════════════════════════════════════════════════════════════════
  retrieval_top_k INTEGER DEFAULT 10,
  retrieval_min_score DECIMAL(4,3) DEFAULT 0.700,
  retrieval_max_tokens INTEGER DEFAULT 2000,
  
  -- Búsqueda híbrida
  hybrid_search_enabled BOOLEAN DEFAULT false,
  hybrid_keyword_weight DECIMAL(3,2) DEFAULT 0.30,
  
  -- Re-ranking
  rerank_enabled BOOLEAN DEFAULT false,
  rerank_provider VARCHAR(50),
  rerank_model VARCHAR(100),
  rerank_top_n INTEGER DEFAULT 5,
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- PROCESSING CONFIGURATION
  -- ═══════════════════════════════════════════════════════════════════════════
  supported_mime_types JSONB DEFAULT '["application/pdf", "text/plain", "text/markdown", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]',
  
  -- OCR para imágenes/PDFs escaneados
  ocr_enabled BOOLEAN DEFAULT false,
  ocr_language VARCHAR(10) DEFAULT 'spa',
  
  -- Metadata extraction
  extract_metadata BOOLEAN DEFAULT true,
  metadata_fields JSONB DEFAULT '["title", "author", "created_date", "page_count"]',
  
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  
  -- Solo un scope por configuración
  CONSTRAINT chk_single_scope CHECK (
    (CASE WHEN vector_store_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN account_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_rag_config_vector_store 
ON fluxcore_rag_configurations(vector_store_id) WHERE vector_store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rag_config_account 
ON fluxcore_rag_configurations(account_id) WHERE account_id IS NOT NULL;

-- Solo puede haber un default por cuenta
CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_config_account_default 
ON fluxcore_rag_configurations(account_id) 
WHERE is_default = true AND account_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- Trigger para updated_at
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_rag_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rag_configurations_updated_at ON fluxcore_rag_configurations;
CREATE TRIGGER trigger_rag_configurations_updated_at
  BEFORE UPDATE ON fluxcore_rag_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_rag_configurations_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper function: Get effective config for a vector store
-- Prioridad: VS config > Account default > System default
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_effective_rag_config(
  p_vector_store_id UUID,
  p_account_id UUID
)
RETURNS fluxcore_rag_configurations AS $$
DECLARE
  v_config fluxcore_rag_configurations;
BEGIN
  -- 1. Try vector store specific config
  SELECT * INTO v_config
  FROM fluxcore_rag_configurations
  WHERE vector_store_id = p_vector_store_id
  LIMIT 1;
  
  IF FOUND THEN
    RETURN v_config;
  END IF;
  
  -- 2. Try account default config
  SELECT * INTO v_config
  FROM fluxcore_rag_configurations
  WHERE account_id = p_account_id AND is_default = true
  LIMIT 1;
  
  IF FOUND THEN
    RETURN v_config;
  END IF;
  
  -- 3. Return NULL (use system defaults in code)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- Insert system default config (global fallback)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO fluxcore_rag_configurations (
  id,
  name,
  is_default,
  chunking_strategy,
  chunk_size_tokens,
  chunk_overlap_tokens,
  embedding_provider,
  embedding_model,
  embedding_dimensions,
  retrieval_top_k,
  retrieval_min_score
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'System Default',
  false,  -- No es default de ninguna cuenta específica
  'recursive',
  512,
  50,
  'openai',
  'text-embedding-3-small',
  1536,
  10,
  0.7
) ON CONFLICT (id) DO NOTHING;
