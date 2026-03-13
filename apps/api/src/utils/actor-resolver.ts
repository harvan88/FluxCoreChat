import { db, actors } from '@fluxcore/db';
import { eq, inArray, and } from 'drizzle-orm';

/**
 * Resolve an accountId to its actor UUID.
 */
export async function resolveActorId(accountId: string): Promise<string | null> {
  const [accountActor] = await db
    .select({ id: actors.id })
    .from(actors)
    .where(and(eq(actors.accountId, accountId), eq(actors.actorType, 'account')))
    .limit(1);

  if (accountActor?.id) {
    return accountActor.id;
  }

  const [fallbackActor] = await db
    .select({ id: actors.id })
    .from(actors)
    .where(eq(actors.accountId, accountId))
    .limit(1);

  return fallbackActor?.id ?? null;
}

/**
 * Resolve or create the canonical account actor for an account.
 */
export async function getOrCreateAccountActorId(accountId: string, displayName?: string): Promise<string> {
  const existingActorId = await resolveActorId(accountId);
  if (existingActorId) return existingActorId;

  const [actor] = await db
    .insert(actors)
    .values({
      actorType: 'account',
      accountId,
      displayName: displayName || null,
    })
    .returning({ id: actors.id });

  return actor.id;
}

/**
 * Resolve an actorId back to an accountId.
 */
export async function resolveAccountId(actorId: string): Promise<string | null> {
  const [actor] = await db
    .select({ accountId: actors.accountId })
    .from(actors)
    .where(eq(actors.id, actorId))
    .limit(1);
  return actor?.accountId ?? null;
}

/**
 * Resolve multiple accountIds to their actorIds.
 * Returns a Map<accountId, actorId>.
 */
export async function resolveActorIds(accountIds: string[]): Promise<Map<string, string>> {
  if (accountIds.length === 0) return new Map();
  const rows = await db
    .select({ id: actors.id, accountId: actors.accountId })
    .from(actors)
    .where(inArray(actors.accountId, accountIds));
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.accountId) map.set(row.accountId, row.id);
  }
  return map;
}

/**
 * Resolve multiple actorIds to their accountIds.
 * Returns a Map<actorId, accountId>.
 */
export async function resolveAccountIds(actorIds: string[]): Promise<Map<string, string>> {
  if (actorIds.length === 0) return new Map();
  const rows = await db
    .select({ id: actors.id, accountId: actors.accountId })
    .from(actors)
    .where(inArray(actors.id, actorIds));
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.accountId) map.set(row.id, row.accountId);
  }
  return map;
}
