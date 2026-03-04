#!/usr/bin/env bun
import { db, conversations } from '@fluxcore/db';

async function main() {
  const conversationId = process.argv[2];
  if (!conversationId) {
    console.error('Usage: bunx tsx scripts/inspect-conversation.ts <conversationId>');
    process.exit(1);
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(conversations.id.eq(conversationId as any))
    .limit(1);

  console.log(JSON.stringify(conversation, null, 2));
}

main().catch((err) => {
  console.error('[inspect-conversation] error:', err);
  process.exit(1);
});
