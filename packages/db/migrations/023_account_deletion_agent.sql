-- Hito AD-100/AD-170: Tablas para agente de eliminación de cuentas

CREATE TABLE IF NOT EXISTS protected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    enforced_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT protected_accounts_account_unique UNIQUE (account_id)
);

CREATE TABLE IF NOT EXISTS account_deletion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    phase VARCHAR(50) NOT NULL DEFAULT 'snapshot',
    snapshot_url TEXT,
    snapshot_ready_at TIMESTAMPTZ,
    external_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_deletion_jobs_account_idx ON account_deletion_jobs (account_id);
CREATE INDEX IF NOT EXISTS account_deletion_jobs_status_idx ON account_deletion_jobs (status);

CREATE TABLE IF NOT EXISTS account_deletion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES account_deletion_jobs(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    requester_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL,
    reason TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_deletion_logs_account_idx ON account_deletion_logs (account_id);
CREATE INDEX IF NOT EXISTS account_deletion_logs_job_idx ON account_deletion_logs (job_id);
