-- 042: Ensure unique partial index for cognition queue ON CONFLICT
-- Needed for ChatProjector/message dispatcher UPSERTs targeting conversation_id
-- without touching historical processed rows.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cognition_queue_pending_conversation
    ON fluxcore_cognition_queue (conversation_id)
    WHERE processed_at IS NULL;

COMMIT;
