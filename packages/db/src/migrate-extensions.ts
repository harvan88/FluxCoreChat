/**
 * Migration Script: Extension System Tables
 */

import { pool } from './connection';

const migrationSQL = `
-- FC-150: Extension Installations
CREATE TABLE IF NOT EXISTS extension_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  extension_id VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  granted_permissions JSONB DEFAULT '[]'::jsonb,
  installed_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  
  UNIQUE(account_id, extension_id)
);

-- FC-151: Extension Contexts (Context Overlays)
CREATE TABLE IF NOT EXISTS extension_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id VARCHAR(100) NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  context_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  
  CONSTRAINT extension_contexts_single_fk CHECK (
    (account_id IS NOT NULL)::int +
    (relationship_id IS NOT NULL)::int +
    (conversation_id IS NOT NULL)::int = 1
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ext_installations_account ON extension_installations(account_id);
CREATE INDEX IF NOT EXISTS idx_ext_installations_extension ON extension_installations(extension_id);
CREATE INDEX IF NOT EXISTS idx_ext_contexts_extension ON extension_contexts(extension_id);
CREATE INDEX IF NOT EXISTS idx_ext_contexts_account ON extension_contexts(account_id);
CREATE INDEX IF NOT EXISTS idx_ext_contexts_relationship ON extension_contexts(relationship_id);
CREATE INDEX IF NOT EXISTS idx_ext_contexts_conversation ON extension_contexts(conversation_id);
`;

async function runMigration() {
  console.log('🔄 Running extension system migration...');
  
  try {
    await pool.unsafe(migrationSQL);
    console.log('✅ Migration completed successfully!');
    console.log('   - extension_installations table created');
    console.log('   - extension_contexts table created');
    console.log('   - Indexes created');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
