import { describe, it, expect } from 'bun:test';
import { ensureAccountDeletionAuth } from './account-deletion-auth';

type OverrideOptions = Partial<{
  ownerUserId: string | null;
  hasForceScope: boolean;
}>;

const buildDeps = (overrides: OverrideOptions = {}) => {
  const ownerUserId = overrides.ownerUserId ?? 'owner-user';
  const hasForceScope = overrides.hasForceScope ?? false;

  return {
    async getOwnerUserId(accountId: string) {
      return accountId === 'target-account' ? ownerUserId : null;
    },
    async hasForceScope(userId?: string) {
      return Boolean(userId) && hasForceScope;
    },
  } as const;
};

describe('ensureAccountDeletionAuth', () => {
  it('allows owner deletion when session matches target', async () => {
    const result = await ensureAccountDeletionAuth(
      {
        userId: 'owner-user',
        targetAccountId: 'target-account',
        sessionAccountId: 'target-account',
      },
      buildDeps()
    );

    expect(result).toEqual({ mode: 'owner' });
  });

  it('rejects owner deletion if session is missing', async () => {
    await expect(
      ensureAccountDeletionAuth(
        {
          userId: 'owner-user',
          targetAccountId: 'target-account',
          sessionAccountId: null,
        },
        buildDeps()
      )
    ).rejects.toHaveProperty('code', 'ACCOUNT_DELETION_SESSION_REQUIRED');
  });

  it('allows admin deletion when user has ACCOUNT_DELETE_FORCE scope', async () => {
    const result = await ensureAccountDeletionAuth(
      {
        userId: 'admin-user',
        targetAccountId: 'target-account',
        sessionAccountId: null,
      },
      buildDeps({ hasForceScope: true })
    );

    expect(result).toEqual({ mode: 'force' });
  });

  it('rejects non-owner without force scope', async () => {
    await expect(
      ensureAccountDeletionAuth(
        {
          userId: 'other-user',
          targetAccountId: 'target-account',
          sessionAccountId: 'target-account',
        },
        buildDeps()
      )
    ).rejects.toHaveProperty('code', 'ACCOUNT_DELETION_UNAUTHORIZED');
  });

  it('rejects when account does not exist', async () => {
    await expect(
      ensureAccountDeletionAuth(
        {
          userId: 'owner-user',
          targetAccountId: 'missing-account',
          sessionAccountId: 'missing-account',
        },
        buildDeps()
      )
    ).rejects.toHaveProperty('code', 'ACCOUNT_DELETION_ACCOUNT_NOT_FOUND');
  });
});
