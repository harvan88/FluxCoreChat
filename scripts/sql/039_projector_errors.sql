-- Migration 039: fluxcore_projector_errors
-- Canon §3.2 — Projector Error Log
-- A failed projection is recorded here. The cursor does NOT advance.
-- The projector retries on next wakeUp. An operator resolves via resolved_at.

CREATE TABLE IF NOT EXISTS fluxcore_projector_errors (
  id              BIGSERIAL PRIMARY KEY,
  projector_name  TEXT NOT NULL,
  signal_seq      BIGINT NOT NULL
    REFERENCES fluxcore_signals(sequence_number) ON DELETE CASCADE,
  error_message   TEXT NOT NULL,
  error_stack     TEXT,
  attempts        INT NOT NULL DEFAULT 1,
  first_failed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  last_failed_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  resolved_at     TIMESTAMPTZ,
  CONSTRAINT ux_projector_signal UNIQUE (projector_name, signal_seq)
);

CREATE INDEX IF NOT EXISTS idx_projector_errors_unresolved
  ON fluxcore_projector_errors (resolved_at)
  WHERE resolved_at IS NULL;
