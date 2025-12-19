CREATE TABLE IF NOT EXISTS credits_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT credits_wallets_account_unique UNIQUE(account_id)
);

CREATE INDEX IF NOT EXISTS idx_credits_wallets_account ON credits_wallets(account_id);

CREATE TABLE IF NOT EXISTS credits_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  entry_type VARCHAR(30) NOT NULL,
  feature_key VARCHAR(60) NOT NULL,
  engine VARCHAR(30),
  model VARCHAR(100),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  session_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_ledger_account ON credits_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_created_at ON credits_ledger(created_at);

CREATE TABLE IF NOT EXISTS credits_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR(60) NOT NULL,
  engine VARCHAR(30) NOT NULL,
  model VARCHAR(100) NOT NULL,
  cost_credits INTEGER NOT NULL,
  token_budget INTEGER NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 24,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_policies_feature ON credits_policies(feature_key);
CREATE INDEX IF NOT EXISTS idx_credits_policies_engine_model ON credits_policies(engine, model);

CREATE TABLE IF NOT EXISTS credits_conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  feature_key VARCHAR(60) NOT NULL,
  engine VARCHAR(30) NOT NULL,
  model VARCHAR(100) NOT NULL,
  cost_credits INTEGER NOT NULL,
  token_budget INTEGER NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_conversation_sessions_account ON credits_conversation_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_credits_conversation_sessions_conversation ON credits_conversation_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_credits_conversation_sessions_feature ON credits_conversation_sessions(feature_key);
CREATE INDEX IF NOT EXISTS idx_credits_conversation_sessions_expires_at ON credits_conversation_sessions(expires_at);
