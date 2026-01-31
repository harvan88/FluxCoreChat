import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Elysia } from 'elysia';
import { accountDeletionPublicRoutes } from './account-deletion.public.routes';

type MockedService = {
  getSnapshotDownloadStatusByToken: ReturnType<typeof mock>;
  getSnapshotArtifactByToken: ReturnType<typeof mock>;
  markSnapshotDownloaded: ReturnType<typeof mock>;
};

const mockedService: MockedService = {
  getSnapshotDownloadStatusByToken: mock(async () => ({} as any)),
  getSnapshotArtifactByToken: mock(async () => ({ job: {} as any, snapshotPath: '' })),
  markSnapshotDownloaded: mock(async () => ({} as any)),
};

mock.module('../services/account-deletion.service', () => ({
  accountDeletionService: mockedService,
}));

const { accountDeletionService } = await import('../services/account-deletion.service');

function buildApp() {
  return new Elysia().use(accountDeletionPublicRoutes);
}

describe('account-deletion.public.routes', () => {
  beforeEach(() => {
    mockedService.getSnapshotDownloadStatusByToken.mockReset();
    mockedService.getSnapshotArtifactByToken.mockReset();
    mockedService.markSnapshotDownloaded.mockReset();
  });

  describe('GET /account-deletions/:jobId/status', () => {
    it('returns status when token is valid', async () => {
      const data = {
        jobId: 'job-1',
        accountId: 'acc-1',
        status: 'snapshot_ready',
        phase: 'snapshot',
        snapshotReadyAt: new Date().toISOString(),
        downloadAvailable: true,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        completedAt: null,
      };
      mockedService.getSnapshotDownloadStatusByToken.mockResolvedValueOnce(data);

      const app = buildApp();
      const response = await app.handle(
        new Request('http://localhost/account-deletions/job-1/status?token=abc')
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true, data });
      expect(accountDeletionService.getSnapshotDownloadStatusByToken).toHaveBeenCalledWith('job-1', 'abc');
    });

    it('returns 400 when token is missing', async () => {
      const app = buildApp();
      const response = await app.handle(new Request('http://localhost/account-deletions/job-1/status'));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(accountDeletionService.getSnapshotDownloadStatusByToken).not.toHaveBeenCalled();
    });

    it('maps service errors to HTTP status codes', async () => {
      const error = new Error('Token expired');
      (error as any).code = 'ACCOUNT_DELETION_SNAPSHOT_TOKEN_EXPIRED';
      mockedService.getSnapshotDownloadStatusByToken.mockRejectedValueOnce(error);

      const app = buildApp();
      const response = await app.handle(
        new Request('http://localhost/account-deletions/job-1/status?token=abc')
      );

      expect(response.status).toBe(410);
    });
  });

  describe('GET /account-deletions/:jobId/download', () => {
    it('streams snapshot when token is valid', async () => {
      const job = {
        id: 'job-1',
        accountId: 'acc-1',
        snapshotDownloadedAt: null,
        snapshotDownloadCount: 0,
        metadata: {},
      } as any;
      const snapshotPath = new URL('./account-deletion.public.routes.test.ts', import.meta.url).pathname;
      mockedService.getSnapshotArtifactByToken.mockResolvedValueOnce({ job, snapshotPath });

      const app = buildApp();
      const response = await app.handle(
        new Request('http://localhost/account-deletions/job-1/download?token=abc')
      );

      expect(response.status).toBe(200);
      expect(accountDeletionService.getSnapshotArtifactByToken).toHaveBeenCalledWith('job-1', 'abc');
      expect(accountDeletionService.markSnapshotDownloaded).toHaveBeenCalledWith(job, expect.any(String));
      expect(response.headers.get('content-type')).toBe('application/zip');
    });

    it('returns 400 when token is missing', async () => {
      const app = buildApp();
      const response = await app.handle(new Request('http://localhost/account-deletions/job-1/download'));

      expect(response.status).toBe(400);
      expect(accountDeletionService.getSnapshotArtifactByToken).not.toHaveBeenCalled();
    });

    it('returns specific status when service throws mapped error', async () => {
      const error = new Error('Token invalid');
      (error as any).code = 'ACCOUNT_DELETION_SNAPSHOT_TOKEN_INVALID';
      mockedService.getSnapshotArtifactByToken.mockRejectedValueOnce(error);

      const app = buildApp();
      const response = await app.handle(
        new Request('http://localhost/account-deletions/job-1/download?token=abc')
      );

      expect(response.status).toBe(403);
    });

    it('returns 410 when file no longer exists', async () => {
      const job = {
        id: 'job-1',
        accountId: 'acc-1',
        metadata: {},
      } as any;
      mockedService.getSnapshotArtifactByToken.mockResolvedValueOnce({ job, snapshotPath: '/tmp/missing-file.zip' });

      const app = buildApp();
      const response = await app.handle(
        new Request('http://localhost/account-deletions/job-1/download?token=abc')
      );

      expect(response.status).toBe(410);
    });
  });
});
