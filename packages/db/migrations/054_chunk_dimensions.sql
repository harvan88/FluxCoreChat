-- Migration: Add dimensions column to fluxcore_document_chunks
-- Date: 2026-04-24

ALTER TABLE fluxcore_document_chunks 
    ADD COLUMN dimensions INTEGER;

-- Create an index for performance
CREATE INDEX idx_document_chunks_dimensions ON fluxcore_document_chunks(dimensions);
