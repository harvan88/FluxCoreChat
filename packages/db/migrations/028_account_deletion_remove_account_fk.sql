-- AD portal: keep account deletion jobs after account purge
ALTER TABLE account_deletion_jobs
  DROP CONSTRAINT IF EXISTS account_deletion_jobs_account_id_fkey;
