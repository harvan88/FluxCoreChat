import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { accountService } from '../services/account.service';
import { accountDeletionService } from '../services/account-deletion.service';
import { requireAccountDeletionAuthFromContext } from '../middleware/account-deletion-auth';

export const accountsRoutes = new Elysia({ prefix: '/accounts' })
  .use(authMiddleware)
  // GET /accounts/search?q=@alias or email
  .get(
    '/search',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const searchQuery = query.q?.trim();
      if (!searchQuery || searchQuery.length < 2) {
        return { success: true, data: [] };
      }

      try {
        const results = await accountService.searchAccounts(searchQuery);
        return { success: true, data: results };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message || 'Search failed' };
      }
    },
    {
      isAuthenticated: true,
      query: t.Object({
        q: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Accounts'],
        summary: 'Search accounts by username or email',
      },
    }
  )
  .get(
    '/',
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Unauthorized',
        };
      }

      const accounts = await accountService.getAccountsByUserId(user.id);

      return {
        success: true,
        data: accounts,
      };
    },
    {
      detail: {
        tags: ['Accounts'],
        summary: 'Get user accounts',
      },
    }
  )
  .post(
    '/',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Unauthorized',
        };
      }

      try {
        const account = await accountService.createAccount({
          ownerUserId: user.id,
          ...body,
        });

        return {
          success: true,
          data: account,
        };
      } catch (error: any) {
        set.status = 400;
        return {
          success: false,
          message: error.message || 'Failed to create account',
        };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        username: t.String({ minLength: 3, maxLength: 100 }),
        displayName: t.String({ minLength: 2, maxLength: 255 }),
        accountType: t.Union([t.Literal('personal'), t.Literal('business')]),
        profile: t.Optional(t.Any()),
        privateContext: t.Optional(t.String({ maxLength: 5000 })),
      }),
      detail: {
        tags: ['Accounts'],
        summary: 'Create new account',
      },
    }
  )
  .get(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Unauthorized',
        };
      }

      try {
        const account = await accountService.getAccountById(params.id);

        return {
          success: true,
          data: account,
        };
      } catch (error: any) {
        set.status = 404;
        return {
          success: false,
          message: error.message || 'Account not found',
        };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Accounts'],
        summary: 'Get account by ID',
      },
    }
  )
  .patch(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Unauthorized',
        };
      }

      try {
        const account = await accountService.updateAccount(params.id, user.id, body);

        return {
          success: true,
          data: account,
        };
      } catch (error: any) {
        set.status = 400;
        return {
          success: false,
          message: error.message || 'Failed to update account',
        };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        displayName: t.Optional(t.String({ minLength: 2, maxLength: 255 })),
        profile: t.Optional(t.Any()),
        privateContext: t.Optional(t.String({ maxLength: 5000 })),
      }),
      detail: {
        tags: ['Accounts'],
        summary: 'Update account',
      },
    }
  )
  // POST /accounts/:id/convert-to-business
  .post(
    '/:id/convert-to-business',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const account = await accountService.convertToBusiness(params.id, user.id);
        return { success: true, data: account };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message || 'Failed to convert account' };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Accounts'],
        summary: 'Convert personal account to business',
      },
    }
  )
  .post(
    '/:id/delete/request',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const dataHandling = (body as { dataHandling?: 'download_snapshot' | 'delete_all' } | undefined)?.dataHandling;
        const auth = await requireAccountDeletionAuthFromContext({
          user,
          params,
          body,
        });

        const job = await accountDeletionService.requestDeletion({
          accountId: params.id,
          requesterUserId: user.id,
          auth,
          preferences: dataHandling ? { dataHandling } : undefined,
        });

        return { success: true, data: job };
      } catch (error: any) {
        if (error?.code === 'ACCOUNT_DELETION_UNAUTHENTICATED') {
          set.status = 401;
        } else if (error?.code === 'ACCOUNT_DELETION_TARGET_REQUIRED' || error?.code === 'ACCOUNT_DELETION_SESSION_REQUIRED') {
          set.status = 400;
        } else if (
          error?.code === 'ACCOUNT_DELETION_UNAUTHORIZED' ||
          error?.code === 'ACCOUNT_DELETION_SESSION_MISMATCH'
        ) {
          set.status = 403;
        } else if (error?.code === 'ACCOUNT_DELETION_ACCOUNT_NOT_FOUND' || (error?.message || '').includes('not found')) {
          set.status = 404;
        } else {
          set.status = 400;
        }

        return {
          success: false,
          message: error?.message || 'Failed to request account deletion',
        };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        sessionAccountId: t.Optional(t.String()),
        dataHandling: t.Optional(t.Union([t.Literal('download_snapshot'), t.Literal('delete_all')])),
      }),
      detail: {
        tags: ['Accounts'],
        summary: 'Request irreversible account deletion',
      },
    }
  )
  .post(
    '/:id/delete/snapshot',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const auth = await requireAccountDeletionAuthFromContext({
          user,
          params,
          body,
        });

        const job = await accountDeletionService.prepareSnapshot({
          accountId: params.id,
          requesterUserId: user.id,
          auth,
        });
        return { success: true, data: job };
      } catch (error: any) {
        if (error?.code === 'ACCOUNT_DELETION_UNAUTHORIZED') {
          set.status = 403;
        } else if ((error?.message || '').includes('No deletion job')) {
          set.status = 404;
        } else {
          set.status = 400;
        }

        return {
          success: false,
          message: error?.message || 'Failed to prepare snapshot',
        };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Accounts'],
        summary: 'Prepare snapshot before account deletion',
      },
    }
  )
  .post(
    '/:id/delete/snapshot/ack',
    async ({ user, params, body, set, request }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const auth = await requireAccountDeletionAuthFromContext({
          user,
          params,
          body,
        });

        const job = await accountDeletionService.acknowledgeSnapshot({
          accountId: params.id,
          requesterUserId: user.id,
          auth,
          payload: {
            downloaded: body.downloaded,
            consent: body.consent,
            userAgent: request.headers.get('user-agent') ?? undefined,
          },
        });

        return { success: true, data: job };
      } catch (error: any) {
        if (error?.code === 'ACCOUNT_DELETION_UNAUTHORIZED') {
          set.status = 403;
        } else if (error?.code === 'ACCOUNT_DELETION_ACK_INVALID') {
          set.status = 400;
        } else if (error?.code === 'ACCOUNT_DELETION_INVALID_PHASE' || error?.code === 'ACCOUNT_DELETION_SNAPSHOT_REQUIRED') {
          set.status = 409;
        } else if ((error?.message || '').includes('No deletion job')) {
          set.status = 404;
        } else {
          set.status = 400;
        }

        return {
          success: false,
          message: error?.message || 'Failed to acknowledge snapshot',
        };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        downloaded: t.Optional(t.Boolean()),
        consent: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ['Accounts'],
        summary: 'Register snapshot download and explicit consent',
      },
    }
  )
  .post(
    '/:id/delete/confirm',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const auth = await requireAccountDeletionAuthFromContext({
          user,
          params,
          body,
        });

        const job = await accountDeletionService.confirmDeletion({
          accountId: params.id,
          requesterUserId: user.id,
          auth,
        });
        return { success: true, data: job };
      } catch (error: any) {
        if (error?.code === 'ACCOUNT_DELETION_UNAUTHORIZED') {
          set.status = 403;
        } else if ((error?.message || '').includes('No deletion job')) {
          set.status = 404;
        } else if ((error?.message || '').includes('Snapshot must be ready')) {
          set.status = 409;
        } else {
          set.status = 400;
        }

        return {
          success: false,
          message: error?.message || 'Failed to confirm deletion',
        };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Accounts'],
        summary: 'Confirm irreversible account deletion (triggers cleanup)',
      },
    }
  )
  .get(
    '/:id/delete/snapshot/download',
    async ({ user, params, set, request }) => {
      if (!user) {
        set.status = 401;
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }

      try {
        const auth = await requireAccountDeletionAuthFromContext({
          user,
          params,
          body: {},
        });

        const { job, snapshotPath } = await accountDeletionService.getSnapshotArtifact({
          accountId: params.id,
          requesterUserId: user.id,
          auth,
        });

        const file = Bun.file(snapshotPath);
        if (!(await file.exists())) {
          set.status = 404;
          return new Response(JSON.stringify({ success: false, message: 'Snapshot file not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' },
          });
        }

        await accountDeletionService.acknowledgeSnapshot({
          accountId: params.id,
          requesterUserId: user.id,
          auth,
          payload: {
            downloaded: true,
            userAgent: request.headers.get('user-agent') ?? undefined,
          },
        });

        const filename = `${job.accountId}-${job.id}.zip`;
        return new Response(file, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      } catch (error: any) {
        let status = 400;
        if (error?.code === 'ACCOUNT_DELETION_UNAUTHORIZED') {
          status = 403;
        } else if ((error?.message || '').includes('No deletion job')) {
          status = 404;
        } else if (error?.code === 'ACCOUNT_DELETION_INVALID_PHASE') {
          status = 409;
        }

        return new Response(JSON.stringify({ success: false, message: error?.message || 'Failed to download snapshot' }), {
          status,
          headers: { 'content-type': 'application/json' },
        });
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Accounts'],
        summary: 'Download latest account snapshot (requires consent)',
      },
    }
  )
  .get(
    '/:id/delete/job',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const job = await accountDeletionService.getJobForAccount(params.id);
        return { success: true, data: job ?? null };
      } catch (error: any) {
        set.status = 400;
        return {
          success: false,
          message: error?.message || 'Failed to fetch account deletion job',
        };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Accounts'],
        summary: 'Get latest account deletion job',
      },
    }
  );
