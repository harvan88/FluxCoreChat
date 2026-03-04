-- PASO 1.1: Crear tabla de políticas de cuenta
CREATE TABLE IF NOT EXISTS fluxcore_account_policies (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id            TEXT NOT NULL UNIQUE,
  tone                  TEXT NOT NULL DEFAULT 'neutral'
                        CHECK (tone IN ('formal', 'casual', 'neutral')),
  use_emojis            BOOLEAN NOT NULL DEFAULT false,
  language              TEXT NOT NULL DEFAULT 'es',
  mode                  TEXT NOT NULL DEFAULT 'off'
                        CHECK (mode IN ('auto', 'suggest', 'off')),
  response_delay_ms     INT NOT NULL DEFAULT 3000,
  turn_window_ms        INT NOT NULL DEFAULT 3000,
  turn_window_typing_ms INT NOT NULL DEFAULT 5000,
  turn_window_max_ms    INT NOT NULL DEFAULT 60000,
  off_hours_policy      JSONB NOT NULL DEFAULT '{"action":"ignore"}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PASO 1.2: Migrar datos existentes (con valores por defecto seguros)
INSERT INTO fluxcore_account_policies (
  account_id, tone, use_emojis, language, mode, response_delay_ms
)
SELECT
  a.account_id::text,
  COALESCE(a.timing_config->>'tone', 'neutral'),
  COALESCE((a.timing_config->>'useEmojis')::boolean, false),
  COALESCE(a.timing_config->>'language', 'es'),
  COALESCE(a.timing_config->>'mode', 'off'),
  COALESCE((a.timing_config->>'responseDelaySeconds')::int * 1000, 3000)
FROM fluxcore_assistants a
WHERE a.status = 'production' OR a.status = 'active'
ON CONFLICT (account_id) DO NOTHING;

-- PASO 1.3: Agregar authorized_data_scopes a fluxcore_assistants
ALTER TABLE fluxcore_assistants
  ADD COLUMN IF NOT EXISTS authorized_data_scopes TEXT[] NOT NULL DEFAULT '{}';

-- PASO 1.4: Crear fluxcore_action_audit
CREATE TABLE IF NOT EXISTS fluxcore_action_audit (
  id               BIGSERIAL PRIMARY KEY,
  conversation_id  TEXT NOT NULL,
  account_id       TEXT NOT NULL,
  runtime_id       TEXT NOT NULL,
  action_type      TEXT NOT NULL,
  action_payload   JSONB,
  status           TEXT NOT NULL CHECK (status IN ('executed', 'rejected', 'failed')),
  rejection_reason TEXT,
  executed_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_action_audit_account ON fluxcore_action_audit(account_id, executed_at DESC);
