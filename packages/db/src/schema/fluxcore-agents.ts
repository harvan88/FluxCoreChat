/**
 * FluxCore: Agents Schema (Fase 3 — Agent Runtime Engine)
 *
 * Un Agente es una composición de asistentes, tools, instrucciones y vector stores
 * existentes, orquestados por un flujo (flow) que define cómo interactúan.
 *
 * Tablas:
 *  - fluxcore_agents: Definición del agente con flow JSON y scopes de seguridad
 *  - fluxcore_agent_assistants: Relación N:M agente ↔ asistente (con rol y step_id)
 */

import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { fluxcoreAssistants } from './fluxcore-assistants';

// ─── Flow Types ─────────────────────────────────────────────────────────────

export type AgentStepType =
  | 'llm'
  | 'rag'
  | 'deterministic'
  | 'tool'
  | 'router'
  | 'human-in-loop'
  | 'transform';

export interface AgentFlowStep {
  id: string;
  type: AgentStepType;
  /** Optional condition expression — e.g. {{ intent-classifier.intent == 'queja' }} */
  condition?: string;
  /** Input mappings from context bus — e.g. { user_message: '{{ trigger.content }}' } */
  inputs?: Record<string, string>;
  /** Step-specific config (varies by type) */
  config?: Record<string, any>;
  /** Next step IDs (sequential) or branch mapping for routers */
  next?: string | string[] | Record<string, string>;
}

export interface AgentFlow {
  steps: AgentFlowStep[];
  /** Entry point step ID. Defaults to first step if omitted. */
  entryPoint?: string;
}

export interface AgentScopes {
  allowedModels: string[];
  maxTotalTokens: number;
  maxExecutionTimeMs: number;
  allowedTools: string[];
  canCreateSubAgents: boolean;
}

export interface AgentTriggerConfig {
  type: 'message_received' | 'manual' | 'scheduled' | 'webhook';
  /** Extra filter expression */
  filter?: string;
}

// ─── Default values ─────────────────────────────────────────────────────────

const DEFAULT_FLOW: AgentFlow = { steps: [] };

const DEFAULT_SCOPES: AgentScopes = {
  allowedModels: [],
  maxTotalTokens: 5000,
  maxExecutionTimeMs: 30000,
  allowedTools: [],
  canCreateSubAgents: false,
};

const DEFAULT_TRIGGER: AgentTriggerConfig = { type: 'message_received' };

// ─── Tables ─────────────────────────────────────────────────────────────────

export const fluxcoreAgents = pgTable('fluxcore_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  status: varchar('status', { length: 20 }).notNull().default('draft'),

  flow: jsonb('flow').$type<AgentFlow>().default(DEFAULT_FLOW).notNull(),

  scopes: jsonb('scopes').$type<AgentScopes>().default(DEFAULT_SCOPES).notNull(),

  triggerConfig: jsonb('trigger_config').$type<AgentTriggerConfig>().default(DEFAULT_TRIGGER),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreAgent = typeof fluxcoreAgents.$inferSelect;
export type NewFluxcoreAgent = typeof fluxcoreAgents.$inferInsert;

/**
 * N:M — Un agente "contiene" asistentes existentes con un rol dentro del flow
 */
export const fluxcoreAgentAssistants = pgTable('fluxcore_agent_assistants', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => fluxcoreAgents.id, { onDelete: 'cascade' }),
  assistantId: uuid('assistant_id')
    .notNull()
    .references(() => fluxcoreAssistants.id, { onDelete: 'cascade' }),

  /** Role within the agent flow: router, worker, reviewer */
  role: varchar('role', { length: 30 }).notNull().default('worker'),

  /** ID of the step in the flow JSON where this assistant is used */
  stepId: varchar('step_id', { length: 100 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type FluxcoreAgentAssistant = typeof fluxcoreAgentAssistants.$inferSelect;
export type NewFluxcoreAgentAssistant = typeof fluxcoreAgentAssistants.$inferInsert;
