import { 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Proposed Works - Trabajos propuestos
 * 
 * Registra trabajos propuestos por agentes para ejecución.
 */
export const fluxcoreProposedWorks = pgTable('fluxcore_proposed_works', {
  id: uuid('id').primaryKey().defaultRandom(),
  workId: uuid('work_id').notNull().unique(),
  agentId: uuid('agent_id').notNull(),
  conversationId: uuid('conversation_id').notNull(),
  workType: text('work_type', { enum: ['message_response', 'template_execution', 'data_analysis', 'escalation'] }).notNull(),
  workData: text('work_data').notNull(), // JSON del trabajo propuesto
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).notNull().default('medium'),
  status: text('status', { enum: ['proposed', 'approved', 'rejected', 'executing', 'completed', 'failed'] }).notNull().default('proposed'),
  proposedAt: timestamp('proposed_at').notNull().defaultNow(),
  approvedAt: timestamp('approved_at'),
  rejectedAt: timestamp('rejected_at'),
  executedAt: timestamp('executed_at'),
  completedAt: timestamp('completed_at'),
  approverId: uuid('approver_id'),
  rejectionReason: text('rejection_reason'),
  executionResult: text('execution_result'), // JSON del resultado
});

export type FluxCoreProposedWorks = typeof fluxcoreProposedWorks.$inferSelect;
export type NewFluxCoreProposedWorks = typeof fluxcoreProposedWorks.$inferInsert;
