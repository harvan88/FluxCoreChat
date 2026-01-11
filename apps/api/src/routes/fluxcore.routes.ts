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
        summary: 'Delete vector store',
      },
    }
  )
  
  // GET /fluxcore/vector-stores/:id/files
  .get(
    '/:id/files',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
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
      detail: {
        tags: ['FluxCore'],
        summary: 'List files in vector store',
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
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
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
        storeId: t.String(),
        fileId: t.String(),
      }),
      detail: {
        tags: ['FluxCore'],
        summary: 'Delete file from vector store',
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
