-- Migration: Make embedding column dimension-agnostic
-- Allows storing vectors of any dimension (384, 1536, 3072, etc.)
-- This enables switching between embedding providers without schema changes.
-- Date: 2026-04-11

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Drop ALL fixed-dimension HNSW indexes on the embedding column
-- (HNSW requires fixed dimensions — incompatible with multi-provider)
-- ═══════════════════════════════════════════════════════════════════════════
DROP INDEX IF EXISTS idx_document_chunks_embedding_hnsw;
DROP INDEX IF EXISTS idx_fluxcore_document_chunks_embedding;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Alter column from vector(1536) to vector (no dimension constraint)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE fluxcore_document_chunks 
    ALTER COLUMN embedding TYPE vector;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Drop the old helper function with fixed dimension parameter
-- ═══════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS search_document_chunks(vector, UUID[], UUID, INTEGER, FLOAT);

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTE: We intentionally do NOT recreate HNSW indexes here.
-- HNSW indexes require a fixed dimension. Since we now support multiple
-- dimensions, the retrieval service uses exact cosine distance with
-- the vector_dims() guard for cross-dimension safety.
--
-- For production at scale, consider partitioning chunks by dimension
-- and creating per-partition HNSW indexes.
-- ═══════════════════════════════════════════════════════════════════════════
