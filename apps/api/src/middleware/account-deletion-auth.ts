import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { systemAdminService } from '../services/system-admin.service';

export type AccountDeletionAuthMode = 'owner' | 'force';

export interface AccountDeletionAuthResult {
  mode: AccountDeletionAuthMode;
  sessionAccountId?: string | null;
  targetAccountId: string;
}

interface EnsureAccountDeletionAuthOptions {
  userId?: string;
  targetAccountId?: string;
  sessionAccountId?: string | null;
}

interface EnsureAccountDeletionAuthDeps {
  getOwnerUserId(accountId: string): Promise<string | null>;
  hasForceScope(userId?: string): Promise<boolean>;
}

const defaultDeps: EnsureAccountDeletionAuthDeps = {
  async getOwnerUserId(accountId: string) {
    const [record] = await db
      .select({ ownerUserId: accounts.ownerUserId })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);
    return record?.ownerUserId ?? null;
  },
  hasForceScope(userId?: string) {
    return systemAdminService.hasScope(userId, 'ACCOUNT_DELETE_FORCE');
  },
};

function createAuthError(message: string, code: string) {
  const error = new Error(message);
  (error as any).code = code;
  return error;
}

export async function ensureAccountDeletionAuth(
  options: EnsureAccountDeletionAuthOptions,
  deps: EnsureAccountDeletionAuthDeps = defaultDeps
): Promise<AccountDeletionAuthResult> {
  const { userId, targetAccountId, sessionAccountId } = options;

  if (!userId) {
    throw createAuthError('Authentication required', 'ACCOUNT_DELETION_UNAUTHENTICATED');
  }

  if (!targetAccountId) {
    throw createAuthError('Target account is required', 'ACCOUNT_DELETION_TARGET_REQUIRED');
  }

  if (await deps.hasForceScope(userId)) {
    return { mode: 'force', targetAccountId, sessionAccountId: null };
  }

  const ownerUserId = await deps.getOwnerUserId(targetAccountId);

  if (!ownerUserId) {
    throw createAuthError('Account not found', 'ACCOUNT_DELETION_ACCOUNT_NOT_FOUND');
  }

  if (ownerUserId !== userId) {
    throw createAuthError('Not authorized to delete this account', 'ACCOUNT_DELETION_UNAUTHORIZED');
  }

  if (!sessionAccountId) {
    throw createAuthError('Active session account is required to delete your own account', 'ACCOUNT_DELETION_SESSION_REQUIRED');
  }

  if (sessionAccountId !== targetAccountId) {
    throw createAuthError('Session account mismatch for deletion', 'ACCOUNT_DELETION_SESSION_MISMATCH');
  }

  return { mode: 'owner', targetAccountId, sessionAccountId };
}

interface RequireAccountDeletionAuthContext {
  user?: { id: string } | null;
  params?: Record<string, string>;
  body?: unknown;
  targetAccountId?: string;
  sessionAccountId?: string | null;
}

export async function requireAccountDeletionAuthFromContext(
  context: RequireAccountDeletionAuthContext
): Promise<AccountDeletionAuthResult> {
  const targetAccountId = context.targetAccountId ?? context.params?.id;
  const sessionAccountId =
    context.sessionAccountId ??
    ((context.body as { sessionAccountId?: string | null } | undefined)?.sessionAccountId ?? null);

  return ensureAccountDeletionAuth({
    userId: context.user?.id,
    targetAccountId,
    sessionAccountId,
  });
}
