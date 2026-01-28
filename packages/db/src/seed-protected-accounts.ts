#!/usr/bin/env bun
/**
 * Seed: Catalogar cuentas protegidas para eliminaciones.
 *
 * Uso:
 *   bun run packages/db/src/seed-protected-accounts.ts
 *
 * Variables opcionales:
 *   - PROTECTED_OWNER_EMAIL: email del owner que debe estar bloqueado (default: harvan@hotmail.es)
 *   - PROTECTED_OWNER_ID: fuerza un UUID de usuario, ignora el email
 */

import { db } from './connection';
import { users, accounts, protectedAccounts } from './schema';
import { eq } from 'drizzle-orm';

const DEFAULT_OWNER_EMAIL = 'harvan@hotmail.es';
const ENFORCER = 'seed:protected-accounts';

async function resolveOwnerId() {
  const forcedId = process.env.PROTECTED_OWNER_ID?.trim();
  if (forcedId) {
    return forcedId;
  }

  const targetEmail = (process.env.PROTECTED_OWNER_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, targetEmail))
    .limit(1);

  if (!owner) {
    console.error(`❌ No existe usuario con email ${targetEmail}. Crea el usuario antes de proteger cuentas.`);
    return null;
  }

  return owner.id;
}

async function listAccountsByOwner(ownerId: string) {
  return db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
    })
    .from(accounts)
    .where(eq(accounts.ownerUserId, ownerId));
}

async function listExistingProtectedAccountIds(ownerId: string) {
  const rows = await db
    .select({ accountId: protectedAccounts.accountId })
    .from(protectedAccounts)
    .where(eq(protectedAccounts.ownerUserId, ownerId));

  return new Set(rows.map((row) => row.accountId));
}

async function protectOwnerAccounts() {
  console.log('🛡️  Catalogando cuentas protegidas...');

  const ownerId = await resolveOwnerId();
  if (!ownerId) {
    process.exit(1);
  }

  const ownerAccounts = await listAccountsByOwner(ownerId);
  if (ownerAccounts.length === 0) {
    console.log('ℹ️  El owner especificado no tiene cuentas registradas. Sin cambios.');
    return;
  }

  const existing = await listExistingProtectedAccountIds(ownerId);
  const pending = ownerAccounts.filter((account) => !existing.has(account.id));

  if (pending.length === 0) {
    console.log('✅ Todas las cuentas del owner ya estaban protegidas.');
    return;
  }

  await db
    .insert(protectedAccounts)
    .values(
      pending.map((account) => ({
        accountId: account.id,
        ownerUserId: ownerId,
        reason: 'protected-owner',
        enforcedBy: ENFORCER,
      }))
    )
    .onConflictDoNothing({ target: protectedAccounts.accountId });

  const protectedIds = pending.map((account) => account.id);
  console.log(`✅ ${pending.length} cuenta(s) quedaron protegidas.`);
  console.log('IDs:', protectedIds.join(', '));
}

protectOwnerAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error ejecutando seed de cuentas protegidas:', error);
    process.exit(1);
  });
