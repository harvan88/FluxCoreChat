import { db } from './index';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🚀 Ejecutando migración 013: account_ai_entitlements...');

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS account_ai_entitlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        enabled BOOLEAN NOT NULL DEFAULT false,
        allowed_providers JSONB DEFAULT '[]'::jsonb,
        default_provider VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(account_id)
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_account_ai_entitlements_account
      ON account_ai_entitlements (account_id)
    `);

    console.log('✅ Migración 013 completada exitosamente');
  } catch (error: any) {
    console.error('❌ Error en migración:', error.message);
    throw error;
  }

  process.exit(0);
}

runMigration();
