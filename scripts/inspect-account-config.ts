#!/usr/bin/env bun
import { db, fluxcoreAccountPolicies, fluxcoreAssistants } from '@fluxcore/db';
import { eq, desc, or, and } from 'drizzle-orm';

async function main() {
  const accountId = process.argv[2];
  if (!accountId) {
    console.error('Usage: bunx tsx scripts/inspect-account-config.ts <accountId>');
    process.exit(1);
  }

  const [policy] = await db
    .select({ accountId: fluxcoreAccountPolicies.accountId, mode: fluxcoreAccountPolicies.mode, updatedAt: fluxcoreAccountPolicies.updatedAt })
    .from(fluxcoreAccountPolicies)
    .where(eq(fluxcoreAccountPolicies.accountId, accountId))
    .limit(1);

  const [assistant] = await db
    .select({ id: fluxcoreAssistants.id, name: fluxcoreAssistants.name, timingConfig: fluxcoreAssistants.timingConfig, updatedAt: fluxcoreAssistants.updatedAt })
    .from(fluxcoreAssistants)
    .where(
      and(
        eq(fluxcoreAssistants.accountId, accountId),
        or(eq(fluxcoreAssistants.status, 'active'), eq(fluxcoreAssistants.status, 'production')),
      )
    )
    .orderBy(desc(fluxcoreAssistants.updatedAt))
    .limit(1);

  console.log('Policy:', policy ?? null);
  console.log('Assistant:', assistant ?? null);
}

main().catch((err) => {
  console.error('[inspect-account-config] error:', err);
  process.exit(1);
});
