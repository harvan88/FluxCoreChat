#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
  const conversationId = process.argv[2];
  if (!conversationId) {
    console.error('Usage: bunx tsx scripts/dump-cognition-queue.ts <conversationId>');
    process.exit(1);
  }

  const shouldReset = process.argv.includes('--reset');

  if (shouldReset) {
    await db.execute(sql`
      UPDATE fluxcore_cognition_queue
      SET attempts = 0,
          processed_at = NULL,
          last_error = NULL,
          turn_window_expires_at = NOW()
      WHERE conversation_id = ${conversationId}
    `);

    console.log('[dump-cognition-queue] ✅ Reset pending turns for conversation');
  }

  const result = await db.execute(sql`
    SELECT id, conversation_id, account_id, target_account_id, turn_window_expires_at, processed_at, attempts, last_signal_seq, last_error
    FROM fluxcore_cognition_queue
    WHERE conversation_id = ${conversationId}
    ORDER BY id DESC
    LIMIT 5;
  `);

  const rows = (result as any).rows ?? result;
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((err) => {
  console.error('Error running query:', err);
  process.exit(1);
});
