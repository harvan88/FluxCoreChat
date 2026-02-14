/**
 * Migration: Fase 3 — Agent Runtime Engine tables
 * Creates fluxcore_agents and fluxcore_agent_assistants if they don't exist.
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/fluxcore';
const sql = postgres(connectionString);

const migration = `
-- fluxcore_agents
CREATE TABLE IF NOT EXISTS fluxcore_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  flow JSONB NOT NULL DEFAULT '{"steps":[]}'::jsonb,
  scopes JSONB NOT NULL DEFAULT '{"allowedModels":[],"maxTotalTokens":5000,"maxExecutionTimeMs":30000,"allowedTools":[],"canCreateSubAgents":false}'::jsonb,
  trigger_config JSONB DEFAULT '{"type":"message_received"}'::jsonb,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fluxcore_agents_account ON fluxcore_agents(account_id);
CREATE INDEX IF NOT EXISTS idx_fluxcore_agents_status ON fluxcore_agents(status);

-- fluxcore_agent_assistants
CREATE TABLE IF NOT EXISTS fluxcore_agent_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES fluxcore_agents(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES fluxcore_assistants(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL DEFAULT 'worker',
  step_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fluxcore_agent_assistants_agent ON fluxcore_agent_assistants(agent_id);
CREATE INDEX IF NOT EXISTS idx_fluxcore_agent_assistants_assistant ON fluxcore_agent_assistants(assistant_id);
`;

async function migrate() {
  console.log('🔄 Running Fase 3 migration: Agent Runtime Engine tables...');
  try {
    await sql.unsafe(migration);
    console.log('✅ fluxcore_agents and fluxcore_agent_assistants created successfully.');
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  Tables already exist, skipping.');
    } else {
      console.error('❌ Migration failed:', error.message);
    }
  }
  await sql.end();
  process.exit(0);
}

migrate();
