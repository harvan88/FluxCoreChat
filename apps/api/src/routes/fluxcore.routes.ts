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
          responseFormat: t.Union([t.Literal('text'), t.Literal('json')]),
        })),
        timingConfig: t.Optional(t.Object({
          responseDelaySeconds: t.Number(),
          smartDelay: t.Boolean(),
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
          responseFormat: t.Union([t.Literal('text'), t.Literal('json')]),
        })),
        timingConfig: t.Optional(t.Object({
          responseDelaySeconds: t.Number(),
          smartDelay: t.Boolean(),
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
        const store = await fluxcoreService.getVectorStoreById(params.id, accountId);
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

        const files = await fluxcoreService.getVectorStoreFiles(params.id);

        if (store.backend === 'openai' && store.externalId) {
          const { getOpenAIVectorStoreFile } = await import('../services/openai-sync.service');
          const refreshed = await Promise.all(files.map(async (f: any) => {
            if (!f.externalId) return f;
            try {
              const remote = await getOpenAIVectorStoreFile(store.externalId as string, f.externalId);
              const status = typeof remote?.status === 'string' ? remote.status : undefined;
              if (!status) return f;

              let mapped: 'pending' | 'processing' | 'completed' | 'failed' = 'processing';
              if (status === 'completed') mapped = 'completed';
              if (status === 'failed' || status === 'cancelled') mapped = 'failed';
              if (status === 'in_progress') mapped = 'processing';

              // Persistir estado actualizado en DB local si cambió
              if (mapped !== f.status) {
                await fluxcoreService.updateVectorStoreFileStatus(f.id, mapped);
              }

              return { ...f, status: mapped };
            } catch (err) {
              console.error(`[fluxcore] Error fetching OpenAI file status for ${f.externalId}:`, err);
              return f;
            }
          }));

          return { success: true, data: refreshed };
        }

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
          
          // 2. Asociar archivo al vector store en OpenAI
          await addFileToOpenAIVectorStore(store.externalId as string, openaiFileId);
          
          // 3. Crear SOLO referencia local (sin contenido, sin fileId central)
          const fileLink = await fluxcoreService.addVectorStoreFile({
            vectorStoreId: params.id,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            status: 'processing',
            externalId: openaiFileId,
            // fileId: null - NO hay archivo central local
          });

          return {
            success: true,
            data: {
              linkId: fileLink.id,
              name: file.name,
              mimeType: file.type || 'application/octet-stream',
              sizeBytes: file.size,
              status: 'processing',
              externalId: openaiFileId,
            }
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
// MAIN EXPORT
// ============================================================================

export const fluxcoreRoutes = new Elysia({ prefix: '/fluxcore' })
  .use(assistantsRoutes)
  .use(instructionsRoutes)
  .use(vectorStoresRoutes)
  .use(toolsRoutes);
