/**
 * Flow Registry — CRUD for Agents and their flows (DB-backed).
 *
 * Manages fluxcore_agents and fluxcore_agent_assistants tables.
 * Provides methods to create, read, update, delete agents and their flows,
 * plus resolution of the full agent composition (assistants, tools, scopes).
 */

import { db } from '@fluxcore/db';
import {
  fluxcoreAgents,
  fluxcoreAgentAssistants,
  type FluxcoreAgent,
  type NewFluxcoreAgent,
  type AgentFlow,
  type AgentScopes,
} from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  assistantCount: number;
  triggerType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentDetail extends FluxcoreAgent {
  assistants: Array<{
    assistantId: string;
    role: string;
    stepId: string | null;
  }>;
}

export interface CreateAgentParams {
  accountId: string;
  name: string;
  description?: string;
  status?: string;
  flow?: AgentFlow;
  scopes?: Partial<AgentScopes>;
  triggerConfig?: { type: string; filter?: string };
  assistantIds?: Array<{ assistantId: string; role?: string; stepId?: string }>;
}

export interface UpdateAgentParams {
  name?: string;
  description?: string;
  status?: string;
  flow?: AgentFlow;
  scopes?: Partial<AgentScopes>;
  triggerConfig?: { type: string; filter?: string };
}

// ─── Service ────────────────────────────────────────────────────────────────

class FlowRegistryService {

  async listAgents(accountId: string): Promise<AgentSummary[]> {
    const agents = await db
      .select()
      .from(fluxcoreAgents)
      .where(eq(fluxcoreAgents.accountId, accountId))
      .orderBy(desc(fluxcoreAgents.updatedAt));

    // Get assistant counts
    const summaries: AgentSummary[] = [];
    for (const agent of agents) {
      const assistants = await db
        .select()
        .from(fluxcoreAgentAssistants)
        .where(eq(fluxcoreAgentAssistants.agentId, agent.id));

      const trigger = (agent.triggerConfig as any) || { type: 'message_received' };

      summaries.push({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        status: agent.status,
        assistantCount: assistants.length,
        triggerType: trigger.type || 'message_received',
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      });
    }

    return summaries;
  }

  async getAgent(accountId: string, agentId: string): Promise<AgentDetail | null> {
    const [agent] = await db
      .select()
      .from(fluxcoreAgents)
      .where(and(eq(fluxcoreAgents.id, agentId), eq(fluxcoreAgents.accountId, accountId)))
      .limit(1);

    if (!agent) return null;

    const assistants = await db
      .select()
      .from(fluxcoreAgentAssistants)
      .where(eq(fluxcoreAgentAssistants.agentId, agentId));

    return {
      ...agent,
      assistants: assistants.map(a => ({
        assistantId: a.assistantId,
        role: a.role,
        stepId: a.stepId,
      })),
    };
  }

  async createAgent(params: CreateAgentParams): Promise<AgentDetail> {
    const defaultScopes: AgentScopes = {
      allowedModels: [],
      maxTotalTokens: 5000,
      maxExecutionTimeMs: 30000,
      allowedTools: [],
      canCreateSubAgents: false,
    };

    const scopes = params.scopes
      ? { ...defaultScopes, ...params.scopes }
      : defaultScopes;

    const [agent] = await db
      .insert(fluxcoreAgents)
      .values({
        accountId: params.accountId,
        name: params.name,
        description: params.description || null,
        status: params.status || 'draft',
        flow: params.flow || { steps: [] },
        scopes,
        triggerConfig: (params.triggerConfig as any) || { type: 'message_received' },
      })
      .returning();

    // Link assistants
    if (params.assistantIds && params.assistantIds.length > 0) {
      for (const link of params.assistantIds) {
        await db.insert(fluxcoreAgentAssistants).values({
          agentId: agent.id,
          assistantId: link.assistantId,
          role: link.role || 'worker',
          stepId: link.stepId || null,
        });
      }
    }

    return this.getAgent(params.accountId, agent.id) as Promise<AgentDetail>;
  }

  async updateAgent(accountId: string, agentId: string, params: UpdateAgentParams): Promise<AgentDetail | null> {
    const existing = await this.getAgent(accountId, agentId);
    if (!existing) return null;

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (params.name !== undefined) updates.name = params.name;
    if (params.description !== undefined) updates.description = params.description;
    if (params.status !== undefined) updates.status = params.status;
    if (params.flow !== undefined) updates.flow = params.flow;
    if (params.triggerConfig !== undefined) updates.triggerConfig = params.triggerConfig;

    if (params.scopes !== undefined) {
      const currentScopes = (existing.scopes as AgentScopes) || {};
      updates.scopes = { ...currentScopes, ...params.scopes };
    }

    await db
      .update(fluxcoreAgents)
      .set(updates)
      .where(and(eq(fluxcoreAgents.id, agentId), eq(fluxcoreAgents.accountId, accountId)));

    return this.getAgent(accountId, agentId);
  }

  async deleteAgent(accountId: string, agentId: string): Promise<boolean> {
    const result = await db
      .delete(fluxcoreAgents)
      .where(and(eq(fluxcoreAgents.id, agentId), eq(fluxcoreAgents.accountId, accountId)))
      .returning({ id: fluxcoreAgents.id });

    return result.length > 0;
  }

  // ─── Assistant links ──────────────────────────────────────────────────────

  async setAgentAssistants(
    agentId: string,
    links: Array<{ assistantId: string; role?: string; stepId?: string }>,
  ): Promise<void> {
    // Remove existing links
    await db.delete(fluxcoreAgentAssistants)
      .where(eq(fluxcoreAgentAssistants.agentId, agentId));

    // Insert new links
    for (const link of links) {
      await db.insert(fluxcoreAgentAssistants).values({
        agentId,
        assistantId: link.assistantId,
        role: link.role || 'worker',
        stepId: link.stepId || null,
      });
    }
  }

  async addAgentAssistant(
    agentId: string,
    assistantId: string,
    role: string = 'worker',
    stepId?: string,
  ): Promise<void> {
    await db.insert(fluxcoreAgentAssistants).values({
      agentId,
      assistantId,
      role,
      stepId: stepId || null,
    });
  }

  async removeAgentAssistant(agentId: string, assistantId: string): Promise<void> {
    await db.delete(fluxcoreAgentAssistants)
      .where(and(
        eq(fluxcoreAgentAssistants.agentId, agentId),
        eq(fluxcoreAgentAssistants.assistantId, assistantId),
      ));
  }

  // ─── Flow update shortcut ────────────────────────────────────────────────

  async updateFlow(accountId: string, agentId: string, flow: AgentFlow): Promise<AgentDetail | null> {
    return this.updateAgent(accountId, agentId, { flow });
  }

  async updateScopes(accountId: string, agentId: string, scopes: Partial<AgentScopes>): Promise<AgentDetail | null> {
    return this.updateAgent(accountId, agentId, { scopes });
  }

  // ─── Activation ──────────────────────────────────────────────────────────

  async activateAgent(accountId: string, agentId: string): Promise<AgentDetail | null> {
    return this.updateAgent(accountId, agentId, { status: 'active' });
  }

  async deactivateAgent(accountId: string, agentId: string): Promise<AgentDetail | null> {
    return this.updateAgent(accountId, agentId, { status: 'draft' });
  }

  async archiveAgent(accountId: string, agentId: string): Promise<AgentDetail | null> {
    return this.updateAgent(accountId, agentId, { status: 'archived' });
  }

  /**
   * Get active agents for an account (for trigger matching).
   */
  async getActiveAgents(accountId: string): Promise<FluxcoreAgent[]> {
    return db
      .select()
      .from(fluxcoreAgents)
      .where(and(eq(fluxcoreAgents.accountId, accountId), eq(fluxcoreAgents.status, 'active')));
  }
}

export const flowRegistryService = new FlowRegistryService();
