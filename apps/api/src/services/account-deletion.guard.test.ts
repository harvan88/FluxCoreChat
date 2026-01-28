import { describe, it, expect } from 'bun:test';
import { AccountDeletionGuard } from './account-deletion.guard';

type GuardFactoryOptions = {
  account?: { id: string; ownerUserId: string; protectedId: string | null } | null;
  ownerProtected?: boolean;
};

type GuardFactoryResult = {
  guard: AccountDeletionGuard;
  account: { id: string; ownerUserId: string; protectedId: string | null } | null;
  calls: {
    ensureProtectedAccountRecord: Array<{ accountId: string; ownerUserId: string; reason: string }>;
    logAttempt: Array<{
      accountId: string;
      requesterUserId?: string;
      requesterAccountId?: string;
      status: string;
      reason: string;
      details: Record<string, unknown>;
    }>;
  };
};

function createGuard(options: GuardFactoryOptions = {}): GuardFactoryResult {
  const account =
    options.account ?? ({ id: 'account-1', ownerUserId: 'owner-1', protectedId: null } as const);

  const calls = {
    ensureProtectedAccountRecord: [] as Array<{ accountId: string; ownerUserId: string; reason: string }>,
    logAttempt: [] as GuardFactoryResult['calls']['logAttempt'],
  };

  const protectedOwnerIds = new Set<string>();
  if (options.ownerProtected && account) {
    protectedOwnerIds.add(account.ownerUserId);
  }

  const guard = new AccountDeletionGuard(
    {
      async findAccount(accountId: string) {
        if (!account) {
          return null;
        }
        return accountId === account.id ? account : null;
      },
      async ensureProtectedAccountRecord(accountId, ownerUserId, reason) {
        calls.ensureProtectedAccountRecord.push({ accountId, ownerUserId, reason });
      },
      async logAttempt(entry) {
        calls.logAttempt.push(entry);
      },
    },
    protectedOwnerIds
  );

  return { guard, account, calls };
}

describe('AccountDeletionGuard.ensureAllowed', () => {
  it('allows deletion when the account is not protected', async () => {
    const { guard, account, calls } = createGuard();
    const result = await guard.ensureAllowed(account!.id);

    expect(result).toEqual(account);
    expect(calls.ensureProtectedAccountRecord).toHaveLength(0);
    expect(calls.logAttempt).toHaveLength(0);
  });

  it('logs and blocks when owner is part of protected set', async () => {
    const { guard, account, calls } = createGuard({ ownerProtected: true });

    await expect(
      guard.ensureAllowed(account!.id, {
        requesterUserId: 'requester-1',
        requesterAccountId: 'account-99',
        details: { phase: 'test' },
      })
    ).rejects.toHaveProperty('code', 'ACCOUNT_DELETION_PROTECTED');

    expect(calls.ensureProtectedAccountRecord).toHaveLength(1);
    expect(calls.ensureProtectedAccountRecord[0]).toMatchObject({
      accountId: account!.id,
      ownerUserId: account!.ownerUserId,
      reason: 'protected-owner',
    });

    expect(calls.logAttempt).toHaveLength(1);
    expect(calls.logAttempt[0]).toMatchObject({
      accountId: account!.id,
      requesterUserId: 'requester-1',
      requesterAccountId: 'account-99',
      status: 'critical_attempt',
      reason: 'protected_owner',
    });
  });

  it('logs and blocks when account is already listed as protected', async () => {
    const { guard, account, calls } = createGuard({
      account: { id: 'account-1', ownerUserId: 'owner-1', protectedId: 'protected-record' },
    });

    await expect(guard.ensureAllowed(account!.id)).rejects.toHaveProperty('code', 'ACCOUNT_DELETION_PROTECTED');

    expect(calls.ensureProtectedAccountRecord).toHaveLength(0);
    expect(calls.logAttempt[0]).toMatchObject({ reason: 'protected_account' });
  });

  it('throws when the account does not exist', async () => {
    const guard = new AccountDeletionGuard({
      async findAccount() {
        return null;
      },
      async ensureProtectedAccountRecord() {
        throw new Error('should not be called');
      },
      async logAttempt() {
        throw new Error('should not be called');
      },
    } as any);

    await expect(guard.ensureAllowed('missing-account')).rejects.toThrow('Account not found');
  });
});
