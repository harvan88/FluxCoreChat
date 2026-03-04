ALTER TABLE conversations ALTER COLUMN relationship_id DROP NOT NULL;
ALTER TABLE conversations ADD COLUMN owner_account_id UUID REFERENCES accounts(id);
-- Optional: Backfill owner_account_id from relationship.accountAId for existing conversations?
-- UPDATE conversations c SET owner_account_id = r.account_a_id FROM relationships r WHERE c.relationship_id = r.id;
