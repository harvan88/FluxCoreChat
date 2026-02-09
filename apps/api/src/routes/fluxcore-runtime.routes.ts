import { Elysia, t } from 'elysia';
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';
import { fluxcoreService } from '../services/fluxcore.service';
import { retrievalService } from '../services/retrieval.service';
import { ragConfigService } from '../services/rag-config.service';
import { aiTemplateService } from '../services/ai-template.service';
import { PromptBuilder } from '../../../../extensions/fluxcore/src/prompt-builder';
import { buildExtraInstructions } from '../../../../extensions/fluxcore/src/prompt-utils';

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
  .get('/prompt-preview/:assistantId', async ({ params, query, set }) => {
    try {
      const composition = await fluxcoreService.getAssistantComposition(params.assistantId);
      if (!composition) {
        set.status = 404;
        return { success: false, message: 'Assistant not found' };
      }

      const assistant = composition.assistant;
      if (query.accountId && assistant.accountId !== query.accountId) {
        set.status = 403;
        return { success: false, message: 'Assistant does not belong to specified account' };
      }
      const hasKnowledgeBase = Array.isArray(composition.vectorStores) && composition.vectorStores.length > 0;
      const extraInstructions = buildExtraInstructions({
        instructions: composition.instructions,
        includeSearchKnowledge: hasKnowledgeBase,
      });

      const modelConfig = assistant.modelConfig ?? {};
      const promptBuilder = new PromptBuilder({
        mode: 'suggest',
        maxTokens: typeof (modelConfig as any)?.maxTokens === 'number' ? (modelConfig as any).maxTokens : 256,
        temperature: typeof modelConfig.temperature === 'number' ? modelConfig.temperature : 0.7,
        model: typeof modelConfig.model === 'string' ? modelConfig.model : 'llama-3.1-8b-instant',
      });

      const context = {
        assistantMeta: {
          assistantId: assistant.id,
          assistantName: assistant.name,
          instructionIds: composition.instructions?.map((inst: any) => inst.id) || [],
          vectorStoreIds: composition.vectorStores?.map((vs: any) => vs.id) || [],
          vectorStores: composition.vectorStores?.map((vs: any) => ({ id: vs.id, name: vs.name })) || [],
          tools: composition.tools?.map((tool: any) => ({ id: tool.id, name: tool.name })) || [],
          modelConfig: assistant.modelConfig,
        },
      } as any;

      const built = promptBuilder.build(context, assistant.accountId, extraInstructions);

      return {
        success: true,
        data: {
          systemPrompt: built.systemPrompt,
          config: built.config,
          assistant: {
            id: assistant.id,
            name: assistant.name,
            modelConfig: assistant.modelConfig,
          },
          instructionsCount: extraInstructions.length,
          hasKnowledgeBase,
        },
      };
    } catch (err: any) {
      console.error('Error building prompt preview:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    params: t.Object({
      assistantId: t.String(),
    }),
    query: t.Optional(t.Object({
      accountId: t.Optional(t.String()),
    })),
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
  })
  .post('/tools/list-templates', async ({ body, set }) => {
    const { accountId } = body;
    if (!accountId) {
      set.status = 400;
      return { success: false, message: 'accountId is required' };
    }

    try {
      const templates = await aiTemplateService.getAvailableTemplates(accountId);
      const simplified = templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        variables: t.variables?.map((v: any) => v.name) || [],
        instructions: t.aiUsageInstructions || null,
      }));
      return { success: true, data: simplified };
    } catch (err: any) {
      console.error('Error listing templates:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
    })
  })
  .post('/tools/send-template', async ({ body, set }) => {
    const { accountId, conversationId, templateId, variables } = body;
    if (!accountId || !conversationId || !templateId) {
      set.status = 400;
      return { success: false, message: 'accountId, conversationId and templateId are required' };
    }

    try {
      const result = await aiTemplateService.sendAuthorizedTemplate({
        accountId,
        conversationId,
        templateId,
        variables,
      });

      return {
        success: true,
        data: {
          messageId: (result as any)?.messageId ?? null,
          status: (result as any)?.status ?? 'sent',
        },
      };
    } catch (err: any) {
      console.error('Error sending template:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
      conversationId: t.String(),
      templateId: t.String(),
      variables: t.Optional(t.Record(t.String(), t.String())),
    })
  })
  // Diagnostic snapshot: returns full vector store state from DB (not UI cache)
  .get('/vector-store-snapshot/:id', async ({ params, query, set }) => {
    const accountId = query.accountId;
    if (!accountId) {
      set.status = 400;
      return { success: false, message: 'accountId is required' };
    }

    try {
      const store = await fluxcoreService.getVectorStoreById(params.id, accountId);
      if (!store) {
        set.status = 404;
        return { success: false, message: 'Vector store not found' };
      }

      const files = await fluxcoreService.getVectorStoreFiles(params.id);

      const ragConfig = await ragConfigService.getEffectiveConfig(params.id, accountId);

      // Chunk stats from DB
      const chunkStats = await db.execute(sql`
        SELECT
          count(*)::int as total_chunks,
          count(embedding)::int as chunks_with_embedding,
          coalesce(sum(token_count), 0)::int as total_tokens
        FROM fluxcore_document_chunks
        WHERE vector_store_id = ${params.id}::uuid
      `);
      const stats = Array.isArray(chunkStats) && chunkStats.length > 0
        ? chunkStats[0]
        : { total_chunks: 0, chunks_with_embedding: 0, total_tokens: 0 };

      // Compute real file counts and size from files table
      const realFileCount = files.length;
      const realSizeBytes = files.reduce((sum: number, f: any) => sum + (f.sizeBytes || 0), 0);
      const completedCount = files.filter((f: any) => f.status === 'completed').length;
      const failedCount = files.filter((f: any) => f.status === 'failed').length;
      const processingCount = files.filter((f: any) => f.status === 'processing').length;

      return {
        success: true,
        data: {
          vectorStore: {
            ...store,
            _computed: {
              realFileCount,
              realSizeBytes,
              realFileCounts: {
                total: realFileCount,
                completed: completedCount,
                failed: failedCount,
                in_progress: processingCount,
              },
            },
          },
          files: files.map((f: any) => ({
            id: f.id,
            name: f.name,
            status: f.status,
            sizeBytes: f.sizeBytes,
            mimeType: f.mimeType,
            errorMessage: f.errorMessage,
          })),
          ragConfig,
          chunkStats: stats,
        },
      };
    } catch (err: any) {
      console.error('Error building vector store snapshot:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    query: t.Object({
      accountId: t.String(),
    }),
  });
