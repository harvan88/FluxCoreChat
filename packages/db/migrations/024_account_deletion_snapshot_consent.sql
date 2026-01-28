-- Hito AD-120: Snapshot + consentimiento expreso

ALTER TABLE account_deletion_jobs
  ADD COLUMN IF NOT EXISTS snapshot_downloaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snapshot_download_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_acknowledged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS account_deletion_jobs_snapshot_ack_idx
  ON account_deletion_jobs (snapshot_acknowledged_at);
