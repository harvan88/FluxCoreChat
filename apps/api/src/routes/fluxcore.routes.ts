/**
 * FluxCore Routes
 * 
 * API REST para gestionar entidades de FluxCore:
 * - /fluxcore/assistants
 * - /fluxcore/instructions
 * - /fluxcore/vector-stores
 * - /fluxcore/tools
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { fluxcoreService } from '../services/fluxcore.service';
import { getOpenAIAssistant } from '../services/openai-sync.service';
import { fluxiRoutes } from './fluxcore/works.routes'; // WES-180

// ============================================================================
// ASSISTANTS ROUTES
// ============================================================================

const assistantsRoutes = new Elysia({ prefix: '/assistants' })
  .use(authMiddleware)

  // GET /fluxcore/assistants
  .get(
    '/',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const assistants = await fluxcoreService.getAssistants(accountId);
        return { success: true, data: assistants };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'List assistants for account',
      },
    }
  )

  // GET /fluxcore/assistants/active-mode?accountId=xxx  — MUST be before /:id
  .get(
    '/active-mode',
    async ({ user, query, set }) => {
      if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
      if (!query.accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }
      try {
        const result = await fluxcoreService.getActiveMode(query.accountId);
        return { success: true, data: result };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      query: t.Object({ accountId: t.String() }),
      detail: { tags: ['FluxCore'], summary: 'Get mode of active assistant' },
    }
  )

  // PATCH /fluxcore/assistants/active-mode
  .patch(
    '/active-mode',
    async ({ user, body, set }) => {
      if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
      const { accountId, mode } = body as any;
      if (!accountId || !mode) { set.status = 400; return { success: false, message: 'accountId and mode are required' }; }
      if (!['auto', 'suggest', 'off'].includes(mode)) { set.status = 400; return { success: false, message: 'mode must be auto, suggest, or off' }; }
      try {
        const result = await fluxcoreService.setActiveMode(accountId, mode);
        return { success: true, data: result };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      body: t.Object({ accountId: t.String(), mode: t.String() }),
      detail: { tags: ['FluxCore'], summary: 'Set mode of active assistant (auto|suggest|off)' },
    }
  )

  // GET /fluxcore/assistants/:id
  .get(
    '/:id',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const assistant = await fluxcoreService.getAssistantById(params.id, accountId);
        if (!assistant) {
          set.status = 404;
          return { success: false, message: 'Assistant not found' };
        }

        let instructions: string | null = null;
        if (assistant.runtime === 'openai' && assistant.externalId) {
          try {
            const remoteAssistant = await getOpenAIAssistant(assistant.externalId);
            if (typeof remoteAssistant?.instructions === 'string') {
              instructions = remoteAssistant.instructions;
            }
          } catch (err) {
            console.error('[fluxcore] No se pudo obtener instrucciones desde OpenAI:', err);
          }
        }

        return { success: true, data: { ...assistant, instructions } };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Get assistant by ID',
      },
    }
  )

  // POST /fluxcore/assistants
  .post(
    '/',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const {
          instructionId,
          instructionIds,
          vectorStoreId,
          vectorStoreIds,
          toolIds,
          ...rest
        } = body as any;

        const assistant = await fluxcoreService.createAssistant({
          ...rest,
          instructionIds: instructionIds ?? (instructionId ? [instructionId] : undefined),
          vectorStoreIds: vectorStoreIds ?? (vectorStoreId ? [vectorStoreId] : undefined),
          toolIds,
        });
        return { success: true, data: assistant };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      body: t.Object({
        accountId: t.String(),
        name: t.String(),
        description: t.Optional(t.String()),
        runtime: t.Optional(t.Union([t.Literal('local'), t.Literal('openai')])),
        externalId: t.Optional(t.String()),
        status: t.Optional(t.String()),
        instructionId: t.Optional(t.String()),
        instructionIds: t.Optional(t.Array(t.String())),
        vectorStoreId: t.Optional(t.String()),
        vectorStoreIds: t.Optional(t.Array(t.String())),
        toolIds: t.Optional(t.Array(t.String())),
        modelConfig: t.Optional(t.Object({
          provider: t.String(),
          model: t.String(),
          temperature: t.Number(),
          topP: t.Number(),
          maxTokens: t.Optional(t.Number()),
          responseFormat: t.Union([t.Literal('text'), t.Literal('json')]),
        })),
        timingConfig: t.Optional(t.Object({
          responseDelaySeconds: t.Number(),
          smartDelay: t.Boolean(),
          mode: t.Optional(t.Union([t.Literal('auto'), t.Literal('suggest'), t.Literal('off')])),
          tone: t.Optional(t.Union([t.Literal('formal'), t.Literal('casual'), t.Literal('neutral')])),
          useEmojis: t.Optional(t.Boolean()),
          language: t.Optional(t.String()),
        })),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Create new assistant',
      },
    }
  )

  // PUT /fluxcore/assistants/:id
  .put(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const {
        accountId,
        instructionId,
        instructionIds,
        vectorStoreId,
        vectorStoreIds,
        toolIds,
        ...updateData
      } = body as any;

      try {
        const assistant = await fluxcoreService.updateAssistant(params.id, accountId, {
          ...updateData,
          instructionIds: instructionIds ?? (instructionId ? [instructionId] : undefined),
          vectorStoreIds: vectorStoreIds ?? (vectorStoreId ? [vectorStoreId] : undefined),
          toolIds,
        });
        if (!assistant) {
          set.status = 404;
          return { success: false, message: 'Assistant not found' };
        }
        return { success: true, data: assistant };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        accountId: t.String(),
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        instructions: t.Optional(t.String()), // System instructions para OpenAI (256K chars max)
        runtime: t.Optional(t.Union([t.Literal('local'), t.Literal('openai')])),
        externalId: t.Optional(t.String()),
        status: t.Optional(t.String()),
        instructionId: t.Optional(t.String()),
        instructionIds: t.Optional(t.Array(t.String())),
        vectorStoreId: t.Optional(t.String()),
        vectorStoreIds: t.Optional(t.Array(t.String())),
        toolIds: t.Optional(t.Array(t.String())),
        modelConfig: t.Optional(t.Object({
          provider: t.String(),
          model: t.String(),
          temperature: t.Number(),
          topP: t.Number(),
          maxTokens: t.Optional(t.Number()),
          responseFormat: t.Union([t.Literal('text'), t.Literal('json')]),
        })),
        timingConfig: t.Optional(t.Object({
          responseDelaySeconds: t.Number(),
          smartDelay: t.Boolean(),
          mode: t.Optional(t.Union([t.Literal('auto'), t.Literal('suggest'), t.Literal('off')])),
          tone: t.Optional(t.Union([t.Literal('formal'), t.Literal('casual'), t.Literal('neutral')])),
          useEmojis: t.Optional(t.Boolean()),
          language: t.Optional(t.String()),
        })),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Update assistant',
      },
    }
  )

  .post(
    '/:id/activate',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const { accountId } = body as any;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const assistant = await fluxcoreService.setActiveAssistant(params.id, accountId);
        if (!assistant) {
          set.status = 404;
          return { success: false, message: 'Assistant not found' };
        }
        return { success: true, data: assistant };
      } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        set.status = statusCode;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Set assistant as active (ensures single active per account)',
      },
    }
  )

  // DELETE /fluxcore/assistants/:id
  .delete(
    '/:id',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const deleted = await fluxcoreService.deleteAssistant(params.id, accountId);
        if (!deleted) {
          set.status = 404;
          return { success: false, message: 'Assistant not found' };
        }
        return { success: true, message: 'Assistant deleted' };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Delete assistant',
      },
    }
  );

// ============================================================================
// INSTRUCTIONS ROUTES
// ============================================================================

const instructionsRoutes = new Elysia({ prefix: '/instructions' })
  .use(authMiddleware)

  // GET /fluxcore/instructions
  .get(
    '/',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const instructions = await fluxcoreService.getInstructions(accountId);
        return { success: true, data: instructions };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'List instructions for account',
      },
    }
  )

  // GET /fluxcore/instructions/:id
  .get(
    '/:id',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const instruction = await fluxcoreService.getInstructionById(params.id, accountId);
        if (!instruction) {
          set.status = 404;
          return { success: false, message: 'Instruction not found' };
        }
        return { success: true, data: instruction };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Get instruction by ID',
      },
    }
  )

  // POST /fluxcore/instructions
  .post(
    '/',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const instruction = await fluxcoreService.createInstruction(body);
        return { success: true, data: instruction };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      body: t.Object({
        accountId: t.String(),
        name: t.String(),
        description: t.Optional(t.String()),
        content: t.String(),
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Create new instruction',
      },
    }
  )

  // PUT /fluxcore/instructions/:id
  .put(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const { accountId, ...updateData } = body;

      try {
        const instruction = await fluxcoreService.updateInstruction(params.id, accountId, updateData);
        if (!instruction) {
          set.status = 404;
          return { success: false, message: 'Instruction not found' };
        }
        return { success: true, data: instruction };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        accountId: t.String(),
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        content: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Update instruction',
      },
    }
  )

  // DELETE /fluxcore/instructions/:id
  .delete(
    '/:id',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const deleted = await fluxcoreService.deleteInstruction(params.id, accountId);
        if (!deleted) {
          set.status = 404;
          return { success: false, message: 'Instruction not found' };
        }
        return { success: true, message: 'Instruction deleted' };
      } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        set.status = statusCode;
        return { success: false, message: error.message, details: error.details };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Delete instruction',
      },
    }
  );

// ============================================================================
// VECTOR STORES ROUTES
// ============================================================================

const vectorStoresRoutes = new Elysia({ prefix: '/vector-stores' })
  .use(authMiddleware)

  // GET /fluxcore/vector-stores
  .get(
    '/',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const stores = await fluxcoreService.getVectorStores(accountId);
        return { success: true, data: stores };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'List vector stores for account',
      },
    }
  )

  // GET /fluxcore/vector-stores/:id
  .get(
    '/:id',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const store = (await fluxcoreService.getVectorStoreById(params.id, accountId)) as any;
        if (!store) {
          set.status = 404;
          return { success: false, message: 'Vector store not found' };
        }

        // REGLA: OpenAI es fuente de verdad. Sincronizar METADATA antes de responder.
        if (store.backend === 'openai' && store.externalId) {
          const { syncVectorStoreFromOpenAI } = await import('../services/openai-sync.service');
          try {
            await syncVectorStoreFromOpenAI(store.id, store.externalId, accountId);
            // Volver a obtener de DB para tener data fresca si el sync la actualizó
            const freshStore = await fluxcoreService.getVectorStoreById(params.id, accountId);
            if (freshStore) return { success: true, data: freshStore };
          } catch (syncErr) {
            console.error('[fluxcore] Error syncing vector store metadata on get:', syncErr);
          }
        }

        return { success: true, data: store };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Get vector store by ID',
      },
    }
  )

  // POST /fluxcore/vector-stores
  .post(
    '/',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const store = await fluxcoreService.createVectorStore(body);
        return { success: true, data: store };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      body: t.Object({
        accountId: t.String(),
        name: t.String(),
        description: t.Optional(t.String()),
        backend: t.Optional(t.Union([t.Literal('local'), t.Literal('openai')])),
        status: t.Optional(t.String()),
        expirationPolicy: t.Optional(t.String()),
        expirationDays: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Create new vector store',
      },
    }
  )

  // PUT /fluxcore/vector-stores/:id
  .put(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const { accountId, ...updateData } = body;

      try {
        const store = await fluxcoreService.updateVectorStore(params.id, accountId, updateData);
        if (!store) {
          set.status = 404;
          return { success: false, message: 'Vector store not found' };
        }
        return { success: true, data: store };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        accountId: t.String(),
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        backend: t.Optional(t.Union([t.Literal('local'), t.Literal('openai')])),
        status: t.Optional(t.String()),
        expirationPolicy: t.Optional(t.String()),
        expirationDays: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Update vector store',
      },
    }
  )

  // DELETE /fluxcore/vector-stores/:id
  .delete(
    '/:id',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const deleted = await fluxcoreService.deleteVectorStore(params.id, accountId);
        if (!deleted) {
          set.status = 404;
          return { success: false, message: 'Vector store not found' };
        }
        return { success: true, message: 'Vector store deleted' };
      } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        set.status = statusCode;
        return { success: false, message: error.message, details: error.details };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Delete vector store',
      },
    }
  )

  // GET /fluxcore/vector-stores/:id/files
  .get(
    '/:id/files',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

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

        if (store.backend === 'openai' && store.externalId) {
          // REGLA: OpenAI es fuente de verdad. Sincronizar LISTA COMPLETA antes de responder.
          const { syncVectorStoreFromOpenAI } = await import('../services/openai-sync.service');
          try {
            await syncVectorStoreFromOpenAI(store.id, store.externalId, accountId);
          } catch (syncErr) {
            console.error('[fluxcore] Error syncing vector store files on list:', syncErr);
            // Continuamos para devolver lo que haya localmente al menos
          }
        }

        // Obtener archivos (ahora sincronizados si fue posible)
        const files = await fluxcoreService.getVectorStoreFiles(params.id);

        return { success: true, data: files };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'List vector store files',
      },
    }
  )

  // POST /fluxcore/vector-stores/:id/files
  .post(
    '/:id/files',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const file = await fluxcoreService.addVectorStoreFile({
          vectorStoreId: params.id,
          ...body,
        });
        return { success: true, data: file };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.String(),
        mimeType: t.Optional(t.String()),
        sizeBytes: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Add file to vector store',
      },
    }
  )

  // DELETE /fluxcore/vector-stores/:id/files/:fileId
  .delete(
    '/:id/files/:fileId',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

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

        if (store.backend === 'openai' && store.externalId) {
          const link = await fluxcoreService.getVectorStoreFileById(params.fileId, params.id);
          if (link?.externalId) {
            const { removeFileFromOpenAIVectorStore } = await import('../services/openai-sync.service');
            await removeFileFromOpenAIVectorStore(store.externalId as string, link.externalId);
          }
        }

        const deleted = await fluxcoreService.deleteVectorStoreFile(params.fileId, params.id);
        if (!deleted) {
          set.status = 404;
          return { success: false, message: 'File not found' };
        }
        return { success: true, message: 'File deleted' };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
        fileId: t.String(),
      }),
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Delete file from vector store',
      },
    }
  )

  // POST /fluxcore/vector-stores/:id/files/upload
  // Endpoint para subir archivo con contenido
  // ARQUITECTURA: Flujos LOCAL y OPENAI están COMPLETAMENTE SEPARADOS
  .post(
    '/:id/files/upload',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { file, accountId } = body as { file: File; accountId: string };

        if (!file || !accountId) {
          set.status = 400;
          return { success: false, message: 'file and accountId are required' };
        }

        const store = await fluxcoreService.getVectorStoreById(params.id, accountId);
        if (!store) {
          set.status = 404;
          return { success: false, message: 'Vector store not found' };
        }

        // Leer contenido del archivo
        const arrayBuffer = await file.arrayBuffer();
        const content = Buffer.from(arrayBuffer);

        // ════════════════════════════════════════════════════════════════════
        // FLUJO OPENAI: Subir a OpenAI, guardar solo referencia local
        // NO se almacena contenido localmente, NO se procesa localmente
        // ════════════════════════════════════════════════════════════════════
        if (store.backend === 'openai') {
          if (!store.externalId) {
            set.status = 400;
            return { success: false, message: 'OpenAI vector store is missing externalId' };
          }

          const { uploadOpenAIFile, addFileToOpenAIVectorStore } = await import('../services/openai-sync.service');

          // 1. Subir archivo a OpenAI Files API
          const openaiFileId = await uploadOpenAIFile(content, file.name);

          // Obtener params opcionales
          const requestBody = body as any;
          const chunkingStrategy = requestBody.chunkingStrategy ? JSON.parse(requestBody.chunkingStrategy) : undefined;
          const attributes = requestBody.attributes ? JSON.parse(requestBody.attributes) : undefined;

          // 2. Asociar archivo al vector store en OpenAI
          const openaiFileResult = await addFileToOpenAIVectorStore({
            vectorStoreId: store.externalId as string,
            fileId: openaiFileId,
            chunkingStrategy,
            attributes,
          });

          // 3. Crear SOLO referencia local (sin contenido, sin fileId central)
          const fileLink = await fluxcoreService.addVectorStoreFile({
            vectorStoreId: params.id,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            status: openaiFileResult.status, // Leer status real
            externalId: openaiFileId,
            chunkingStrategy: openaiFileResult.chunkingStrategy,
            attributes: openaiFileResult.attributes as any,
            usageBytes: openaiFileResult.usageBytes,
            lastError: openaiFileResult.lastError,
          });

          return {
            success: true,
            data: {
              linkId: fileLink.id,
              name: file.name,
              mimeType: file.type || 'application/octet-stream',
              sizeBytes: file.size,
              status: openaiFileResult.status,
              externalId: openaiFileId,
              chunkingStrategy: openaiFileResult.chunkingStrategy,
              attributes: openaiFileResult.attributes,
            },
            syncedFrom: 'openai',
          };
        }

        // ════════════════════════════════════════════════════════════════════
        // FLUJO LOCAL: Guardar contenido + chunking + embeddings
        // ════════════════════════════════════════════════════════════════════
        const { fileService } = await import('../services/file.service');
        const { documentProcessingService } = await import('../services/document-processing.service');

        // 1. Subir y vincular archivo con contenido
        const { file: uploadedFile, linkId } = await fileService.uploadAndLink(
          {
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            content,
            accountId,
            uploadedBy: user.id,
          },
          params.id
        );

        // 2. Iniciar procesamiento asíncrono (chunking + embeddings)
        documentProcessingService.processDocument(
          linkId,
          params.id,
          accountId,
          content,
          file.type || 'text/plain'
        ).catch(err => {
          console.error('[fluxcore] Error processing document:', err);
        });

        return {
          success: true,
          data: {
            fileId: uploadedFile.id,
            linkId,
            name: uploadedFile.name,
            mimeType: uploadedFile.mimeType,
            sizeBytes: uploadedFile.sizeBytes,
            status: 'processing',
          }
        };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Upload file content to vector store with automatic processing',
      },
    }
  )

  // POST /fluxcore/vector-stores/:id/files/:fileId/reprocess
  // Re-procesar un archivo existente
  .post(
    '/:id/files/:fileId/reprocess',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const { fileService } = await import('../services/file.service');
        const { documentProcessingService } = await import('../services/document-processing.service');

        const link = await fluxcoreService.getVectorStoreFileById(params.fileId, params.id);
        if (!link) {
          set.status = 404;
          return { success: false, message: 'File not found' };
        }

        const centralFileId = link.fileId;
        if (!centralFileId) {
          set.status = 400;
          return { success: false, message: 'File has no stored content for reprocessing' };
        }

        // Obtener contenido del archivo central
        const textContent = await fileService.getTextContent(centralFileId);

        if (!textContent) {
          set.status = 400;
          return { success: false, message: 'File has no stored content for reprocessing' };
        }

        // Actualizar estado
        await fileService.updateLinkStatus(link.id, 'processing');

        // Obtener info del archivo
        const file = await fileService.getById(centralFileId);

        // Re-procesar
        documentProcessingService.processDocument(
          link.id,
          params.id,
          accountId,
          textContent,
          file?.mimeType || link.mimeType || 'text/plain'
        ).catch(err => {
          console.error('[fluxcore] Error reprocessing document:', err);
        });

        return { success: true, message: 'Reprocessing started' };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
        fileId: t.String(),
      }),
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Reprocess an existing file in vector store',
      },
    }
  )

  // POST /fluxcore/vector-stores/:id/search
  // Búsqueda semántica en Vector Store de OpenAI
  // REGLA 6.1: Solo para QA/debugging/testing, NO reemplaza al Assistant
  .post(
    '/:id/search',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const { accountId, query, maxNumResults, rankingOptions, filters } = body;

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

        // Solo disponible para Vector Stores de OpenAI
        if (store.backend !== 'openai') {
          set.status = 400;
          return {
            success: false,
            message: 'Search is only available for OpenAI vector stores. Use retrieval service for local.',
          };
        }

        if (!store.externalId) {
          set.status = 400;
          return {
            success: false,
            message: 'OpenAI vector store is missing externalId. It may not be synced yet.',
          };
        }

        const { searchOpenAIVectorStore } = await import(
          '../services/openai-sync.service'
        );

        const results = await searchOpenAIVectorStore(store.externalId, {
          query,
          maxNumResults: maxNumResults ?? 10,
          rewriteQuery: false,
          rankingOptions: rankingOptions
            ? {
              ranker: (rankingOptions.ranker as any) || 'auto',
              scoreThreshold: rankingOptions.scoreThreshold,
            }
            : undefined,
          filters,
        });

        return {
          success: true,
          data: {
            results,
            query,
            totalResults: results.length,
            note: 'This search is for QA/debugging only. Use the Assistant for production RAG.',
          },
        };
      } catch (error: any) {
        console.error('[fluxcore] Error searching vector store:', error);
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        accountId: t.String(),
        query: t.Union([t.String(), t.Array(t.String())]),
        maxNumResults: t.Optional(t.Number()),
        rankingOptions: t.Optional(
          t.Object({
            ranker: t.Optional(t.String()),
            scoreThreshold: t.Optional(t.Number()),
          })
        ),
        filters: t.Optional(t.Any()),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Search OpenAI vector store (QA/debugging only)',
        description:
          'Performs semantic search on an OpenAI Vector Store. For QA/debugging/testing only. Do NOT use as replacement for the Assistant.',
      },
    }
  )

  // POST /fluxcore/vector-stores/:id/sync
  // Sincroniza el estado del Vector Store desde OpenAI (fuente de verdad)
  .post(
    '/:id/sync',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const { accountId } = body;

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

        if (store.backend !== 'openai') {
          set.status = 400;
          return {
            success: false,
            message: 'Sync is only available for OpenAI vector stores.',
          };
        }

        if (!store.externalId) {
          set.status = 400;
          return {
            success: false,
            message: 'OpenAI vector store is missing externalId.',
          };
        }

        const { syncVectorStoreFromOpenAI } = await import(
          '../services/openai-sync.service'
        );

        // Ejecutar sincronización completa (Archivos + Metadata)
        // REGLA: vs.openai es la fuente de verdad.
        await syncVectorStoreFromOpenAI(store.id, store.externalId, accountId);

        // Obtener el registro actualizado
        const updated = await fluxcoreService.getVectorStoreById(params.id, accountId);

        return {
          success: true,
          data: updated,
          syncedFrom: 'openai',
          message: 'Vector store synced from OpenAI (source of truth)',
        };
      } catch (error: any) {
        console.error('[fluxcore] Error syncing vector store:', error);
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Sync vector store from OpenAI (source of truth)',
        description:
          'Reads the current state from OpenAI and updates the local reference. OpenAI is the source of truth.',
      },
    }
  );

// ============================================================================
// TOOLS ROUTES
// ============================================================================

const toolsRoutes = new Elysia({ prefix: '/tools' })
  .use(authMiddleware)

  // GET /fluxcore/tools/definitions
  .get(
    '/definitions',
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const definitions = await fluxcoreService.getToolDefinitions();
        return { success: true, data: definitions };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      detail: {
        tags: ['FluxCore'],
        summary: 'List available tool definitions',
      },
    }
  )

  // GET /fluxcore/tools/connections
  .get(
    '/connections',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const connections = await fluxcoreService.getToolConnections(accountId);
        return { success: true, data: connections };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'List tool connections for account',
      },
    }
  )

  // POST /fluxcore/tools/connections
  .post(
    '/connections',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const connection = await fluxcoreService.createToolConnection(body);
        return { success: true, data: connection };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      body: t.Object({
        accountId: t.String(),
        toolDefinitionId: t.String(),
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Create tool connection',
      },
    }
  )

  // DELETE /fluxcore/tools/connections/:id
  .delete(
    '/connections/:id',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const accountId = query.accountId;
      if (!accountId) {
        set.status = 400;
        return { success: false, message: 'accountId is required' };
      }

      try {
        const deleted = await fluxcoreService.deleteToolConnection(params.id, accountId);
        if (!deleted) {
          set.status = 404;
          return { success: false, message: 'Connection not found' };
        }
        return { success: true, message: 'Connection deleted' };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Delete tool connection',
      },
    }
  );

// ============================================================================
// TRACES ROUTES (debugging)
// ============================================================================

const tracesRoutes = new Elysia({ prefix: '/traces' })
  .use(authMiddleware)

  // GET /fluxcore/traces?accountId=xxx&limit=50
  .get(
    '/',
    async ({ user, query, set }) => {
      if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
      if (!query.accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }
      try {
        const { db, aiTraces } = await import('@fluxcore/db');
        const { eq, desc } = await import('drizzle-orm');
        const limit = Math.min(Number(query.limit ?? 50), 200);
        const rows = await db
          .select()
          .from(aiTraces)
          .where(eq(aiTraces.accountId, query.accountId))
          .orderBy(desc(aiTraces.createdAt))
          .limit(limit);
        return { success: true, data: rows };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      query: t.Object({ accountId: t.String(), limit: t.Optional(t.String()) }),
      detail: { tags: ['FluxCore'], summary: 'Get AI execution traces' },
    }
  );

// ============================================================================
// SUGGESTIONS ROUTES (suggest-mode review)
// ============================================================================

const suggestionsRoutes = new Elysia({ prefix: '/suggestions' })
  .use(authMiddleware)

  // GET /fluxcore/suggestions?accountId=xxx&status=pending
  .get(
    '/',
    async ({ user, query, set }) => {
      if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
      if (!query.accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }
      try {
        const { db, aiSuggestions } = await import('@fluxcore/db');
        const { eq, desc, and } = await import('drizzle-orm');
        const conditions = [eq(aiSuggestions.accountId, query.accountId)];
        if (query.status) conditions.push(eq(aiSuggestions.status, query.status));
        const rows = await db
          .select()
          .from(aiSuggestions)
          .where(and(...conditions))
          .orderBy(desc(aiSuggestions.createdAt))
          .limit(100);
        return { success: true, data: rows };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      query: t.Object({ accountId: t.String(), status: t.Optional(t.String()) }),
      detail: { tags: ['FluxCore'], summary: 'Get AI suggestions for operator review' },
    }
  )

  // PATCH /fluxcore/suggestions/:id — approve, reject, or edit
  .patch(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
      try {
        const { db, aiSuggestions, messages, conversations } = await import('@fluxcore/db');
        const { eq } = await import('drizzle-orm');
        const { status, editedContent } = body as any;
        if (!['approved', 'rejected', 'edited'].includes(status)) {
          set.status = 400;
          return { success: false, message: 'status must be approved, rejected, or edited' };
        }
        const [suggestion] = await db.select().from(aiSuggestions).where(eq(aiSuggestions.id, params.id)).limit(1);
        if (!suggestion) { set.status = 404; return { success: false, message: 'Suggestion not found' }; }

        const finalContent = editedContent ?? suggestion.content;

        if (status === 'approved' || status === 'edited') {
          const [conv] = await db.select().from(conversations).where(eq(conversations.id, suggestion.conversationId)).limit(1);
          if (conv) {
            await db.insert(messages).values({
              conversationId: suggestion.conversationId,
              senderAccountId: suggestion.accountId,
              content: { text: finalContent },
              generatedBy: 'ai',
              status: 'sent',
            } as any);
          }
        }

        await db.update(aiSuggestions)
          .set({ status, content: finalContent, respondedAt: new Date() } as any)
          .where(eq(aiSuggestions.id, params.id));

        return { success: true, message: `Suggestion ${status}` };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ status: t.String(), editedContent: t.Optional(t.String()) }),
      detail: { tags: ['FluxCore'], summary: 'Approve, reject or edit a suggestion' },
    }
  );

// ============================================================================
// MAIN EXPORT
// ============================================================================

export const fluxcoreRoutes = new Elysia({ prefix: '/fluxcore' })
  .use(assistantsRoutes)
  .use(instructionsRoutes)
  .use(vectorStoresRoutes)
  .use(toolsRoutes)
  .use(tracesRoutes)
  .use(suggestionsRoutes)
  .use(fluxiRoutes); // WES-180
