-- =====================================================
-- RFC-0001 Kernel Foundation Migration
-- FluxCore Kernel Freeze — RATIFIED
-- 
-- This migration replaces the pre-RFC kernel tables
-- with the canonical RFC-0001 schema.
--
-- Date: 2026-02-14
-- Author: RFC-0001 Implementation
-- =====================================================

-- STEP 0: SAFETY — Drop deprecated kernel tables
-- These contained business semantics (accountId, type, modality, etc.)
-- Only test data exists — no production data loss.

DROP TABLE IF EXISTS fluxcore_outbox CASCADE;
DROP TABLE IF EXISTS fluxcore_projection_cursors CASCADE;
-- Note: fluxcore_signals will be dropped and recreated
DROP TABLE IF EXISTS fluxcore_signals CASCADE;

-- STEP 1: Reality Adapters
CREATE TABLE IF NOT EXISTS fluxcore_reality_adapters (
    adapter_id      TEXT PRIMARY KEY,
    driver_id       TEXT NOT NULL,
    adapter_class   TEXT NOT NULL CHECK (adapter_class IN ('SENSOR', 'GATEWAY', 'INTERPRETER')),
    description     TEXT NOT NULL,
    signing_secret  TEXT NOT NULL,
    adapter_version TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STEP 2: Immutable Journal
CREATE TABLE IF NOT EXISTS fluxcore_signals (
    sequence_number        BIGSERIAL PRIMARY KEY,

    signal_fingerprint     TEXT NOT NULL UNIQUE,
    fact_type              TEXT NOT NULL CHECK (fact_type IN (
        'EXTERNAL_INPUT_OBSERVED',
        'EXTERNAL_STATE_OBSERVED',
        'DELIVERY_SIGNAL_OBSERVED',
        'MEDIA_CAPTURED',
        'SYSTEM_TIMER_ELAPSED',
        'CONNECTION_EVENT_OBSERVED'
    )),

    source_namespace       TEXT NOT NULL,
    source_key             TEXT NOT NULL,

    subject_namespace      TEXT,
    subject_key            TEXT,

    object_namespace       TEXT,
    object_key             TEXT,

    evidence_raw           JSONB NOT NULL,
    evidence_format        TEXT NOT NULL,
    evidence_checksum      TEXT NOT NULL,

    provenance_driver_id   TEXT NOT NULL,
    provenance_external_id TEXT,
    provenance_entry_point TEXT,

    certified_by_adapter   TEXT NOT NULL REFERENCES fluxcore_reality_adapters(adapter_id),
    certified_adapter_version TEXT NOT NULL,

    claimed_occurred_at    TIMESTAMPTZ,
    observed_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CHECK ((subject_namespace IS NULL) = (subject_key IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_fluxcore_source
    ON fluxcore_signals(source_namespace, source_key, sequence_number);

CREATE INDEX IF NOT EXISTS idx_fluxcore_subject
    ON fluxcore_signals(subject_namespace, subject_key, sequence_number)
    WHERE subject_namespace IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fluxcore_sequence
    ON fluxcore_signals(sequence_number);

CREATE INDEX IF NOT EXISTS idx_fluxcore_claimed_occurred
    ON fluxcore_signals(claimed_occurred_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fluxcore_adapter_external
    ON fluxcore_signals(certified_by_adapter, provenance_external_id)
    WHERE provenance_external_id IS NOT NULL;

-- STEP 3: Immutability Triggers
CREATE OR REPLACE FUNCTION fluxcore_prevent_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'fluxcore_signals is immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fluxcore_no_update ON fluxcore_signals;
CREATE TRIGGER fluxcore_no_update
BEFORE UPDATE ON fluxcore_signals
FOR EACH ROW EXECUTE FUNCTION fluxcore_prevent_mutation();

DROP TRIGGER IF EXISTS fluxcore_no_delete ON fluxcore_signals;
CREATE TRIGGER fluxcore_no_delete
BEFORE DELETE ON fluxcore_signals
FOR EACH ROW EXECUTE FUNCTION fluxcore_prevent_mutation();

-- STEP 4: Transactional Outbox
CREATE TABLE IF NOT EXISTS fluxcore_outbox (
    id               BIGSERIAL PRIMARY KEY,
    sequence_number  BIGINT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at     TIMESTAMPTZ
);

ALTER TABLE fluxcore_outbox
    ADD CONSTRAINT ux_outbox_sequence UNIQUE(sequence_number);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed
    ON fluxcore_outbox(processed_at)
    WHERE processed_at IS NULL;

-- STEP 5: Projector Cursors
CREATE TABLE IF NOT EXISTS fluxcore_projector_cursors (
    projector_name        TEXT PRIMARY KEY,
    last_sequence_number  BIGINT NOT NULL DEFAULT 0
);

-- STEP 6: Fact Types Reference
CREATE TABLE IF NOT EXISTS fluxcore_fact_types (
    fact_type TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

INSERT INTO fluxcore_fact_types (fact_type, description) VALUES
    ('EXTERNAL_INPUT_OBSERVED', 'An external actor sent input to FluxCore (text, media, structured data)'),
    ('EXTERNAL_STATE_OBSERVED', 'A state change was observed in an external system (read receipts, presence, etc.)'),
    ('DELIVERY_SIGNAL_OBSERVED', 'A delivery confirmation was received from an external channel'),
    ('MEDIA_CAPTURED', 'A media artifact was captured and stored'),
    ('SYSTEM_TIMER_ELAPSED', 'A system timer or scheduled event fired'),
    ('CONNECTION_EVENT_OBSERVED', 'A connection event was observed (connect, disconnect, error)')
ON CONFLICT (fact_type) DO NOTHING;

-- DONE
-- The Kernel is now RFC-0001 compliant.
-- No accountId, conversationId, messageId, or business semantics
-- exist in the Journal. All such concepts live in projectors.
