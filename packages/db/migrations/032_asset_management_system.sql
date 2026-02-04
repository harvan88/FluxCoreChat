-- Migration: Asset Management System
-- Date: 2026-02-03
-- Crea tablas para el sistema completo de gestión de assets

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: Enums
-- ════════════════════════════════════════════════════════════════════════════

-- Enum para estado de assets
DO $$ BEGIN
    CREATE TYPE asset_status AS ENUM ('pending', 'ready', 'archived', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para scope de assets
DO $$ BEGIN
    CREATE TYPE asset_scope AS ENUM (
        'message_attachment', 
        'template_asset', 
        'execution_plan', 
        'shared_internal', 
        'profile_avatar', 
        'workspace_asset'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para política de deduplicación
DO $$ BEGIN
    CREATE TYPE dedup_policy AS ENUM ('none', 'intra_account', 'intra_workspace', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para estado de sesiones de upload
DO $$ BEGIN
    CREATE TYPE upload_session_status AS ENUM ('active', 'uploading', 'committed', 'expired', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para acciones de auditoría
DO $$ BEGIN
    CREATE TYPE asset_audit_action AS ENUM (
        'upload_started', 'upload_completed', 'upload_failed', 'upload_cancelled',
        'session_expired', 'download', 'preview', 'url_signed',
        'state_changed', 'dedup_applied', 'deleted', 'purged',
        'archived', 'restored', 'access_denied', 'policy_evaluated',
        'metadata_updated', 'linked', 'unlinked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para tipo de actor
DO $$ BEGIN
    CREATE TYPE asset_actor_type AS ENUM ('user', 'assistant', 'system', 'api');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: Tabla principal de assets
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    
    -- Scope y estado
    scope asset_scope NOT NULL DEFAULT 'message_attachment',
    status asset_status NOT NULL DEFAULT 'pending',
    
    -- Versionado
    version BIGINT NOT NULL DEFAULT 1,
    
    -- Metadatos del archivo
    name VARCHAR(500) NOT NULL,
    original_name VARCHAR(500),
    mime_type VARCHAR(100) DEFAULT 'application/octet-stream',
    size_bytes BIGINT DEFAULT 0,
    
    -- Integridad y deduplicación
    checksum_sha256 VARCHAR(64),
    dedup_policy dedup_policy NOT NULL DEFAULT 'intra_account',
    
    -- Storage
    storage_key VARCHAR(1000) NOT NULL,
    storage_provider VARCHAR(50) DEFAULT 'local',
    
    -- Encriptación
    encryption VARCHAR(50),
    encryption_key_id VARCHAR(100),
    
    -- Metadatos adicionales (JSON)
    metadata TEXT,
    
    -- Usuario que subió el asset
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Retención
    retention_policy VARCHAR(50),
    hard_delete_at TIMESTAMP WITH TIME ZONE
);

-- Índices para assets
CREATE INDEX IF NOT EXISTS idx_assets_account ON assets(account_id);
CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_scope ON assets(scope);
CREATE INDEX IF NOT EXISTS idx_assets_checksum ON assets(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_storage_key ON assets(storage_key);

-- Unique constraint para deduplicación intra-account
CREATE UNIQUE INDEX IF NOT EXISTS assets_unique_checksum_account 
ON assets(account_id, checksum_sha256) 
WHERE checksum_sha256 IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: Tabla de sesiones de upload
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS asset_upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Estado de la sesión
    status upload_session_status NOT NULL DEFAULT 'active',
    
    -- Límites de la sesión
    max_size_bytes BIGINT NOT NULL DEFAULT 104857600, -- 100MB default
    allowed_mime_types TEXT, -- JSON array de mime types permitidos
    
    -- Progreso del upload
    bytes_uploaded BIGINT DEFAULT 0,
    total_bytes BIGINT,
    chunks_received BIGINT DEFAULT 0,
    
    -- Storage temporal
    temp_storage_key VARCHAR(1000),
    
    -- Metadatos del archivo
    file_name VARCHAR(500),
    mime_type VARCHAR(100),
    
    -- Asset resultante (después de commit)
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    
    -- TTL
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    committed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para sesiones de upload
CREATE INDEX IF NOT EXISTS idx_upload_sessions_account ON asset_upload_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON asset_upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires ON asset_upload_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_asset ON asset_upload_sessions(asset_id);

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: Tabla de auditoría de assets
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS asset_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Asset relacionado (puede ser null para eventos de sesión)
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    
    -- Sesión de upload relacionada
    session_id UUID REFERENCES asset_upload_sessions(id) ON DELETE SET NULL,
    
    -- Acción realizada
    action asset_audit_action NOT NULL,
    
    -- Actor que realizó la acción
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type asset_actor_type NOT NULL DEFAULT 'system',
    
    -- Contexto de la acción
    context VARCHAR(100),
    
    -- Account relacionada
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    
    -- Metadatos adicionales (JSON)
    metadata TEXT,
    
    -- IP y User Agent
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Resultado de la acción
    success VARCHAR(10) DEFAULT 'true',
    error_message TEXT,
    
    -- Timestamp inmutable
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_audit_logs_asset ON asset_audit_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON asset_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON asset_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON asset_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_account ON asset_audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON asset_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_account_timestamp ON asset_audit_logs(account_id, timestamp);

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: Tablas de relaciones (polymorphic associations)
-- ════════════════════════════════════════════════════════════════════════════

-- Relación: Mensajes - Assets
CREATE TABLE IF NOT EXISTS message_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(message_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_message_assets_message ON message_assets(message_id);
CREATE INDEX IF NOT EXISTS idx_message_assets_asset ON message_assets(asset_id);

-- Relación: Templates - Assets
CREATE TABLE IF NOT EXISTS template_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(template_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_template_assets_template ON template_assets(template_id);
CREATE INDEX IF NOT EXISTS idx_template_assets_asset ON template_assets(asset_id);

-- Relación: Execution Plans - Assets
CREATE TABLE IF NOT EXISTS plan_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES execution_plans(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    usage_type VARCHAR(50) DEFAULT 'attachment', -- attachment, dependency, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(plan_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_assets_plan ON plan_assets(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_assets_asset ON plan_assets(asset_id);

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 6: Tabla de políticas de acceso a assets
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE asset_permission_level AS ENUM ('read', 'write', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE asset_permission_source AS ENUM ('shared', 'marketplace', 'public');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS asset_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Asset relacionado
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    
    -- Quién tiene acceso
    grantee_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Tipo de acceso
    permission_level asset_permission_level NOT NULL DEFAULT 'read',
    
    -- Origen del permiso
    source asset_permission_source NOT NULL DEFAULT 'shared',
    
    -- Quién lo compartió
    granted_by_account_id UUID NOT NULL REFERENCES accounts(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = no expira
    
    -- Metadata
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para políticas
CREATE INDEX IF NOT EXISTS idx_asset_policies_asset ON asset_policies(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_policies_grantee ON asset_policies(grantee_account_id);
CREATE INDEX IF NOT EXISTS idx_asset_policies_source ON asset_policies(source);
CREATE INDEX IF NOT EXISTS idx_asset_policies_expires ON asset_policies(expires_at) WHERE expires_at IS NOT NULL;

-- Unique constraint: un permiso por asset por cuenta
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_policies_unique 
ON asset_policies(asset_id, grantee_account_id);

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 7: Triggers para updated_at
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para assets
DROP TRIGGER IF EXISTS trigger_assets_updated_at ON assets;
CREATE TRIGGER trigger_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para asset_upload_sessions
DROP TRIGGER IF EXISTS trigger_asset_upload_sessions_updated_at ON asset_upload_sessions;
CREATE TRIGGER trigger_asset_upload_sessions_updated_at
    BEFORE UPDATE ON asset_upload_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para asset_policies
DROP TRIGGER IF EXISTS trigger_asset_policies_updated_at ON asset_policies;
CREATE TRIGGER trigger_asset_policies_updated_at
    BEFORE UPDATE ON asset_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 8: Comentarios de documentación
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE assets IS 'Tabla principal de assets - almacena metadatos de archivos';
COMMENT ON TABLE asset_upload_sessions IS 'Sesiones efímeras para uploads de assets con TTL';
COMMENT ON TABLE asset_audit_logs IS 'Logs de auditoría inmutables para compliance';
COMMENT ON TABLE message_assets IS 'Relación N:M entre mensajes y assets';
COMMENT ON TABLE template_assets IS 'Relación N:M entre templates y assets';
COMMENT ON TABLE plan_assets IS 'Relación N:M entre execution plans y assets';
COMMENT ON TABLE asset_policies IS 'Políticas de acceso para compartir assets entre cuentas';
