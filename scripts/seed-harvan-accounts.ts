#!/usr/bin/env bun
/**
 * Seed: recreate harvan@hotmail.es user + child accounts
 */

import { db, users, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { hash } from 'bcrypt';

const USER_ID = '535949b8-58a9-4310-87a7-42a2480f5746';
const DEFAULT_PASSWORD = '4807114hH.';

const ACCOUNT_DEFS = [
  {
    id: '3e94f74e-e6a0-4794-bd66-16081ee3b02d',
    username: 'harvan_mkokevb2',
    displayName: 'Harold Ordóñez',
    accountType: 'personal' as const,
    alias: 'harold',
    email: 'harvan@hotmail.es',
  },
  {
    id: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
    username: 'daniel_mkonr9z2',
    displayName: 'Daniel Test',
    accountType: 'personal' as const,
    alias: 'daniel',
    email: 'daniel@test.com',
  },
  {
    id: '5f96c4c5-473b-4574-93ce-53f54225dd18',
    username: 'fluxcore',
    displayName: 'Flux Core',
    accountType: 'business' as const,
    alias: 'fluxcore',
    email: 'fluxcore@fluxcore.system',
  },
];

async function ensureUser() {
  const [existing] = await db.select().from(users).where(eq(users.id, USER_ID)).limit(1);
  if (existing) {
    console.log('⏭️  User already exists:', existing.email);
    return existing;
  }

  const passwordHash = await hash(DEFAULT_PASSWORD, 10);
  const [created] = await db
    .insert(users)
    .values({
      id: USER_ID,
      email: 'harvan@hotmail.es',
      name: 'Harold Ordóñez',
      passwordHash,
    })
    .returning();

  console.log('✅ User created:', created.email);
  return created;
}

async function ensureAccount(def: typeof ACCOUNT_DEFS[number], ownerUserId: string) {
  const [existing] = await db.select().from(accounts).where(eq(accounts.id, def.id)).limit(1);
  if (existing) {
    console.log(`⏭️  Account ${def.id} already exists (@${existing.username})`);
    return existing;
  }

  const [account] = await db
    .insert(accounts)
    .values({
      id: def.id,
      ownerUserId,
      username: def.username,
      displayName: def.displayName,
      accountType: def.accountType,
      alias: def.alias,
      profile: { email: def.email },
      privateContext: '',
      allowAutomatedUse: false,
      aiIncludeName: true,
      aiIncludeBio: true,
      aiIncludePrivateContext: true,
    })
    .returning();

  console.log(`✅ Account created: ${account.id} (@${account.username})`);
  return account;
}

async function main() {
  console.log('🌱 Seeding harvan accounts...');
  const user = await ensureUser();

  for (const accountDef of ACCOUNT_DEFS) {
    await ensureAccount(accountDef, user.id);
  }

  console.log('\n✅ Seed finished');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
