#!/usr/bin/env bun
/**
 * CLI para gestionar system_admins.
 * Uso:
 *   bun run packages/db/src/system-admins-cli.ts list
 *   bun run packages/db/src/system-admins-cli.ts add --email user@example.com [--scopes credits,policies] [--created-by admin@example.com]
 *   bun run packages/db/src/system-admins-cli.ts remove --email user@example.com
 */

import { db } from './connection';
import { systemAdmins, users } from './schema';
import { eq } from 'drizzle-orm';

interface ArgsMap {
  [key: string]: string | undefined;
}

function parseArgs(argv: string[]): { command: string | undefined; flags: ArgsMap } {
  const [, , command, ...rest] = argv;
  const flags: ArgsMap = {};

  for (let i = 0; i < rest.length; i += 1) {
    const item = rest[i];
    if (!item?.startsWith('--')) continue;
    const key = item.replace(/^--/, '');
    const value = rest[i + 1]?.startsWith('--') || rest[i + 1] === undefined ? undefined : rest[i + 1];
    if (value !== undefined) {
      flags[key] = value;
      i += 1;
    } else {
      flags[key] = 'true';
    }
  }

  return { command, flags };

}

function usage(code = 0) {
  console.log(`
System Admins CLI
Commands:
  list
  add --email user@example.com [--scopes credits,policies] [--created-by admin@example.com]
  remove --email user@example.com
`);
  process.exit(code);
}

function parseScopes(value?: string) {
  if (!value) {
    return { credits: true };
  }
  const flags = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (flags.length === 0) {
    return { credits: true };
  }
  return flags.reduce<Record<string, boolean>>((acc, scope) => {
    acc[scope] = true;
    return acc;
  }, {});
}

async function findUserIdByEmail(email?: string) {
  if (!email) return null;
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return user ?? null;
}

async function listAdmins() {
  const entries = await db
    .select({
      userId: systemAdmins.userId,
      scopes: systemAdmins.scopes,
      createdAt: systemAdmins.createdAt,
      email: users.email,
      name: users.name,
    })
    .from(systemAdmins)
    .leftJoin(users, eq(systemAdmins.userId, users.id));

  if (entries.length === 0) {
    console.log('No hay system_admins registrados.');
    return;
  }

  console.table(
    entries.map((entry) => ({
      userId: entry.userId,
      email: entry.email ?? '(sin usuario)',
      name: entry.name ?? '',
      scopes: Object.keys(entry.scopes ?? {}).filter((key) => entry.scopes?.[key]).join(', '),
      createdAt: entry.createdAt?.toISOString?.() ?? '',
    }))
  );
}

async function addAdmin(flags: ArgsMap) {
  const email = flags.email;
  if (!email) {
    console.error('Falta --email');
    usage(1);
  }

  const user = await findUserIdByEmail(email);
  if (!user) {
    console.error(`Usuario con email ${email} no encontrado.`);
    process.exit(1);
  }

  const createdByEmail = flags['created-by'];
  const createdBy = createdByEmail ? await findUserIdByEmail(createdByEmail) : null;

  const scopes = parseScopes(flags.scopes);

  await db
    .insert(systemAdmins)
    .values({
      userId: user.id,
      scopes,
      createdBy: createdBy?.id ?? null,
    })
    .onConflictDoUpdate({
      target: systemAdmins.userId,
      set: { scopes, createdBy: createdBy?.id ?? null },
    });

  console.log(`✅ ${email} ahora es system_admin con scopes: ${Object.keys(scopes).join(', ')}`);
}

async function removeAdmin(flags: ArgsMap) {
  const email = flags.email;
  if (!email) {
    console.error('Falta --email');
    usage(1);
  }

  const user = await findUserIdByEmail(email);
  if (!user) {
    console.error(`Usuario con email ${email} no encontrado.`);
    process.exit(1);
  }

  await db.delete(systemAdmins).where(eq(systemAdmins.userId, user.id));
  console.log(`✅ ${email} ya no es system_admin.`);
}

async function main() {
  const { command, flags } = parseArgs(process.argv);
  if (!command || command === '--help' || command === 'help') {
    usage(0);
  }

  if (command === 'list') {
    await listAdmins();
    process.exit(0);
  }

  if (command === 'add') {
    await addAdmin(flags);
    process.exit(0);
  }

  if (command === 'remove') {
    await removeAdmin(flags);
    process.exit(0);
  }

  console.error(`Comando desconocido: ${command}`);
  usage(1);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
