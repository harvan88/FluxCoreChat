#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

console.log('Clearing cognition queue...');
const result = await db.execute(sql`
  DELETE FROM fluxcore_cognition_queue
  WHERE processed_at IS NULL
  RETURNING id
`) as any;

const count = result.rows?.length ?? 0;
console.log(`✅ Cleared ${count} pending entries from cognition queue`);

process.exit(0);
