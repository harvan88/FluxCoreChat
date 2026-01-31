-- AD-portal: keep deletion jobs/logs accessible after account purge
ALTER TABLE account_deletion_logs
  DROP CONSTRAINT IF EXISTS account_deletion_logs_account_id_accounts_id_fk;

ALTER TABLE account_deletion_jobs
  DROP CONSTRAINT IF EXISTS account_deletion_jobs_account_id_accounts_id_fk;
