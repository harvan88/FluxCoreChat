-- ============================================================================
-- Migration 021: Centralized Files Architecture
-- ============================================================================
-- 
-- Refactoriza la arquitectura de archivos para seguir el patrón de "assets por
-- referencia" de FluxCore. Los archivos ahora son entidades centralizadas que
-- pueden ser referenciados por múltiples Vector Stores.
--
-- Cambios:
-- 1. CREATE fluxcore_files (archivo centralizado con contenido)
-- 2. ALTER fluxcore_vector_store_files (convertir a tabla de enlace)
-- 3. Migrar datos existentes
-- ============================================================================

-- Extensión para hashing (opcional, para deduplicación)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. Tabla de Archivos Centralizados
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxcore_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Metadatos del archivo
    name VARCHAR(500) NOT NULL,
    original_name VARCHAR(500),
    mime_type VARCHAR(100) DEFAULT 'application/octet-stream',
    size_bytes BIGINT DEFAULT 0,
    
    -- Contenido (para archivos de texto, permite reprocessing)
    text_content TEXT,
    
    -- Hash para deduplicación (SHA-256 del contenido)
    content_hash VARCHAR(64),
    
    -- Propietario
    account_id UUID NOT NULL,
    uploaded_by UUID, -- user_id
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices para búsqueda
    CONSTRAINT fluxcore_files_unique_hash UNIQUE (account_id, content_hash)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_fluxcore_files_account 
    ON fluxcore_files(account_id);
CREATE INDEX IF NOT EXISTS idx_fluxcore_files_name 
    ON fluxcore_files(name);
CREATE INDEX IF NOT EXISTS idx_fluxcore_files_hash 
    ON fluxcore_files(content_hash);
CREATE INDEX IF NOT EXISTS idx_fluxcore_files_created 
    ON fluxcore_files(created_at DESC);

-- ============================================================================
-- 2. Modificar tabla de enlace Vector Store <-> Files
-- ============================================================================

-- Agregar columna file_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fluxcore_vector_store_files' 
        AND column_name = 'file_id'
    ) THEN
        ALTER TABLE fluxcore_vector_store_files 
        ADD COLUMN file_id UUID REFERENCES fluxcore_files(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 3. Migrar datos existentes (si hay archivos sin file_id)
-- ============================================================================

-- Crear archivos centralizados desde vector_store_files existentes
INSERT INTO fluxcore_files (id, name, mime_type, size_bytes, account_id, created_at)
SELECT 
    vsf.id,
    vsf.name,
    COALESCE(vsf.mime_type, 'application/octet-stream'),
    COALESCE(vsf.size_bytes, 0),
    vs.account_id,
    vsf.created_at
FROM fluxcore_vector_store_files vsf
JOIN fluxcore_vector_stores vs ON vs.id = vsf.vector_store_id
WHERE vsf.file_id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Actualizar referencias
UPDATE fluxcore_vector_store_files vsf
SET file_id = vsf.id
WHERE file_id IS NULL;

-- ============================================================================
-- 4. Función para subir archivo con deduplicación
-- ============================================================================

CREATE OR REPLACE FUNCTION fluxcore_upload_file(
    p_account_id UUID,
    p_name VARCHAR(500),
    p_mime_type VARCHAR(100),
    p_size_bytes BIGINT,
    p_text_content TEXT,
    p_uploaded_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_hash VARCHAR(64);
    v_file_id UUID;
BEGIN
    -- Calcular hash si hay contenido
    IF p_text_content IS NOT NULL THEN
        v_hash := encode(digest(p_text_content, 'sha256'), 'hex');
        
        -- Buscar archivo existente con mismo hash
        SELECT id INTO v_file_id
        FROM fluxcore_files
        WHERE account_id = p_account_id AND content_hash = v_hash;
        
        IF v_file_id IS NOT NULL THEN
            -- Retornar archivo existente (deduplicación)
            RETURN v_file_id;
        END IF;
    END IF;
    
    -- Crear nuevo archivo
    INSERT INTO fluxcore_files (
        name, original_name, mime_type, size_bytes, 
        text_content, content_hash, account_id, uploaded_by
    ) VALUES (
        p_name, p_name, p_mime_type, p_size_bytes,
        p_text_content, v_hash, p_account_id, p_uploaded_by
    )
    RETURNING id INTO v_file_id;
    
    RETURN v_file_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Función para vincular archivo a vector store
-- ============================================================================

CREATE OR REPLACE FUNCTION fluxcore_link_file_to_vector_store(
    p_file_id UUID,
    p_vector_store_id UUID
) RETURNS UUID AS $$
DECLARE
    v_link_id UUID;
    v_file RECORD;
BEGIN
    -- Obtener info del archivo
    SELECT name, mime_type, size_bytes INTO v_file
    FROM fluxcore_files WHERE id = p_file_id;
    
    IF v_file IS NULL THEN
        RAISE EXCEPTION 'File not found: %', p_file_id;
    END IF;
    
    -- Verificar si ya existe el enlace
    SELECT id INTO v_link_id
    FROM fluxcore_vector_store_files
    WHERE vector_store_id = p_vector_store_id AND file_id = p_file_id;
    
    IF v_link_id IS NOT NULL THEN
        RETURN v_link_id;
    END IF;
    
    -- Crear enlace
    INSERT INTO fluxcore_vector_store_files (
        vector_store_id, file_id, name, mime_type, size_bytes, status
    ) VALUES (
        p_vector_store_id, p_file_id, v_file.name, v_file.mime_type, 
        v_file.size_bytes, 'pending'
    )
    RETURNING id INTO v_link_id;
    
    RETURN v_link_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Vista para listar archivos de un vector store con info completa
-- ============================================================================

CREATE OR REPLACE VIEW fluxcore_vector_store_files_view AS
SELECT 
    vsf.id AS link_id,
    vsf.vector_store_id,
    vsf.file_id,
    vsf.status,
    vsf.error_message,
    vsf.chunk_count,
    vsf.created_at AS linked_at,
    f.id AS file_id,
    f.name,
    f.original_name,
    f.mime_type,
    f.size_bytes,
    f.content_hash,
    f.account_id,
    f.created_at AS file_created_at,
    f.updated_at AS file_updated_at
FROM fluxcore_vector_store_files vsf
LEFT JOIN fluxcore_files f ON f.id = vsf.file_id;

-- ============================================================================
-- 7. Trigger para actualizar updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_fluxcore_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fluxcore_files_updated_at ON fluxcore_files;
CREATE TRIGGER trigger_fluxcore_files_updated_at
    BEFORE UPDATE ON fluxcore_files
    FOR EACH ROW
    EXECUTE FUNCTION update_fluxcore_files_updated_at();

-- ============================================================================
-- 8. Comentarios
-- ============================================================================

COMMENT ON TABLE fluxcore_files IS 
'Archivos centralizados que pueden ser referenciados por múltiples Vector Stores';

COMMENT ON COLUMN fluxcore_files.text_content IS 
'Contenido de texto extraído del archivo, permite reprocessing sin re-upload';

COMMENT ON COLUMN fluxcore_files.content_hash IS 
'SHA-256 del contenido para deduplicación dentro de la misma cuenta';

COMMENT ON FUNCTION fluxcore_upload_file IS 
'Sube un archivo con deduplicación automática basada en hash';

COMMENT ON FUNCTION fluxcore_link_file_to_vector_store IS 
'Vincula un archivo existente a un Vector Store';
