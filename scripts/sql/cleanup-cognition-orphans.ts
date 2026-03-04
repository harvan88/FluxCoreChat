#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    DELETE FROM fluxcore_cognition_queue
    WHERE conversation_id NOT IN (SELECT id FROM conversations)
      OR target_account_id IS NULL;
  `);
  console.log('[cognition_queue] 🧹 removed orphans:', result);
}

main().catch((err) => {
  console.error('[cognition_queue] ❌ cleanup failed:', err);
  process.exit(1);
});
