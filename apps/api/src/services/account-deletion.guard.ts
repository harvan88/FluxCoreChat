import { db } from '@fluxcore/db';
import { accounts, protectedAccounts, accountDeletionLogs } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const DEFAULT_PROTECTED_OWNER_IDS = new Set(['535949b8-58a9-4310-87a7-42a2480f5746']);

export interface AccountDeletionGuardContext {
  requesterUserId?: string;
  requesterAccountId?: string;
  details?: Record<string, unknown>;
}

interface AccountDeletionGuardDeps {
  findAccount(accountId: string): Promise<{ id: string; ownerUserId: string; protectedId: string | null } | null>;
  ensureProtectedAccountRecord(accountId: string, ownerUserId: string, reason: string): Promise<void>;
  logAttempt(entry: {
    accountId: string;
    requesterUserId?: string;
    requesterAccountId?: string;
    status: string;
    reason: string;
    details: Record<string, unknown>;
  }): Promise<void>;
}

const defaultDeps: AccountDeletionGuardDeps = {
  async findAccount(accountId: string) {
    const [account] = await db
      .select({
        id: accounts.id,
        ownerUserId: accounts.ownerUserId,
        protectedId: protectedAccounts.id,
      })
      .from(accounts)
      .leftJoin(protectedAccounts, eq(protectedAccounts.accountId, accounts.id))
      .where(eq(accounts.id, accountId))
      .limit(1);

    return account ?? null;
  },
  ensureProtectedAccountRecord(accountId, ownerUserId, reason) {
    return db
      .insert(protectedAccounts)
      .values({
        accountId,
        ownerUserId,
        reason,
        enforcedBy: 'system',
      })
      .onConflictDoNothing({ target: protectedAccounts.accountId });
  },
  logAttempt(entry) {
    return db.insert(accountDeletionLogs).values({
      accountId: entry.accountId,
      requesterUserId: entry.requesterUserId ?? null,
      requesterAccountId: entry.requesterAccountId ?? null,
      status: entry.status,
      reason: entry.reason,
      details: entry.details,
    });
  },
};

export class AccountDeletionGuard {
  constructor(
    private readonly deps: AccountDeletionGuardDeps = defaultDeps,
    private readonly protectedOwnerIds: Set<string> = DEFAULT_PROTECTED_OWNER_IDS
  ) {}

  async ensureAllowed(accountId: string, context?: AccountDeletionGuardContext) {
    const account = await this.deps.findAccount(accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    const ownerProtected = this.protectedOwnerIds.has(account.ownerUserId);
    const isProtected = ownerProtected || !!account.protectedId;

    if (isProtected) {
      if (ownerProtected && !account.protectedId) {
        await this.deps.ensureProtectedAccountRecord(account.id, account.ownerUserId, 'protected-owner');
      }

      await this.deps.logAttempt({
        accountId,
        requesterUserId: context?.requesterUserId,
        requesterAccountId: context?.requesterAccountId,
        status: 'critical_attempt',
        reason: ownerProtected ? 'protected_owner' : 'protected_account',
        details: context?.details ?? {},
      });

      const error = new Error('Account deletion is prohibited for this account');
      (error as any).code = 'ACCOUNT_DELETION_PROTECTED';
      throw error;
    }

    return account;
  }
}

export const accountDeletionGuard = new AccountDeletionGuard();

export function ensureAccountDeletionAllowed(accountId: string, context?: AccountDeletionGuardContext) {
  return accountDeletionGuard.ensureAllowed(accountId, context);
}
