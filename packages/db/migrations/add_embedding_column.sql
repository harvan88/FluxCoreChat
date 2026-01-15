-- Agregar columna embedding tipo vector a fluxcore_document_chunks
-- Dimensión 1536 para text-embedding-3-small de OpenAI

-- Primero asegurar que pgvector esté instalado
CREATE EXTENSION IF NOT EXISTS vector;

-- Agregar la columna embedding si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fluxcore_document_chunks' 
        AND column_name = 'embedding'
    ) THEN
        ALTER TABLE fluxcore_document_chunks 
        ADD COLUMN embedding vector(1536);
        
        -- Crear índice HNSW para búsqueda rápida
        CREATE INDEX IF NOT EXISTS idx_fluxcore_document_chunks_embedding 
        ON fluxcore_document_chunks 
        USING hnsw (embedding vector_cosine_ops);
        
        RAISE NOTICE 'Columna embedding agregada correctamente';
    ELSE
        RAISE NOTICE 'Columna embedding ya existe';
    END IF;
END $$;
