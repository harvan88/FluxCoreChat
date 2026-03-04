-- Canon v8.3 — Separation of PolicyContext and RuntimeConfig
-- This migration creates the operational governance tables and columns
-- required by the new architecture.

BEGIN;

-- 1. fluxcore_projector_errors — canonical projector error log
CREATE TABLE IF NOT EXISTS fluxcore_projector_errors (
  id              BIGSERIAL PRIMARY KEY,
  projector_name  TEXT NOT NULL,
  signal_seq      BIGINT NOT NULL REFERENCES fluxcore_signals(sequence_number),
  error_message   TEXT NOT NULL,
  error_stack     TEXT,
  attempts        INT NOT NULL DEFAULT 1,
  first_failed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  last_failed_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  resolved_at     TIMESTAMPTZ,
  CONSTRAINT ux_projector_signal UNIQUE (projector_name, signal_seq)
);
CREATE INDEX IF NOT EXISTS idx_projector_errors_unresolved
  ON fluxcore_projector_errors(resolved_at);

-- 2. fluxcore_account_policies — operational governance per account
CREATE TABLE IF NOT EXISTS fluxcore_account_policies (
  account_id            TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  mode                  TEXT NOT NULL DEFAULT 'off' CHECK (mode IN ('auto', 'suggest', 'off')),
  response_delay_ms     INT  NOT NULL DEFAULT 2000,
  turn_window_ms        INT  NOT NULL DEFAULT 3000,
  turn_window_typing_ms INT  NOT NULL DEFAULT 5000,
  turn_window_max_ms    INT  NOT NULL DEFAULT 60000,
  off_hours_policy      JSONB NOT NULL DEFAULT '{"action":"ignore"}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: migrate mode/responseDelay from timingConfig of active assistants
INSERT INTO fluxcore_account_policies (account_id, mode, response_delay_ms)
SELECT
  fa.account_id::text,
  COALESCE(fa.timing_config->>'mode', 'off'),
  COALESCE((fa.timing_config->>'responseDelaySeconds')::int * 1000, 2000)
FROM fluxcore_assistants fa
WHERE fa.status = 'active'
ON CONFLICT (account_id) DO NOTHING;

-- Ensure every account has a policy row (defaults)
INSERT INTO fluxcore_account_policies (account_id)
SELECT a.id
FROM accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM fluxcore_account_policies fap WHERE fap.account_id = a.id
)
ON CONFLICT DO NOTHING;

-- 3. authorized_data_scopes column on fluxcore_assistants
ALTER TABLE fluxcore_assistants
  ADD COLUMN IF NOT EXISTS authorized_data_scopes TEXT[] NOT NULL DEFAULT '{}';

-- 4. fluxcore_action_audit — audit log for ExecutionAction results
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
CREATE INDEX IF NOT EXISTS idx_action_audit_account_date
  ON fluxcore_action_audit(account_id, executed_at DESC);

COMMIT;
