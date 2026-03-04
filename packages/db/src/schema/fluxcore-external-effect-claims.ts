import { 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore External Effect Claims - Declaraciones de efectos externos
 * 
 * Declara efectos que se deben ejecutar en sistemas externos.
 */
export const fluxcoreExternalEffectClaims = pgTable('fluxcore_external_effect_claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  claimId: uuid('claim_id').notNull().unique(),
  agentId: uuid('agent_id'),
  effectType: text('effect_type', { enum: ['send_message', 'execute_template', 'trigger_webhook', 'escalate'] }).notNull(),
  targetSystem: text('target_system').notNull(),
  effectData: text('effect_data').notNull(), // JSON del efecto
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).notNull().default('medium'),
  status: text('status', { enum: ['claimed', 'executing', 'completed', 'failed'] }).notNull().default('claimed'),
  claimedAt: timestamp('claimed_at').notNull().defaultNow(),
  executedAt: timestamp('executed_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
});

export type FluxCoreExternalEffectClaims = typeof fluxcoreExternalEffectClaims.$inferSelect;
export type NewFluxCoreExternalEffectClaims = typeof fluxcoreExternalEffectClaims.$inferInsert;
