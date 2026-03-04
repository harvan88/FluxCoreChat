#!/usr/bin/env bun
import { db, accounts } from '@fluxcore/db';

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error('Usage: bunx tsx scripts/inspect-account.ts <account-id-or-username>');
    process.exit(1);
  }

  const result = await db
    .select()
    .from(accounts)
    .where(identifier.includes('-') ? accounts.id.eq(identifier as any) : accounts.username.eq(identifier as any))
    .limit(1);

  console.log(JSON.stringify(result[0] ?? null, null, 2));
}

main().catch((err) => {
  console.error('[inspect-account] error:', err);
  process.exit(1);
});
