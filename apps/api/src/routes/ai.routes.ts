/**
 * AI Routes - Endpoints para el sistema de IA
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import aiService from '../services/ai.service';

export const aiRoutes = new Elysia({ prefix: '/ai' })
  .use(authMiddleware)

  // GET /ai/status - Estado del servicio de IA
  .get('/status', async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const isConfigured = aiService.isConfigured();
      const isConnected = isConfigured ? await aiService.testConnection() : false;

      return {
        success: true,
        data: {
          configured: isConfigured,
          connected: isConnected,
          model: 'llama-3.1-8b-instant',
          provider: 'groq',
        },
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
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

      const suggestion = await aiService.generateResponse(
        conversationId,
        accountId,
        message
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
