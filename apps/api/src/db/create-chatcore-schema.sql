-- ========================================
-- CHATCORE DATABASE SCHEMA v1.3
-- Basado en el diseño definitivo v1.3
-- ========================================

-- 1. TABLA DE USUARIOS (personas con login)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. TABLA DE CUENTAS (identidades públicas @username)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('personal', 'business')),
    
    -- Contexto público
    profile JSONB DEFAULT '{}'::jsonb,
    avatar_url TEXT,
    
    -- Metadata y estado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT accounts_username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
    CONSTRAINT accounts_display_name_length CHECK (LENGTH(display_name) >= 1)
);

-- 3. TABLA DE RELACIONES (entre cuentas)
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_a_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    account_b_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Perspectivas bilaterales
    perspective_a JSONB DEFAULT '{"saved_name": null, "tags": [], "status": "active"}'::jsonb,
    perspective_b JSONB DEFAULT '{"saved_name": null, "tags": [], "status": "active"}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT relationships_no_self_ref CHECK (account_a_id != account_b_id),
    CONSTRAINT relationships_unique_pair CHECK (
        (account_a_id, account_b_id) IN (
            SELECT LEAST(account_a_id, account_b_id), GREATEST(account_a_id, account_b_id)
        )
    )
);

-- 4. TABLA DE CONVERSACIONES
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('web', 'whatsapp', 'telegram')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed', 'frozen')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contexto adicional
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT conversations_unique_relationship_channel UNIQUE (relationship_id, channel)
);

-- 5. TABLA DE PARTICIPANTES DE CONVERSACIÓN (Decisión 5)
-- Reemplaza a relationships como fuente de verdad para participación
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    target_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Estado y rol del participante
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed', 'banned')),
    role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('participant', 'admin', 'moderator')),
    
    -- Perspectiva individual
    perspective JSONB DEFAULT '{"saved_name": null, "tags": [], "notifications": true, "muted": false}'::jsonb,
    
    -- Timestamps
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT conversation_participants_unique UNIQUE (conversation_id, target_account_id),
    CONSTRAINT conversation_participants_status_check CHECK (
        (status = 'active' AND left_at IS NULL) OR 
        (status != 'active' AND left_at IS NOT NULL)
    )
);

-- 6. TABLA DE MENSAJES (rediseñada según v1.3)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_account_id TEXT NOT NULL, -- ← TEXT según diseño v1.3, no UUID
    generated_by VARCHAR(20) DEFAULT 'human' CHECK (generated_by IN ('human', 'ai', 'system', 'extension')),
    
    -- Contenido estructurado
    content JSONB NOT NULL, -- {text, media[], location, buttons[], reactions[]}
    
    -- Metadata del mensaje
    type VARCHAR(20) DEFAULT 'message' CHECK (type IN ('message', 'system', 'event')),
    event_type VARCHAR(50), -- Para eventos especiales: reaction, edit, delete, etc.
    
    -- Sistema de versionamiento (Decisión 1)
    parent_id UUID REFERENCES messages(id) ON DELETE CASCADE, -- Para replies y versiones
    original_id UUID REFERENCES messages(id) ON DELETE CASCADE, -- Mensaje original si es versión
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    
    -- Sistema de eliminación (Decisión 2)
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT, -- Account ID que eliminó
    deleted_scope VARCHAR(20) CHECK (deleted_scope IN ('self', 'all', 'admin')), -- Alcance de eliminación
    
    -- Sistema de congelamiento (Decisión 4)
    frozen_at TIMESTAMPTZ,
    frozen_by TEXT, -- Account ID que congeló
    frozen_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Metadata adicional
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT messages_content_not_empty CHECK (
        (content->>'text' IS NOT NULL AND content->>'text' != '') OR
        (content->>'media' IS NOT NULL AND jsonb_array_length(content->>'media') > 0) OR
        (type IN ('system', 'event'))
    ),
    CONSTRAINT messages_sender_format CHECK (
        generated_by = 'human' OR 
        (generated_by != 'human' AND sender_account_id ~ '^[a-zA-Z0-9_-]+$')
    ),
    CONSTRAINT messages_version_check CHECK (
        (original_id IS NULL AND version = 1) OR
        (original_id IS NOT NULL AND version > 1)
    ),
    CONSTRAINT messages_current_version_check CHECK (
        (is_current = true) OR
        (is_current = false AND deleted_at IS NOT NULL)
    )
);

-- 7. TABLA DE ENRIQUECIMIENTOS DE ASSETS (Decisión 3)
-- Reemplaza al sistema de audio enriquecido
CREATE TABLE IF NOT EXISTS asset_enrichments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL, -- Referencia a asset en sistema de assets
    
    -- Tipo de enriquecimiento
    enrichment_type VARCHAR(50) NOT NULL CHECK (enrichment_type IN (
        'audio_transcript', 'audio_summary', 'image_analysis', 
        'document_extract', 'video_thumbnail', 'custom'
    )),
    
    -- Contenido del enriquecimiento
    content JSONB NOT NULL, -- Datos del enriquecimiento
    
    -- Metadata
    confidence_score DECIMAL(3,2), -- 0.00 a 1.00
    processing_time_ms INTEGER,
    model_used VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT asset_enrichments_unique_message_asset UNIQUE (message_id, asset_id, enrichment_type),
    CONSTRAINT asset_enrichments_confidence_range CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- ========================================
-- ÍNDICES PARA RENDIMIENTO
-- ========================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);

-- Relationships
CREATE INDEX IF NOT EXISTS idx_relationships_a ON relationships(account_a_id);
CREATE INDEX IF NOT EXISTS idx_relationships_b ON relationships(account_b_id);
CREATE INDEX IF NOT EXISTS idx_relationships_pair ON relationships(LEAST(account_a_id, account_b_id), GREATEST(account_a_id, account_b_id));

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_relationship ON conversations(relationship_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_activity ON conversations(last_activity_at DESC);

-- Conversation Participants
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_account ON conversation_participants(target_account_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_status ON conversation_participants(status);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_active ON conversation_participants(conversation_id, target_account_id) WHERE status = 'active';

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_account_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_original ON messages(original_id);
CREATE INDEX IF NOT EXISTS idx_messages_current ON messages(conversation_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON messages(conversation_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_generated_by ON messages(generated_by);

-- Asset Enrichments
CREATE INDEX IF NOT EXISTS idx_asset_enrichments_message ON asset_enrichments(message_id);
CREATE INDEX IF NOT EXISTS idx_asset_enrichments_asset ON asset_enrichments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_enrichments_type ON asset_enrichments(enrichment_type);

-- ========================================
-- TRIGGERS Y FUNCIONES
-- ========================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at BEFORE UPDATE ON relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_enrichments_updated_at BEFORE UPDATE ON asset_enrichments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar last_activity_at en conversaciones
CREATE OR REPLACE FUNCTION update_conversation_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_activity_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_last_activity AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_activity();

-- ========================================
-- VISTAS ÚTILES
-- ========================================

-- Vista de conversaciones con participantes
CREATE OR REPLACE VIEW conversation_details AS
SELECT 
    c.id,
    c.relationship_id,
    c.channel,
    c.status,
    c.created_at,
    c.updated_at,
    c.last_activity_at,
    r.account_a_id,
    r.account_b_id,
    a1.username as account_a_username,
    a1.display_name as account_a_display_name,
    a2.username as account_b_username,
    a2.display_name as account_b_display_name,
    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL) as message_count,
    (SELECT MAX(created_at) FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL) as last_message_at
FROM conversations c
JOIN relationships r ON c.relationship_id = r.id
JOIN accounts a1 ON r.account_a_id = a1.id
JOIN accounts a2 ON r.account_b_id = a2.id;

-- Vista de mensajes con información del remitente
CREATE OR REPLACE VIEW message_details AS
SELECT 
    m.*,
    a.username as sender_username,
    a.display_name as sender_display_name,
    a.account_type as sender_account_type,
    cp.status as participant_status,
    cp.role as participant_role
FROM messages m
LEFT JOIN accounts a ON m.sender_account_id = a.id::text
LEFT JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND m.sender_account_id = cp.target_account_id::text
WHERE m.deleted_at IS NULL;

-- ========================================
-- COMENTARIOS FINALES
-- ========================================

-- Este schema implementa las 6 decisiones fundamentales del ChatCore v1.3:
-- 1. Mensajes versionados con parent_id, original_id, version, is_current
-- 2. Soft delete con deleted_at, deleted_by, deleted_scope
-- 3. Asset enrichments como tabla separada
-- 4. Conversaciones congelables con frozen_at, frozen_by, frozen_reason
-- 5. conversation_participants como fuente de verdad de participación
-- 6. sender_account_id como TEXT (no UUID) para compatibilidad con FluxCore

-- El schema está optimizado para:
-- - Consultas de conversaciones con mensajes recientes
-- - Búsqueda por remitente y conversación
-- - Filtrado de mensajes eliminados y no actuales
-- - Gestión de participantes activos
-- - Enriquecimiento de assets

-- La base de datos está lista para usarse con el sistema existente de:
-- - Assets (ya implementado)
-- - WebSocket (ya implementado) 
-- - Autenticación (ya implementado)
-- - API endpoints (ya implementados)
