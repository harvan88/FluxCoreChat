import { 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Agent Assistants - Asistentes de agentes
 * 
 * Define asistentes IA para agentes específicos.
 */
export const fluxcoreAgentAssistants = pgTable('fluxcore_agent_assistants', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull(),
  assistantId: uuid('assistant_id').notNull(),
  role: text('role', { enum: ['primary', 'secondary', 'specialist'] }).notNull().default('secondary'),
  capabilities: text('capabilities'), // JSON de capacidades
  isActive: text('is_active', { enum: ['true', 'false'] }).notNull().default('true'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type FluxCoreAgentAssistants = typeof fluxcoreAgentAssistants.$inferSelect;
export type NewFluxCoreAgentAssistants = typeof fluxcoreAgentAssistants.$inferInsert;
