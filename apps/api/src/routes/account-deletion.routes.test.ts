import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Elysia } from 'elysia';

const mockRequestDeletion = mock(async (context: any) => ({
  id: 'job-request',
  accountId: context.accountId,
  status: 'pending',
  phase: 'snapshot',
}));

const mockPrepareSnapshot = mock(async (context: any) => ({
  id: 'job-snapshot',
  accountId: context.accountId,
  status: 'snapshot_ready',
  phase: 'snapshot_ready',
}));

const mockConfirmDeletion = mock(async (context: any) => ({
  id: 'job-confirm',
  accountId: context.accountId,
  status: 'external_cleanup',
  phase: 'external_cleanup',
}));

const mockGetJob = mock(async () => null);

let currentAuthResult: any = {
  mode: 'owner',
  targetAccountId: 'account-123',
  sessionAccountId: 'account-123',
};
let nextAuthError: Error | null = null;

const requireAuthMock = mock(async () => {
  if (nextAuthError) {
    throw nextAuthError;
  }
  return currentAuthResult;
});

function restoreAuthMock() {
  requireAuthMock.mockImplementation(async () => {
    if (nextAuthError) {
      throw nextAuthError;
    }
    return currentAuthResult;
  });
}

const testUserState = {
  current: { id: 'user-123' } as { id: string } | null,
};

function createAuthError(code: string, message?: string) {
  const error = new Error(message || code);
  (error as any).code = code;
  return error;
}

mock.module('../services/account-deletion.service', () => ({
  accountDeletionService: {
    requestDeletion: mockRequestDeletion,
    prepareSnapshot: mockPrepareSnapshot,
    confirmDeletion: mockConfirmDeletion,
    getJobForAccount: mockGetJob,
  },
}));

mock.module('../middleware/account-deletion-auth', () => ({
  requireAccountDeletionAuthFromContext: requireAuthMock,
}));

mock.module('../middleware/auth.middleware', () => {
  const plugin = new Elysia({ name: 'auth-mock' })
    .derive(() => ({ user: testUserState.current }))
    .macro(({ onBeforeHandle }) => ({
      isAuthenticated(enabled: boolean) {
        if (!enabled) return;
        onBeforeHandle(({ set }) => {
          if (!testUserState.current) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
          }
        });
      },
    }));

  return {
    authMiddleware: plugin,
    __setTestAuthUser(user: { id: string } | null) {
      testUserState.current = user;
    },
  };
});

const { accountsRoutes } = await import('./accounts.routes');
const authModule = (await import('../middleware/auth.middleware')) as any;
const setTestAuthUser = authModule.__setTestAuthUser as (user: { id: string } | null) => void;

function buildApp() {
  return new Elysia().use(accountsRoutes);
}

describe('Account deletion routes authorization', () => {
  beforeEach(() => {
    mockRequestDeletion.mockReset();
    mockPrepareSnapshot.mockReset();
    mockConfirmDeletion.mockReset();
    mockGetJob.mockReset();
    requireAuthMock.mockReset();
    restoreAuthMock();
    currentAuthResult = {
      mode: 'owner',
      targetAccountId: 'account-123',
      sessionAccountId: 'account-123',
    };
    nextAuthError = null;
    setTestAuthUser({ id: 'user-123' });
  });

  async function request(app: Elysia, path: string, body?: unknown) {
    const payload = body === undefined ? {} : body;
    const response = await app.handle(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    );

    const data = await response.json();
    return { response, data } as const;
  }

  it('allows owner deletion requests when session matches target', async () => {
    currentAuthResult = {
      mode: 'owner',
      targetAccountId: 'account-owner',
      sessionAccountId: 'account-owner',
    };

    const app = buildApp();
    const { response, data } = await request(app, '/accounts/account-owner/delete/request', {
      sessionAccountId: 'account-owner',
    });

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRequestDeletion).toHaveBeenCalledTimes(1);
    expect(mockRequestDeletion.mock.calls[0][0].auth.mode).toBe('owner');
  });

  it('returns 403 when middleware rejects with ACCOUNT_DELETION_UNAUTHORIZED', async () => {
    nextAuthError = createAuthError('ACCOUNT_DELETION_UNAUTHORIZED');
    const app = buildApp();

    const { response, data } = await request(app, '/accounts/account-owner/delete/request', {
      sessionAccountId: 'account-owner',
    });

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(mockRequestDeletion).not.toHaveBeenCalled();
  });

  it('returns 400 when middleware rejects with ACCOUNT_DELETION_SESSION_REQUIRED', async () => {
    nextAuthError = createAuthError('ACCOUNT_DELETION_SESSION_REQUIRED');
    const app = buildApp();

    const { response, data } = await request(app, '/accounts/account-owner/delete/request');

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(mockRequestDeletion).not.toHaveBeenCalled();
  });

  it('returns 401 when the request is unauthenticated', async () => {
    setTestAuthUser(null);
    const app = buildApp();

    const { response, data } = await request(app, '/accounts/account-owner/delete/request');

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(requireAuthMock).not.toHaveBeenCalled();
    expect(mockRequestDeletion).not.toHaveBeenCalled();
  });

  it('passes force-mode auth to snapshot route', async () => {
    currentAuthResult = {
      mode: 'force',
      targetAccountId: 'account-target',
      sessionAccountId: null,
    };

    const app = buildApp();
    const { response, data } = await request(app, '/accounts/account-target/delete/snapshot');

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrepareSnapshot).toHaveBeenCalledTimes(1);
    expect(mockPrepareSnapshot.mock.calls[0][0].auth.mode).toBe('force');
  });

  it('passes force-mode auth to confirm route and surfaces worker errors', async () => {
    currentAuthResult = {
      mode: 'force',
      targetAccountId: 'account-target',
      sessionAccountId: null,
    };

    const app = buildApp();
    const { response, data } = await request(app, '/accounts/account-target/delete/confirm');

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockConfirmDeletion).toHaveBeenCalledTimes(1);
    expect(mockConfirmDeletion.mock.calls[0][0].auth.mode).toBe('force');
  });
});
