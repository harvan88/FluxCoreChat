-- Migration: Add pgvector extension and document chunks table
-- RAG-001: Infraestructura de Base de Datos Vectorial
-- Date: 2026-01-14

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Enable pgvector extension
-- ═══════════════════════════════════════════════════════════════════════════
-- Note: This requires the pgvector extension to be installed on PostgreSQL.
-- On most cloud providers (Supabase, Neon, Railway) it's pre-installed.
-- For local PostgreSQL: sudo apt install postgresql-16-pgvector

CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Create document chunks table with vector column
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References to parent entities
  vector_store_id UUID NOT NULL REFERENCES fluxcore_vector_stores(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES fluxcore_vector_store_files(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  
  -- Embedding vector (1536 dimensions for OpenAI text-embedding-3-small)
  -- Can be changed to 3072 for text-embedding-3-large or other dimensions
  embedding vector(1536),
  
  -- Metadata for filtering and context
  metadata JSONB DEFAULT '{}',
  
  -- Source tracking
  start_char INTEGER,
  end_char INTEGER,
  page_number INTEGER,
  section_title VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  
  -- Constraint: unique chunk per file position
  UNIQUE(file_id, chunk_index)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Create HNSW index for Approximate Nearest Neighbor search
-- ═══════════════════════════════════════════════════════════════════════════
-- HNSW (Hierarchical Navigable Small World) is faster than IVFFlat for queries
-- m = 16: number of connections per layer (higher = more accurate, slower build)
-- ef_construction = 64: size of dynamic candidate list (higher = more accurate)

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON fluxcore_document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Create indexes for filtering queries
-- ═══════════════════════════════════════════════════════════════════════════

-- Index by account for tenant isolation
CREATE INDEX IF NOT EXISTS idx_document_chunks_account 
ON fluxcore_document_chunks(account_id);

-- Index by vector store for scoped searches
CREATE INDEX IF NOT EXISTS idx_document_chunks_vector_store 
ON fluxcore_document_chunks(vector_store_id);

-- Index by file for chunk management
CREATE INDEX IF NOT EXISTS idx_document_chunks_file 
ON fluxcore_document_chunks(file_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_document_chunks_store_account 
ON fluxcore_document_chunks(vector_store_id, account_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: Add updated_at trigger
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_document_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_chunks_updated_at ON fluxcore_document_chunks;
CREATE TRIGGER trigger_document_chunks_updated_at
  BEFORE UPDATE ON fluxcore_document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_document_chunks_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 6: Helper function for similarity search (optional convenience)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding vector(1536),
  p_vector_store_ids UUID[],
  p_account_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  file_id UUID,
  chunk_index INTEGER,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.file_id,
    c.chunk_index,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM fluxcore_document_chunks c
  WHERE c.account_id = p_account_id
    AND c.vector_store_id = ANY(p_vector_store_ids)
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) >= p_min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (for testing after migration)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run these to verify the migration was successful:

-- Check pgvector is enabled:
-- SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check table exists:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'fluxcore_document_chunks';

-- Check HNSW index exists:
-- SELECT indexname, indexdef FROM pg_indexes 
-- WHERE tablename = 'fluxcore_document_chunks';
