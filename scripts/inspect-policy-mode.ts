#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
  const rows = await db.execute(sql`
    SELECT account_id, mode, response_delay_ms, turn_window_ms, updated_at
    FROM fluxcore_account_policies
    ORDER BY updated_at DESC
    LIMIT 10;
  `);

  console.log(JSON.stringify((rows as any).rows ?? rows, null, 2));
}

main().catch((err) => {
  console.error('inspect-policy-mode error:', err);
  process.exit(1);
});
