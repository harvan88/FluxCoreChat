-- Fix: clear hardcoded preferredAssistantId from accountRuntimeConfig
-- Root cause: resolveAssistantId() reads preferredAssistantId first, so a stale
-- hardcoded value wins over status='active' assistant changes.
--
-- Run this once to unblock the affected account(s).
-- After the backend fix (setActiveAssistant now clears this automatically),
-- this script is only needed for already-broken accounts.

-- Option A: Clear for ALL accounts (safe — falls back to status-based resolution)
UPDATE account_runtime_config
SET config = config - 'preferredAssistantId',
    updated_at = NOW()
WHERE config ? 'preferredAssistantId';

-- Verify:
SELECT id, account_id, config
FROM account_runtime_config
WHERE config ? 'preferredAssistantId';
-- Expected: 0 rows
