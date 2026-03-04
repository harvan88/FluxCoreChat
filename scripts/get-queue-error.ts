#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const result = await db.execute(sql`
  SELECT id, conversation_id, last_error, attempts
  FROM fluxcore_cognition_queue
  WHERE processed_at IS NULL
  ORDER BY turn_started_at DESC
  LIMIT 1
`) as any;

const row = result.rows?.[0] as any;
if (row) {
  console.log('=== COGNITION QUEUE ERROR ===');
  console.log('ID:', row.id);
  console.log('Conversation:', row.conversation_id);
  console.log('Attempts:', row.attempts);
  console.log('\n--- Error Message ---');
  console.log(row.last_error);
} else {
  console.log('No pending entries in cognition queue');
}

process.exit(0);
