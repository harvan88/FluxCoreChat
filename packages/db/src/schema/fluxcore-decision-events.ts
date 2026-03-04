import { 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Decision Events - Eventos de decisión
 * 
 * Registra decisiones tomadas por agentes o IA.
 */
export const fluxcoreDecisionEvents = pgTable('fluxcore_decision_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id'),
  conversationId: uuid('conversation_id').notNull(),
  decisionType: text('decision_type', { enum: ['template', 'escalation', 'delegation', 'termination'] }).notNull(),
  decisionData: text('decision_data').notNull(), // JSON de la decisión
  confidence: text('confidence', { enum: ['high', 'medium', 'low'] }).notNull(),
  reasoning: text('reasoning'), // Razonamiento de la decisión
  executedAt: timestamp('executed_at').notNull().defaultNow(),
  outcome: text('outcome'), // Resultado de la ejecución
});

export type FluxCoreDecisionEvents = typeof fluxcoreDecisionEvents.$inferSelect;
export type NewFluxCoreDecisionEvents = typeof fluxcoreDecisionEvents.$inferInsert;
