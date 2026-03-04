#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`ALTER TABLE fluxcore_cognition_queue ADD COLUMN IF NOT EXISTS target_account_id uuid;`);
  console.log('[migrate] ✅ target_account_id column ensured on fluxcore_cognition_queue');
}

main().catch((err) => {
  console.error('[migrate] ❌ Failed to add column:', err);
  process.exit(1);
});
