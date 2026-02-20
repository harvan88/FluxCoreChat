-- 038_widget_identity_model.sql
-- Objetivo: Modelo de identidad para actores provisionales del widget embebible
--
-- Cambios:
--   1. fluxcore_actors — nuevas columnas (type, external_key, tenant_id, created_from_signal)
--   2. fluxcore_actor_identity_links — tabla de vínculos provisional→real
--   3. conversations — visitor_token, identity_linked_at, linked_account_id

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. Columnas adicionales en fluxcore_actors
-- ─────────────────────────────────────────────────────────

ALTER TABLE fluxcore_actors
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'real' CHECK (type IN ('provisional', 'real')),
    ADD COLUMN IF NOT EXISTS external_key TEXT,
    ADD COLUMN IF NOT EXISTS tenant_id TEXT,
    ADD COLUMN IF NOT EXISTS created_from_signal BIGINT REFERENCES fluxcore_signals(sequence_number);

CREATE INDEX IF NOT EXISTS idx_fluxcore_actors_external_key
    ON fluxcore_actors (external_key)
    WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fluxcore_actors_tenant
    ON fluxcore_actors (tenant_id)
    WHERE tenant_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────
-- 2. Tabla fluxcore_actor_identity_links
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxcore_actor_identity_links (
    id                    BIGSERIAL PRIMARY KEY,
    provisional_actor_id  TEXT NOT NULL,
    real_account_id       TEXT NOT NULL,
    tenant_id             TEXT NOT NULL,
    linking_signal_seq    BIGINT NOT NULL REFERENCES fluxcore_signals(sequence_number),
    linked_at             TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (provisional_actor_id)
);

CREATE INDEX IF NOT EXISTS idx_actor_identity_links_real
    ON fluxcore_actor_identity_links (real_account_id);

-- ─────────────────────────────────────────────────────────
-- 3. Columnas adicionales en conversations (widget support)
-- ─────────────────────────────────────────────────────────

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS visitor_token TEXT,
    ADD COLUMN IF NOT EXISTS identity_linked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS linked_account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_visitor_token
    ON conversations (visitor_token)
    WHERE visitor_token IS NOT NULL;

COMMIT;
