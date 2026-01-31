import { Elysia, t } from 'elysia';
import { accountDeletionService } from '../services/account-deletion.service';

export const accountDeletionPublicRoutes = new Elysia({ prefix: '/account-deletions' })
  .get(
    '/:jobId/status',
    async ({ params, query, set }) => {
      const token = query.token?.trim();
      if (!token) {
        set.status = 400;
        return { success: false, message: 'Missing snapshot download token' };
      }

      try {
        const status = await accountDeletionService.getSnapshotDownloadStatusByToken(params.jobId, token);
        return { success: true, data: status };
      } catch (error: any) {
        const code = error?.code as string | undefined;
        if (code === 'ACCOUNT_DELETION_JOB_NOT_FOUND') {
          set.status = 404;
        } else if (code === 'ACCOUNT_DELETION_SNAPSHOT_TOKEN_INVALID') {
          set.status = 403;
        } else if (code === 'ACCOUNT_DELETION_SNAPSHOT_TOKEN_EXPIRED') {
          set.status = 410;
        } else {
          set.status = 400;
        }

        return { success: false, message: error?.message || 'Failed to retrieve deletion status' };
      }
    },
    {
      params: t.Object({ jobId: t.String() }),
      query: t.Object({ token: t.String() }),
      detail: {
        tags: ['AccountDeletion'],
        summary: 'Get status of an account deletion job using a snapshot token',
      },
    }
  )
  .get(
    '/:jobId/download',
    async ({ params, query, set, request }) => {
      const token = query.token?.trim();
      if (!token) {
        set.status = 400;
        return new Response(JSON.stringify({ success: false, message: 'Missing snapshot download token' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }

      try {
        const { job, snapshotPath } = await accountDeletionService.getSnapshotArtifactByToken(params.jobId, token);

        const file = Bun.file(snapshotPath);
        if (!(await file.exists())) {
          set.status = 410;
          return new Response(JSON.stringify({ success: false, message: 'Snapshot file not found' }), {
            status: 410,
            headers: { 'content-type': 'application/json' },
          });
        }

        await accountDeletionService.markSnapshotDownloaded(job, request.headers.get('user-agent') ?? undefined);

        const filename = `${job.accountId}-${job.id}.zip`;
        return new Response(file, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      } catch (error: any) {
        const code = error?.code as string | undefined;
        let status = 400;
        if (code === 'ACCOUNT_DELETION_JOB_NOT_FOUND') {
          status = 404;
        } else if (code === 'ACCOUNT_DELETION_SNAPSHOT_TOKEN_INVALID') {
          status = 403;
        } else if (code === 'ACCOUNT_DELETION_SNAPSHOT_TOKEN_EXPIRED') {
          status = 410;
        } else if (code === 'ACCOUNT_DELETION_SNAPSHOT_MISSING') {
          status = 409;
        }

        return new Response(JSON.stringify({ success: false, message: error?.message || 'Failed to download snapshot' }), {
          status,
          headers: { 'content-type': 'application/json' },
        });
      }
    },
    {
      params: t.Object({ jobId: t.String() }),
      query: t.Object({ token: t.String() }),
      detail: {
        tags: ['AccountDeletion'],
        summary: 'Download snapshot ZIP using a secure token',
      },
    }
  );
