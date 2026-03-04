import { 
  bigint, 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Projector Errors - Registro de errores de projectores
 * 
 * Centraliza errores de procesamiento para debugging y alertas.
 */
export const fluxcoreProjectorErrors = pgTable('fluxcore_projector_errors', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectorName: text('projector_name').notNull(),
  signalSeq: bigint('signal_seq', { mode: 'number' }).notNull(),
  errorMessage: text('error_message').notNull(),
  errorStack: text('error_stack'),
  attempts: bigint('attempts', { mode: 'number' }).notNull().default(1),
  firstFailedAt: timestamp('first_failed_at'),
  lastFailedAt: timestamp('last_failed_at'),
  resolvedAt: timestamp('resolved_at'),
});

export type FluxCoreProjectorErrors = typeof fluxcoreProjectorErrors.$inferSelect;
export type NewFluxCoreProjectorErrors = typeof fluxcoreProjectorErrors.$inferInsert;
