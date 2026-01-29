import { describe, it, beforeEach, expect, mock } from 'bun:test';
import { Elysia } from 'elysia';

const mockListJobs = mock(async () => [{ id: 'job-1', status: 'external_cleanup' }]);
const mockGetStats = mock(async () => ({ jobs: [], queue: null }));
const mockRetryPhase = mock(async () => ({ jobId: 'job-1', phase: 'external_cleanup' }));

const mockHasScope = mock(async () => true);

mock.module('../services/account-deletion.admin.service', () => ({
  accountDeletionAdminService: {
    listJobs: mockListJobs,
    getStats: mockGetStats,
    retryJobPhase: mockRetryPhase,
  },
}));

mock.module('../services/system-admin.service', () => ({
  systemAdminService: {
    hasScope: mockHasScope,
  },
}));

const { accountDeletionAdminRoutes } = await import('./account-deletion.admin.routes');

function buildApp() {
  return new Elysia().use(accountDeletionAdminRoutes);
}

describe('accountDeletionAdminRoutes', () => {
  beforeEach(() => {
    mockListJobs.mockClear();
    mockGetStats.mockClear();
    mockRetryPhase.mockClear();
    mockHasScope.mockReset();
    mockHasScope.mockImplementation(async () => true);
  });

  async function request(
    app: Elysia,
    path: string,
    init: RequestInit = {},
  ) {
    const response = await app.handle(
      new Request(`http://localhost${path}`, {
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'admin-user',
          ...(init.headers || {}),
        },
        ...init,
      }),
    );

    return { response, data: await response.json() } as const;
  }

  it('rejects unauthenticated requests', async () => {
    const app = buildApp();
    const { response, data } = await request(app, '/internal/account-deletions', {
      headers: { 'x-user-id': '' },
    });

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(mockListJobs).not.toHaveBeenCalled();
  });

  it('lists jobs when scope is allowed', async () => {
    const app = buildApp();
    const { response, data } = await request(app, '/internal/account-deletions?limit=5');

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockListJobs).toHaveBeenCalledWith({ limit: 5, statuses: undefined });
  });

  it('returns stats payload', async () => {
    const app = buildApp();
    const { response, data } = await request(app, '/internal/account-deletions/stats', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGetStats).toHaveBeenCalledTimes(1);
  });

  it('rejects retry when scope missing', async () => {
    mockHasScope.mockResolvedValueOnce(false);
    const app = buildApp();
    const { response, data } = await request(app, '/internal/account-deletions/job-id/retry-phase', {
      method: 'POST',
      body: JSON.stringify({ phase: 'external_cleanup' }),
    });

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(mockRetryPhase).not.toHaveBeenCalled();
  });

  it('allows retry for supported phase', async () => {
    const app = buildApp();
    const { response, data } = await request(app, '/internal/account-deletions/job-id/retry-phase', {
      method: 'POST',
      body: JSON.stringify({ phase: 'external_cleanup' }),
    });

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRetryPhase).toHaveBeenCalledWith('job-id', 'external_cleanup');
  });

  it('returns 400 for unsupported retry phase', async () => {
    const app = buildApp();
    const { response, data } = await request(app, '/internal/account-deletions/job-id/retry-phase', {
      method: 'POST',
      body: JSON.stringify({ phase: 'completed' }),
    });

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(mockRetryPhase).not.toHaveBeenCalled();
  });
});
