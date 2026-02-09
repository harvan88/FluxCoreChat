import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { accountService } from '../services/account.service';
import { creditsService } from '../services/credits.service';
import { systemAdminService } from '../services/system-admin.service';

export const creditsRoutes = new Elysia({ prefix: '/credits' })
  .use(authMiddleware)
  .get(
    '/admin/search',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const allowed = await systemAdminService.hasScope(user.id, 'credits');
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Forbidden' };
      }

      const q = String((query as any)?.q || '').trim();
      if (!q || q.length < 2) {
        return { success: true, data: [] };
      }

      try {
        const matches = await accountService.searchAccounts(q);
        const enriched = await Promise.all(
          matches.map(async (m) => {
            const balance = await creditsService.getBalance(m.id);
            return {
              id: m.id,
              username: m.username,
              displayName: m.displayName,
              accountType: m.accountType,
              balance,
            };
          })
        );

        return { success: true, data: enriched };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message || 'Search failed' };
      }
    },
    {
      isAuthenticated: true,
      query: t.Object({ q: t.Optional(t.String()) }),
      detail: { tags: ['Credits'], summary: 'Admin: Search accounts with credits balance' },
    }
  )
  .get(
    '/admin/policies',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const allowed = await systemAdminService.hasScope(user.id, 'policies');
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Forbidden' };
      }

      const filters = {
        featureKey: ((query as any)?.featureKey as string | undefined)?.trim() || undefined,
        engine: ((query as any)?.engine as string | undefined)?.trim() || undefined,
        model: ((query as any)?.model as string | undefined)?.trim() || undefined,
        active: typeof (query as any)?.active === 'string'
          ? ((query as any).active === 'true' ? true : (query as any).active === 'false' ? false : undefined)
          : undefined,
      };

      const rows = await creditsService.listPolicies(filters);
      return { success: true, data: rows };
    },
    {
      query: t.Object({
        featureKey: t.Optional(t.String()),
        engine: t.Optional(t.String()),
        model: t.Optional(t.String()),
        active: t.Optional(t.String()),
      }),
      detail: { tags: ['Credits'], summary: 'Admin: List credits policies' },
    }
  )
  .post(
    '/admin/policies',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const allowed = await systemAdminService.hasScope(user.id, 'policies');
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Forbidden' };
      }

      try {
        const result = await creditsService.createPolicy(body as any);
        return { success: true, data: result };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      body: t.Object({
        featureKey: t.String(),
        engine: t.String(),
        model: t.String(),
        costCredits: t.Number(),
        tokenBudget: t.Number(),
        durationHours: t.Optional(t.Number()),
        active: t.Optional(t.Boolean()),
      }),
      detail: { tags: ['Credits'], summary: 'Admin: Create credits policy' },
    }
  )
  .put(
    '/admin/policies/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const allowed = await systemAdminService.hasScope(user.id, 'policies');
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Forbidden' };
      }

      try {
        const updated = await creditsService.updatePolicy(params.id, body as any);
        if (!updated) {
          set.status = 404;
          return { success: false, message: 'Policy not found' };
        }
        return { success: true, data: updated };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        featureKey: t.Optional(t.String()),
        engine: t.Optional(t.String()),
        model: t.Optional(t.String()),
        costCredits: t.Optional(t.Number()),
        tokenBudget: t.Optional(t.Number()),
        durationHours: t.Optional(t.Number()),
        active: t.Optional(t.Boolean()),
      }),
      detail: { tags: ['Credits'], summary: 'Admin: Update credits policy' },
    }
  )
  .post(
    '/admin/policies/:id/toggle',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const allowed = await systemAdminService.hasScope(user.id, 'policies');
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Forbidden' };
      }

      try {
        const updated = await creditsService.setPolicyActive(params.id, body.active);
        if (!updated) {
          set.status = 404;
          return { success: false, message: 'Policy not found' };
        }
        return { success: true, data: updated };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ active: t.Boolean() }),
      detail: { tags: ['Credits'], summary: 'Admin: Toggle credits policy state' },
    }
  )
  .post(
    '/admin/grant',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const allowed = await systemAdminService.hasScope(user.id, 'credits');
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Forbidden' };
      }

      try {
        const accountIdFromBody = typeof (body as any).accountId === 'string' ? (body as any).accountId.trim() : '';
        const query = String((body as any).query || '').trim();
        const amount = (body as any).amount;

        if (!accountIdFromBody && !query) {
          set.status = 400;
          return { success: false, message: 'accountId or query is required' };
        }

        let accountId = accountIdFromBody;
        if (!accountId) {
          const matches = await accountService.searchAccounts(query);

          if (matches.length === 0) {
            set.status = 404;
            return { success: false, message: 'No account matches query' };
          }

          if (matches.length > 1) {
            set.status = 409;
            return {
              success: false,
              message: 'Multiple accounts match query. Please refine.',
              data: { matches },
            };
          }

          accountId = matches[0].id;
        }

        const account = await accountService.getAccountById(accountId);
        if (!account) {
          set.status = 404;
          return { success: false, message: 'Account not found' };
        }

        const res = await creditsService.grant({
          accountId,
          amount,
          featureKey: (body as any).featureKey,
          metadata: {
            ...(typeof (body as any).metadata === 'object' && (body as any).metadata ? (body as any).metadata : {}),
            grantedByAdminEmail: user.email,
            ...(query ? { grantedByQuery: query } : {}),
          },
        });

        return { success: true, data: { accountId, balance: res.balance } };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        accountId: t.Optional(t.String()),
        query: t.Optional(t.String()),
        amount: t.Number(),
        featureKey: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: { tags: ['Credits'], summary: 'Admin: Grant credits to an account by query' },
    }
  )
  .get(
    '/balance',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = (query as any)?.accountId as string | undefined;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const balance = await creditsService.getBalance(accountId);
      return { success: true, data: { balance } };
    },
    {
      query: t.Object({ accountId: t.String() }),
      detail: { tags: ['Credits'], summary: 'Get credits balance for an account' },
    }
  )
  .get(
    '/session',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = (query as any)?.accountId as string | undefined;
      const conversationId = (query as any)?.conversationId as string | undefined;
      const featureKey = ((query as any)?.featureKey as string | undefined) || 'ai.session';

      if (!accountId || !conversationId) {
        set.status = 400;
        return { success: false, message: 'accountId and conversationId are required' };
      }

      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const session = await creditsService.getActiveConversationSession({
        accountId,
        conversationId,
        featureKey,
      });

      return {
        success: true,
        data: session
          ? {
              id: session.id,
              featureKey: session.featureKey,
              engine: session.engine,
              model: session.model,
              tokenBudget: session.tokenBudget,
              tokensUsed: session.tokensUsed,
              tokensRemaining: Math.max(0, session.tokenBudget - session.tokensUsed),
              expiresAt: session.expiresAt,
            }
          : null,
      };
    },
    {
      query: t.Object({
        accountId: t.String(),
        conversationId: t.String(),
        featureKey: t.Optional(t.String()),
      }),
      detail: { tags: ['Credits'], summary: 'Get active premium session for a conversation' },
    }
  );
