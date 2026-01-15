/**
 * AI Routes - Endpoints para el sistema de IA
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import aiService from '../services/ai.service';
import { accountService } from '../services/account.service';

export const aiRoutes = new Elysia({ prefix: '/ai' })
  .use(authMiddleware)

  // GET /ai/status - Estado del servicio de IA
  .get('/status', async ({ user, query, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const accountId = (query as any)?.accountId as string | undefined;

      if (accountId) {
        const userAccounts = await accountService.getAccountsByUserId(user.id);
        const allowed = userAccounts.some((a) => a.id === accountId);
        if (!allowed) {
          set.status = 403;
          return { success: false, message: 'Account does not belong to user' };
        }

        const status = await aiService.getStatusForAccount(accountId);
        return { success: true, data: status };
      }

      const envStatus = await aiService.getEnvStatus();

      return {
        success: true,
        data: {
          ...envStatus,
          provider: null,
          model: null,
          note: 'Provide ?accountId= to get entitlement-aware diagnostics',
        },
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    query: t.Object({
      accountId: t.Optional(t.String()),
    }),
  })

  // POST /ai/probe - Probar un provider/model sin depender de accountId
  .post('/probe', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { provider, model, timeoutMs } = body as any;

      const result = await aiService.probeCompletion({
        provider,
        model,
        timeoutMs,
      });

      return { success: true, data: result };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    body: t.Object({
      provider: t.Union([t.Literal('groq'), t.Literal('openai')]),
      model: t.String(),
      timeoutMs: t.Optional(t.Number()),
    }),
    detail: {
      tags: ['AI'],
      summary: 'Probe AI provider/model connectivity (no account ownership required)',
    },
  })

  // GET /ai/traces - List recent prompt traces (requires account ownership)
  .get('/traces', async ({ user, query, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const accountId = (query as any)?.accountId as string | undefined;
      const conversationId = (query as any)?.conversationId as string | undefined;
      const limitRaw = (query as any)?.limit as string | undefined;
      const limitParsed = typeof limitRaw === 'string' && limitRaw.trim().length > 0 ? Number(limitRaw) : undefined;
      const limit = Number.isFinite(limitParsed as any) ? (limitParsed as number) : undefined;

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

      const traces = await aiService.listTraces({ accountId, conversationId, limit });
      return { success: true, data: traces };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    query: t.Object({
      accountId: t.String(),
      conversationId: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })

  // GET /ai/traces/:traceId - Get trace detail (requires account ownership)
  .get('/traces/:traceId', async ({ user, params, query, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
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

      const trace = await aiService.getTrace({ accountId, traceId: params.traceId });
      if (!trace) {
        set.status = 404;
        return { success: false, message: 'Trace not found' };
      }

      return { success: true, data: trace };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      traceId: t.String(),
    }),
    query: t.Object({
      accountId: t.String(),
    }),
  })

  // DELETE /ai/traces - Clear traces for account (requires account ownership)
  .delete('/traces', async ({ user, query, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
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

      const cleared = await aiService.clearTraces({ accountId });
      return { success: true, data: { cleared } };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    query: t.Object({
      accountId: t.String(),
    }),
  })

  // POST /ai/generate - Generar respuesta manualmente
  .post('/generate', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { conversationId, accountId, message } = body as any;

      if (!conversationId || !accountId || !message) {
        set.status = 400;
        return { 
          success: false, 
          message: 'conversationId, accountId and message are required' 
        };
      }

      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const suggestion = await aiService.generateResponse(
        conversationId,
        accountId,
        message,
        { mode: 'suggest' }
      );

      if (!suggestion) {
        return {
          success: true,
          data: null,
          message: 'No suggestion generated (API may not be configured)',
        };
      }

      return {
        success: true,
        data: suggestion,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    body: t.Object({
      conversationId: t.String(),
      accountId: t.String(),
      message: t.String(),
    }),
  })

  // GET /ai/suggestions/:conversationId - Obtener sugerencias pendientes
  .get('/suggestions/:conversationId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const suggestions = aiService.getPendingSuggestions(params.conversationId);

      return {
        success: true,
        data: suggestions,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      conversationId: t.String(),
    }),
  })

  // GET /ai/suggestion/:suggestionId - Obtener una sugerencia específica
  .get('/suggestion/:suggestionId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const suggestion = aiService.getSuggestion(params.suggestionId);

      if (!suggestion) {
        set.status = 404;
        return { success: false, message: 'Suggestion not found' };
      }

      return {
        success: true,
        data: suggestion,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      suggestionId: t.String(),
    }),
  })

  // POST /ai/suggestion/:suggestionId/approve - Aprobar sugerencia
  .post('/suggestion/:suggestionId/approve', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const suggestion = aiService.approveSuggestion(params.suggestionId);

      if (!suggestion) {
        set.status = 404;
        return { success: false, message: 'Suggestion not found' };
      }

      return {
        success: true,
        data: suggestion,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      suggestionId: t.String(),
    }),
  })

  // POST /ai/suggestion/:suggestionId/reject - Rechazar sugerencia
  .post('/suggestion/:suggestionId/reject', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const suggestion = aiService.rejectSuggestion(params.suggestionId);

      if (!suggestion) {
        set.status = 404;
        return { success: false, message: 'Suggestion not found' };
      }

      return {
        success: true,
        data: suggestion,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      suggestionId: t.String(),
    }),
  })

  // POST /ai/suggestion/:suggestionId/edit - Editar y aprobar sugerencia
  .post('/suggestion/:suggestionId/edit', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { content } = body as any;

      if (!content) {
        set.status = 400;
        return { success: false, message: 'content is required' };
      }

      const suggestion = aiService.editSuggestion(params.suggestionId, content);

      if (!suggestion) {
        set.status = 404;
        return { success: false, message: 'Suggestion not found' };
      }

      return {
        success: true,
        data: suggestion,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      suggestionId: t.String(),
    }),
    body: t.Object({
      content: t.String(),
    }),
  });

export default aiRoutes;
