-- AD portal: drop FK so logs survive account purge
ALTER TABLE account_deletion_logs
  DROP CONSTRAINT IF EXISTS account_deletion_logs_account_id_fkey;
