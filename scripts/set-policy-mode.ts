#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
  const accountId = process.argv[2];
  const mode = (process.argv[3] || 'auto') as 'auto' | 'suggest' | 'off';
  if (!accountId) {
    console.error('Usage: bunx tsx scripts/set-policy-mode.ts <accountId> [mode]');
    process.exit(1);
  }

  await db.execute(sql`
    INSERT INTO fluxcore_account_policies (account_id, mode)
    VALUES (${accountId}, ${mode})
    ON CONFLICT (account_id)
    DO UPDATE SET mode = EXCLUDED.mode, updated_at = NOW();
  `);

  console.log(`[set-policy-mode] ✅ account=${accountId} mode=${mode}`);
}

main().catch((err) => {
  console.error('[set-policy-mode] error:', err);
  process.exit(1);
});
