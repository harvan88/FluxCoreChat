#!/usr/bin/env bun
/**
 * Seed: Garantizar administradores de sistema con scope ACCOUNT_DELETE_FORCE.
 *
 * Uso:
 *   bun run packages/db/src/seed-system-admins.ts
 *
 * Variables opcionales:
 *   - ACCOUNT_DELETE_FORCE_ADMINS: lista separada por comas de correos a los que
 *     se les asignará el scope (por defecto solo harvan@hotmail.es).
 */

import { db } from './connection';
import { systemAdmins, users } from './schema';
import { eq } from 'drizzle-orm';

const DEFAULT_SCOPES = {
  credits: true,
  policies: true,
  ACCOUNT_DELETE_FORCE: true,
};

function getTargetEmails(): string[] {
  const raw = process.env.ACCOUNT_DELETE_FORCE_ADMINS || 'harvan@hotmail.es';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function findUserIdByEmail(email: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return user?.id ?? null;
}

async function ensureAdmin(email: string) {
  const userId = await findUserIdByEmail(email);
  if (!userId) {
    console.warn(`⚠️  Usuario con email ${email} no existe. Crea el usuario antes de otorgar scopes.`);
    return false;
  }

  await db
    .insert(systemAdmins)
    .values({ userId, scopes: DEFAULT_SCOPES, createdBy: null })
    .onConflictDoUpdate({
      target: systemAdmins.userId,
      set: { scopes: DEFAULT_SCOPES },
    });

  console.log(`✅ ${email} ahora tiene scope ACCOUNT_DELETE_FORCE`);
  return true;
}

async function main() {
  console.log('🔐 Semilla de system_admins (ACCOUNT_DELETE_FORCE)');
  const emails = getTargetEmails();
  if (emails.length === 0) {
    console.log('No se especificaron correos. Define ACCOUNT_DELETE_FORCE_ADMINS.');
    return;
  }

  let successCount = 0;
  for (const email of emails) {
    const granted = await ensureAdmin(email);
    if (granted) {
      successCount += 1;
    }
  }

  console.log(`
Resumen: ${successCount}/${emails.length} administradores actualizados.
`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error ejecutando seed de system_admins:', error);
    process.exit(1);
  });
