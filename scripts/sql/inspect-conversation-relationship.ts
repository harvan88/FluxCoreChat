#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const conversationId = process.argv[2];

if (!conversationId) {
  console.error('Usage: bunx tsx scripts/sql/inspect-conversation-relationship.ts <conversationId>');
  process.exit(1);
}

async function main() {
  const result = await db.execute(sql`
    SELECT r.account_a_id, r.account_b_id, c.id AS conversation_id
    FROM conversations c
    JOIN relationships r ON c.relationship_id = r.id
    WHERE c.id = ${conversationId}
    LIMIT 1;
  `);

  const rows = (result as any).rows ?? result;
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((err) => {
  console.error('[inspect-conversation-relationship] error:', err);
  process.exit(1);
});
