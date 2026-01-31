-- AD portal: allow logs to persist even if account_deletion_jobs row is gone
ALTER TABLE account_deletion_logs
  DROP CONSTRAINT IF EXISTS account_deletion_logs_job_id_fkey;
