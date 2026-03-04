import { 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore External Effects - Efectos externos ejecutados
 * 
 * Registra efectos externos que han sido ejecutados.
 */
export const fluxcoreExternalEffects = pgTable('fluxcore_external_effects', {
  id: uuid('id').primaryKey().defaultRandom(),
  effectId: uuid('effect_id').notNull().unique(),
  claimId: uuid('claim_id').notNull(),
  effectType: text('effect_type', { enum: ['send_message', 'execute_template', 'trigger_webhook', 'escalate'] }).notNull(),
  targetSystem: text('target_system').notNull(),
  effectData: text('effect_data').notNull(), // JSON del efecto ejecutado
  executorId: uuid('executor_id').notNull(),
  executionResult: text('execution_result'), // JSON del resultado
  status: text('status', { enum: ['executed', 'failed', 'timeout'] }).notNull().default('executed'),
  executedAt: timestamp('executed_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  metrics: text('metrics'), // JSON de métricas de ejecución
});

export type FluxCoreExternalEffects = typeof fluxcoreExternalEffects.$inferSelect;
export type NewFluxCoreExternalEffects = typeof fluxcoreExternalEffects.$inferInsert;
