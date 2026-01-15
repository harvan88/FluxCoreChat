import { Elysia, t } from 'elysia';
import { fluxcoreService } from '../services/fluxcore.service';
import { retrievalService } from '../services/retrieval.service';

export const fluxcoreRuntimeRoutes = new Elysia({ prefix: '/fluxcore/runtime' })
  .get('/active-assistant', async ({ query, set }) => {
    const accountId = query.accountId;
    if (!accountId) {
      set.status = 400;
      return 'accountId is required';
    }

    try {
      const composition = await fluxcoreService.resolveActiveAssistant(accountId);
      if (!composition) {
        set.status = 500;
        return 'Could not resolve active assistant';
      }
      return composition;
    } catch (err: any) {
      console.error('Error resolving active assistant:', err);
      set.status = 500;
      return 'Internal Server Error';
    }
  }, {
    query: t.Object({
      accountId: t.String()
    })
  })
  .get('/composition/:assistantId', async ({ params, set }) => {
    try {
      const composition = await fluxcoreService.getAssistantComposition(params.assistantId);
      if (!composition) {
        set.status = 404;
        return 'Assistant not found';
      }
      return composition;
    } catch (err: any) {
      console.error('Error fetching assistant composition:', err);
      set.status = 500;
      return 'Internal Server Error';
    }
  }, {
    params: t.Object({
      assistantId: t.String()
    })
  })
  // RAG-008: Endpoint para obtener contexto RAG de vector stores
  .post('/rag-context', async ({ body, set }) => {
    const { accountId, query, vectorStoreIds, options } = body;

    if (!accountId || !query) {
      set.status = 400;
      return { success: false, message: 'accountId and query are required' };
    }

    try {
      // Si no se especifican vectorStoreIds, intentar obtener del asistente activo
      let vsIds = vectorStoreIds;
      if (!vsIds || vsIds.length === 0) {
        const composition = await fluxcoreService.resolveActiveAssistant(accountId);
        if (composition?.vectorStores) {
          vsIds = composition.vectorStores.map((vs: any) => vs.id);
        }
      }

      if (!vsIds || vsIds.length === 0) {
        return {
          success: true,
          data: {
            context: '',
            sources: [],
            totalTokens: 0,
            chunksUsed: 0,
          }
        };
      }

      const ragContext = await retrievalService.buildContext(
        query,
        vsIds,
        accountId,
        options
      );

      return {
        success: true,
        data: ragContext,
      };
    } catch (err: any) {
      console.error('Error building RAG context:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
      query: t.String(),
      vectorStoreIds: t.Optional(t.Array(t.String())),
      options: t.Optional(t.Object({
        topK: t.Optional(t.Number()),
        minScore: t.Optional(t.Number()),
        maxTokens: t.Optional(t.Number()),
      })),
    })
  });

