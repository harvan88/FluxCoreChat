-- 046: Add owner_account_id to conversations
-- Links visitor conversations to the tenant account (e.g., Carlos)
-- so they appear in the account's conversation list.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS owner_account_id UUID REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_conversations_owner_account
  ON conversations(owner_account_id)
  WHERE owner_account_id IS NOT NULL;
