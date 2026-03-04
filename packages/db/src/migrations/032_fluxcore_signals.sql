-- Migration: FluxCore Signals - Sistema de Notificaciones Unificado
-- Created: 2025-01-XX
-- Description: Crea las tablas para el sistema de señales/notificaciones de FluxCore

-- ============================================
-- Enums
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_type') THEN
        CREATE TYPE signal_type AS ENUM (
            'channel_message',
            'channel_mention',
            'task_assigned',
            'ai_suggestion',
            'channel_invite',
            'role_changed',
            'security_alert',
            'fluxcore_update',
            'mention_group',
            'reaction_received',
            'system_announcement',
            'workflow_trigger',
            'approval_required',
            'deadline_approaching'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_priority') THEN
        CREATE TYPE signal_priority AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_delivery_channel') THEN
        CREATE TYPE signal_delivery_channel AS ENUM ('websocket', 'email', 'push', 'sms', 'in_app');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_status') THEN
        CREATE TYPE signal_status AS ENUM ('pending', 'delivered', 'read', 'archived', 'dismissed');
    END IF;
END $$;

-- ============================================
-- Tabla: signals
-- ============================================

CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Destinatario
    recipient_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Remitente
    sender_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_type TEXT DEFAULT 'system' CHECK (sender_type IN ('user', 'system', 'ai', 'workflow', 'integration')),
    
    -- Categorización
    type signal_type NOT NULL,
    priority signal_priority DEFAULT 'medium' NOT NULL,
    
    -- Contenido
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Navegación
    action_url TEXT,
    action_label TEXT DEFAULT 'Ver',
    
    -- Metadata
    metadata JSONB DEFAULT '{}' NOT NULL,
    
    -- Estados
    status signal_status DEFAULT 'pending' NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMPTZ,
    
    -- Delivery tracking
    delivered_via signal_delivery_channel[] DEFAULT ARRAY[]::signal_delivery_channel[],
    delivered_at TIMESTAMPTZ,
    
    -- Expiración
    expires_at TIMESTAMPTZ,
    
    -- Agrupación
    group_id TEXT,
    group_count INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para signals
CREATE INDEX IF NOT EXISTS idx_signals_recipient_account ON signals(recipient_account_id);
CREATE INDEX IF NOT EXISTS idx_signals_recipient_user ON signals(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_is_read ON signals(is_read);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(type);
CREATE INDEX IF NOT EXISTS idx_signals_priority ON signals(priority);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at);
CREATE INDEX IF NOT EXISTS idx_signals_recipient_unread ON signals(recipient_account_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_group_id ON signals(group_id);

-- ============================================
-- Tabla: signal_preferences
-- ============================================

CREATE TABLE IF NOT EXISTS signal_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Configuración por tipo
    type_settings JSONB DEFAULT '{}' NOT NULL,
    
    -- Horario de silencio
    quiet_hours_start TEXT,
    quiet_hours_end TEXT,
    quiet_hours_days TEXT[],
    quiet_hours_timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
    
    -- Frecuencia de resumen
    email_digest_frequency TEXT DEFAULT 'immediate' 
        CHECK (email_digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
    
    -- Email alternativo
    alternate_email TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Tabla: signal_delivery_log
-- ============================================

CREATE TABLE IF NOT EXISTS signal_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    channel signal_delivery_channel NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    
    attempt_count INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMPTZ,
    
    error_message TEXT,
    error_code TEXT,
    
    delivery_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para delivery log
CREATE INDEX IF NOT EXISTS idx_signal_delivery_log_signal ON signal_delivery_log(signal_id);
CREATE INDEX IF NOT EXISTS idx_signal_delivery_log_channel ON signal_delivery_log(channel);
CREATE INDEX IF NOT EXISTS idx_signal_delivery_log_status ON signal_delivery_log(status);

-- ============================================
-- Trigger para updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_signals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_signal_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_signal_delivery_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_signals_updated_at ON signals;
CREATE TRIGGER tr_signals_updated_at
    BEFORE UPDATE ON signals
    FOR EACH ROW
    EXECUTE FUNCTION update_signals_updated_at();

DROP TRIGGER IF EXISTS tr_signal_preferences_updated_at ON signal_preferences;
CREATE TRIGGER tr_signal_preferences_updated_at
    BEFORE UPDATE ON signal_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_signal_preferences_updated_at();

DROP TRIGGER IF EXISTS tr_signal_delivery_log_updated_at ON signal_delivery_log;
CREATE TRIGGER tr_signal_delivery_log_updated_at
    BEFORE UPDATE ON signal_delivery_log
    FOR EACH ROW
    EXECUTE FUNCTION update_signal_delivery_log_updated_at();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE signals IS 'Notificaciones unificadas de FluxCore';
COMMENT ON COLUMN signals.metadata IS 'Datos estructurados según el tipo de notificación';
COMMENT ON COLUMN signals.action_url IS 'URL para navegación directa al hacer clic';
COMMENT ON COLUMN signals.group_id IS 'ID para agrupar notificaciones similares (ej: mensajes de un canal)';

COMMENT ON TABLE signal_preferences IS 'Preferencias de notificaciones por usuario';
COMMENT ON TABLE signal_delivery_log IS 'Log de intentos de entrega de notificaciones';
