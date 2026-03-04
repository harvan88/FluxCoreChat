#!/usr/bin/env bun
import { db, fluxcoreAccountPolicies } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

const [policy] = await db
  .select()
  .from(fluxcoreAccountPolicies)
  .where(eq(fluxcoreAccountPolicies.accountId, ACCOUNT_ID))
  .limit(1);

console.log('=== POLICY DATA ===');
if (policy) {
  console.log('accountId:', policy.accountId);
  console.log('mode:', policy.mode);
  console.log('responseDelayMs:', policy.responseDelayMs);
  console.log('turnWindowMs:', policy.turnWindowMs);
  console.log('turnWindowTypingMs:', policy.turnWindowTypingMs);
  console.log('turnWindowMaxMs:', policy.turnWindowMaxMs);
  console.log('offHoursPolicy:', policy.offHoursPolicy);
  console.log('offHoursPolicy type:', typeof policy.offHoursPolicy);
  console.log('offHoursPolicy is null:', policy.offHoursPolicy === null);
  console.log('offHoursPolicy is undefined:', policy.offHoursPolicy === undefined);
} else {
  console.log('No policy found for account');
}

process.exit(0);
