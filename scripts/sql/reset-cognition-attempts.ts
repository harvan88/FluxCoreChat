#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`
    UPDATE fluxcore_cognition_queue
    SET attempts = 0,
        last_error = NULL,
        turn_window_expires_at = NOW() - interval '1 second'
    WHERE processed_at IS NULL
      AND attempts >= 3;
  `);
  console.log('[cognition_queue] ✅ reset attempts for stuck turns');
}

main().catch((err) => {
  console.error('[cognition_queue] ❌ reset failed:', err);
  process.exit(1);
});
