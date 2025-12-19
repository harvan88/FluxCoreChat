import { Elysia, t } from 'elysia';
import { creditsService } from '../services/credits.service';
import { accountService } from '../services/account.service';

function isInternalRequest(headers: Record<string, string | undefined>): boolean {
  const configured = process.env.INTERNAL_API_KEY;
  if (!configured) return false;
  const provided = headers['x-internal-key'];
  return typeof provided === 'string' && provided.length > 0 && provided === configured;
}

export const internalCreditsRoutes = new Elysia({ prefix: '/internal/credits' })
  .post(
    '/grant-by-query',
    async ({ body, headers, set }) => {
      if (!isInternalRequest(headers as any)) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const query = String((body as any).query || '').trim();
        const amount = (body as any).amount;

        if (!query) {
          set.status = 400;
          return { success: false, message: 'query is required' };
        }

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

        const accountId = matches[0].id;
        const res = await creditsService.grant({
          accountId,
          amount,
          featureKey: (body as any).featureKey,
          metadata: {
            ...(typeof (body as any).metadata === 'object' && (body as any).metadata ? (body as any).metadata : {}),
            grantedByQuery: query,
          },
        });

        return { success: true, data: { accountId, balance: res.balance } };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      body: t.Object({
        query: t.String(),
        amount: t.Number(),
        featureKey: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ['Credits'],
        summary: 'Internal: Grant credits to an account by query (email/@username)',
      },
    }
  )
  .post(
    '/grant/:accountId',
    async ({ params, body, headers, set }) => {
      if (!isInternalRequest(headers as any)) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const res = await creditsService.grant({
          accountId: params.accountId,
          amount: (body as any).amount,
          featureKey: (body as any).featureKey,
          metadata: (body as any).metadata,
        });

        return { success: true, data: res };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({ accountId: t.String() }),
      body: t.Object({
        amount: t.Number(),
        featureKey: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ['Credits'],
        summary: 'Internal: Grant credits to an account',
      },
    }
  )
  .post(
    '/policies',
    async ({ body, headers, set }) => {
      if (!isInternalRequest(headers as any)) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const res = await creditsService.createPolicy(body as any);
        return { success: true, data: res };
      } catch (error: any) {
        set.status = 500;
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
      detail: {
        tags: ['Credits'],
        summary: 'Internal: Create a credits pricing policy (versioned)',
      },
    }
  );
