import { 
  pgTable, 
  text, 
  timestamp,
  uuid,
  index
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Works - Trabajos ejecutados
 * 
 * Registra trabajos completados o en ejecución.
 */
export const fluxcoreWorks = pgTable('fluxcore_works', {
  id: uuid('id').primaryKey().defaultRandom(),
  workId: uuid('work_id').notNull().unique(),
  workType: text('work_type').notNull(),
  agentId: uuid('agent_id').notNull(),
  conversationId: uuid('conversation_id'),
  workData: text('work_data').notNull(), // JSON de datos del trabajo
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] }).notNull().default('pending'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).notNull().default('medium'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  duration: text('duration'), // Duración en milisegundos
  result: text('result'), // JSON del resultado
  error: text('error'),
  metrics: text('metrics'), // JSON de métricas
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Índices para consultas eficientes
  agentIdx: index('idx_works_agent').on(table.agentId, table.status),
  conversationIdx: index('idx_works_conversation').on(table.conversationId),
  typeStatusIdx: index('idx_works_type_status').on(table.workType, table.status)
}));

export type FluxCoreWorks = typeof fluxcoreWorks.$inferSelect;
export type NewFluxCoreWorks = typeof fluxcoreWorks.$inferInsert;
