/**
 * FluxCore Agent Routes — Fase 3: Agent Runtime Engine
 *
 * CRUD for agents and their flows:
 *   GET    /fluxcore/agents                — List agents
 *   POST   /fluxcore/agents                — Create agent
 *   GET    /fluxcore/agents/:id            — Get agent detail
 *   PUT    /fluxcore/agents/:id            — Update agent
 *   DELETE /fluxcore/agents/:id            — Delete agent
 *   PUT    /fluxcore/agents/:id/flow       — Update flow
 *   PUT    /fluxcore/agents/:id/scopes     — Update scopes
 *   POST   /fluxcore/agents/:id/activate   — Activate agent
 *   POST   /fluxcore/agents/:id/deactivate — Deactivate agent
 *   PUT    /fluxcore/agents/:id/assistants — Set agent assistants
 *   POST   /fluxcore/agents/:id/execute    — Execute agent flow (test)
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { flowRegistryService } from '../services/agent-runtime';

export const fluxcoreAgentRoutes = new Elysia({ prefix: '/agents' })
  .use(authMiddleware)

  // ─── List agents ──────────────────────────────────────────────────────────
  .get('/', async ({ user, query, set }) => {
    if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
    const accountId = query.accountId;
    if (!accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }

    try {
      const agents = await flowRegistryService.listAgents(accountId);
      return { success: true, data: agents };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    query: t.Object({ accountId: t.String() }),
    detail: { tags: ['FluxCore Agents'], summary: 'List agents for account' },
  })

  // ─── Get agent detail ─────────────────────────────────────────────────────
  .get('/:id', async ({ user, params, query, set }) => {
    if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
    const accountId = query.accountId;
    if (!accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }

    try {
      const agent = await flowRegistryService.getAgent(accountId, params.id);
      if (!agent) { set.status = 404; return { success: false, message: 'Agent not found' }; }
      return { success: true, data: agent };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    query: t.Object({ accountId: t.String() }),
    detail: { tags: ['FluxCore Agents'], summary: 'Get agent detail' },
  })

  // ─── Create agent ─────────────────────────────────────────────────────────
  .post('/', async ({ user, body, set }) => {
    if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }

    try {
      const agent = await flowRegistryService.createAgent(body as any);
      set.status = 201;
      return { success: true, data: agent };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
      name: t.String(),
      description: t.Optional(t.String()),
      status: t.Optional(t.String()),
      flow: t.Optional(t.Any()),
      scopes: t.Optional(t.Any()),
      triggerConfig: t.Optional(t.Any()),
      assistantIds: t.Optional(t.Array(t.Object({
        assistantId: t.String(),
        role: t.Optional(t.String()),
        stepId: t.Optional(t.String()),
      }))),
    }),
    detail: { tags: ['FluxCore Agents'], summary: 'Create a new agent' },
  })

  // ─── Update agent ─────────────────────────────────────────────────────────
  .put('/:id', async ({ user, params, body, set }) => {
    if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
    const accountId = (body as any).accountId;
    if (!accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }

    try {
      const agent = await flowRegistryService.updateAgent(accountId, params.id, body as any);
      if (!agent) { set.status = 404; return { success: false, message: 'Agent not found' }; }
      return { success: true, data: agent };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      accountId: t.String(),
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      status: t.Optional(t.String()),
      flow: t.Optional(t.Any()),
      scopes: t.Optional(t.Any()),
      triggerConfig: t.Optional(t.Any()),
    }),
    detail: { tags: ['FluxCore Agents'], summary: 'Update an agent' },
  })

  // ─── Delete agent ─────────────────────────────────────────────────────────
  .delete('/:id', async ({ user, params, query, set }) => {
    if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
    const accountId = query.accountId;
    if (!accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }

    try {
      const deleted = await flowRegistryService.deleteAgent(accountId, params.id);
      if (!deleted) { set.status = 404; return { success: false, message: 'Agent not found' }; }
      return { success: true };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    query: t.Object({ accountId: t.String() }),
    detail: { tags: ['FluxCore Agents'], summary: 'Delete an agent' },
  })

  // ─── Update flow ──────────────────────────────────────────────────────────
  .put('/:id/flow', async ({ user, params, body, set }) => {
    if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
    const accountId = (body as any).accountId;
    if (!accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }

    try {
      const agent = await flowRegistryService.updateFlow(accountId, params.id, (body as any).flow);
      if (!agent) { set.status = 404; return { success: false, message: 'Agent not found' }; }
      return { success: true, data: agent };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ accountId: t.String(), flow: t.Any() }),
    detail: { tags: ['FluxCore Agents'], summary: 'Update agent flow' },
  })

  // ─── Update scopes ────────────────────────────────────────────────────────
  .put('/:id/scopes', async ({ user, params, body, set }) => {
    if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
    const accountId = (body as any).accountId;
    if (!accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }

    try {
      const agent = await flowRegistryService.updateScopes(accountId, params.id, (body as any).scopes);
      if (!agent) { set.status = 404; return { success: false, message: 'Agent not found' }; }
      return { success: true, data: agent };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ accountId: t.String(), scopes: t.Any() }),
    detail: { tags: ['FluxCore Agents'], summary: 'Update agent scopes' },
  })

  // ─── Activate agent ───────────────────────────────────────────────────────
  .post('/:id/activate', async ({ user, params, body, set }) => {
    if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
    const accountId = (body as any).accountId;
    if (!accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }

    try {
      const agent = await flowRegistryService.activateAgent(accountId, params.id);
      if (!agent) { set.status = 404; return { success: false, message: 'Agent not found' }; }
      return { success: true, data: agent };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ accountId: t.String() }),
    detail: { tags: ['FluxCore Agents'], summary: 'Activate an agent' },
  })

  // ─── Deactivate agent ─────────────────────────────────────────────────────
  .post('/:id/deactivate', async ({ user, params, body, set }) => {
    if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
    const accountId = (body as any).accountId;
    if (!accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }

    try {
      const agent = await flowRegistryService.deactivateAgent(accountId, params.id);
      if (!agent) { set.status = 404; return { success: false, message: 'Agent not found' }; }
      return { success: true, data: agent };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ accountId: t.String() }),
    detail: { tags: ['FluxCore Agents'], summary: 'Deactivate an agent' },
  })

  // ─── Set assistants ───────────────────────────────────────────────────────
  .put('/:id/assistants', async ({ user, params, body, set }) => {
    if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }
    const accountId = (body as any).accountId;
    if (!accountId) { set.status = 400; return { success: false, message: 'accountId is required' }; }

    try {
      // Verify agent exists and belongs to account
      const agent = await flowRegistryService.getAgent(accountId, params.id);
      if (!agent) { set.status = 404; return { success: false, message: 'Agent not found' }; }

      await flowRegistryService.setAgentAssistants(params.id, (body as any).assistants || []);
      const updated = await flowRegistryService.getAgent(accountId, params.id);
      return { success: true, data: updated };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      accountId: t.String(),
      assistants: t.Array(t.Object({
        assistantId: t.String(),
        role: t.Optional(t.String()),
        stepId: t.Optional(t.String()),
      })),
    }),
    detail: { tags: ['FluxCore Agents'], summary: 'Set agent assistants' },
  });
