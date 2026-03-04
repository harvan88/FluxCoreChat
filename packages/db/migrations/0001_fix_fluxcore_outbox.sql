-- Migration: Fix fluxcore_outbox structure for ChatCore → Kernel flow
-- This ensures fluxcore_outbox has the correct structure for the new flow

-- Drop existing table if it has wrong structure (safe to recreate)
DROP TABLE IF EXISTS fluxcore_outbox CASCADE;

-- Create fluxcore_outbox with correct structure
CREATE TABLE fluxcore_outbox (
    id BIGSERIAL PRIMARY KEY,
    signal_id BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent')),
    attempts BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    last_error TEXT
);

-- Create indexes for efficient processing
CREATE INDEX idx_fluxcore_outbox_pending ON fluxcore_outbox(status, created_at);
CREATE INDEX idx_fluxcore_outbox_signal_id ON fluxcore_outbox(signal_id);

-- Add foreign key constraint to fluxcore_signals
ALTER TABLE fluxcore_outbox 
ADD CONSTRAINT fk_fluxcore_outbox_signal 
FOREIGN KEY (signal_id) REFERENCES fluxcore_signals(sequence_number) 
ON DELETE CASCADE;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON fluxcore_outbox TO your_user;
