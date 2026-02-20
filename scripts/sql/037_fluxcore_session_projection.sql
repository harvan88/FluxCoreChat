-- 037_fluxcore_session_projection.sql
-- Objetivo: crear tabla de proyección soberana para sesiones de login kernel-first

BEGIN;

CREATE TABLE IF NOT EXISTS public.fluxcore_session_projection (
    session_id UUID PRIMARY KEY,
    actor_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    entry_point TEXT,
    device_hash TEXT,
    method TEXT,
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'invalidated')),
    last_sequence_number BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fluxcore_session_projection_account
    ON public.fluxcore_session_projection (account_id);

CREATE INDEX IF NOT EXISTS idx_fluxcore_session_projection_actor
    ON public.fluxcore_session_projection (actor_id);

CREATE INDEX IF NOT EXISTS idx_fluxcore_session_projection_device
    ON public.fluxcore_session_projection (device_hash);

CREATE INDEX IF NOT EXISTS idx_fluxcore_session_projection_status
    ON public.fluxcore_session_projection (status);

CREATE INDEX IF NOT EXISTS idx_fluxcore_session_projection_sequence
    ON public.fluxcore_session_projection (last_sequence_number);

INSERT INTO public.fluxcore_projector_cursors (projector_name, last_sequence_number)
SELECT 'session_projector', 0
WHERE NOT EXISTS (
    SELECT 1 FROM public.fluxcore_projector_cursors WHERE projector_name = 'session_projector'
);

COMMIT;
