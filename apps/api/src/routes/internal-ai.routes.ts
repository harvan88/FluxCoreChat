import { Elysia, t } from 'elysia';
import { aiEntitlementsService } from '../services/ai-entitlements.service';

function isInternalRequest(headers: Record<string, string | undefined>): boolean {
  const configured = process.env.INTERNAL_API_KEY;
  if (!configured) return false;
  const provided = headers['x-internal-key'];
  return typeof provided === 'string' && provided.length > 0 && provided === configured;
}

export const internalAiRoutes = new Elysia({ prefix: '/internal/ai' })
  .patch(
    '/entitlements/:accountId',
    async ({ params, body, headers, set }) => {
      if (!isInternalRequest(headers as any)) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const updated = await aiEntitlementsService.upsertEntitlement(params.accountId, body as any);
        return { success: true, data: updated };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({ accountId: t.String() }),
      body: t.Object({
        enabled: t.Optional(t.Boolean()),
        allowedProviders: t.Optional(t.Array(t.Union([t.Literal('groq'), t.Literal('openai')]))),
        defaultProvider: t.Optional(t.Union([t.Literal('groq'), t.Literal('openai'), t.Null()])),
      }),
      detail: {
        tags: ['AI'],
        summary: 'Internal: Upsert AI entitlements for an account',
      },
    }
  );
