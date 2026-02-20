-- FluxCore v8.2 — Invariant Validation Script
-- Canon §8: These properties must be true at all times.
-- Run on schedule (recommended: every hour) and alert if any query returns rows.
--
-- Usage:
--   psql $DATABASE_URL -f scripts/validate-invariants.sql
--
-- Each query returns rows ONLY when the invariant is VIOLATED.
-- A clean run returns 0 rows for each check.

-- ─── INVARIANT 1 ─────────────────────────────────────────────────────────────
-- Canon §8.3: messages.signal_id is UNIQUE.
-- Any duplicate means the same external message was processed twice.
\echo '--- INV-1: messages.signal_id uniqueness ---'
SELECT
    signal_id,
    COUNT(*) AS duplicate_count
FROM messages
WHERE signal_id IS NOT NULL
GROUP BY signal_id
HAVING COUNT(*) > 1;

-- ─── INVARIANT 2 ─────────────────────────────────────────────────────────────
-- Canon §8.5: Maximum ONE pending entry per conversation_id in cognition_queue.
-- Multiple pending entries means the turn-window upsert is broken.
\echo '--- INV-2: cognition_queue pending uniqueness per conversation ---'
SELECT
    conversation_id,
    COUNT(*) AS pending_count
FROM fluxcore_cognition_queue
WHERE processed_at IS NULL
GROUP BY conversation_id
HAVING COUNT(*) > 1;

-- ─── INVARIANT 3 ─────────────────────────────────────────────────────────────
-- Canon §8.2: Every projector cursor <= max(sequence_number) in fluxcore_signals.
-- A cursor ahead of the max signal means it's lying about what it processed.
\echo '--- INV-3: projector cursors do not exceed max signal sequence ---'
SELECT
    p.projector_name,
    p.last_sequence_number AS cursor_seq,
    MAX(s.sequence_number) AS max_signal_seq
FROM fluxcore_projector_cursors p
CROSS JOIN fluxcore_signals s
GROUP BY p.projector_name, p.last_sequence_number
HAVING p.last_sequence_number > MAX(s.sequence_number);

-- ─── INVARIANT 4 ─────────────────────────────────────────────────────────────
-- Canon §8: fluxcore_signals is append-only.
-- This checks for any signals with future timestamps that look suspicious.
-- (Cannot enforce DELETE prevention via SQL alone; use DB triggers.)
\echo '--- INV-4: no signals with future observed_at (clock skew check) ---'
SELECT
    sequence_number,
    fact_type,
    observed_at
FROM fluxcore_signals
WHERE observed_at > NOW() + INTERVAL '5 minutes'
ORDER BY sequence_number DESC
LIMIT 10;

-- ─── INVARIANT 5 ─────────────────────────────────────────────────────────────
-- Canon §8.6: CognitionWorker should not process entries whose window hasn't expired.
-- Stuck entries (attempts >= 3, never processed) indicate a systemic failure.
\echo '--- INV-5: stuck cognition entries (max attempts, never processed) ---'
SELECT
    id,
    conversation_id,
    account_id,
    attempts,
    last_error,
    turn_window_expires_at,
    created_at
FROM fluxcore_cognition_queue
WHERE processed_at IS NULL
  AND attempts >= 3
ORDER BY created_at ASC;

-- ─── INVARIANT 6 (H4 — Fluxi/WES) ───────────────────────────────────────────
-- Canon §8.14: No ExternalEffectClaim without a prior ProposedWork.
-- Activate after H4 tables are created.
-- \echo '--- INV-6: no ExternalEffectClaim without ProposedWork ---'
-- SELECT c.id, c.account_id, c.effect_type, c.semantic_context_id
-- FROM fluxcore_external_effect_claims c
-- LEFT JOIN fluxcore_proposed_works p ON c.semantic_context_id = p.id
-- WHERE p.id IS NULL;

-- ─── INVARIANT 7 (H4 — Fluxi/WES) ───────────────────────────────────────────
-- Canon §8.15: A SemanticContext can only be consumed once.
-- Activate after H4 tables are created.
-- \echo '--- INV-7: SemanticContext consumed more than once ---'
-- SELECT semantic_context_id, COUNT(*) AS consume_count
-- FROM fluxcore_semantic_commits
-- GROUP BY semantic_context_id
-- HAVING COUNT(*) > 1;

\echo '--- Invariant validation complete. Zero rows above = all invariants hold. ---'
