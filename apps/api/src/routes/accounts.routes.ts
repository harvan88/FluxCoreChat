import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { accountService } from '../services/account.service';

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
  );
