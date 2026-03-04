import { 
  bigint, 
  pgTable, 
  text, 
  timestamp
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Projector Cursors - Estado de procesamiento de projectores
 * 
 * Cada projector mantiene su cursor para garantizar procesamiento
 * exactamente-once de signals del Kernel.
 */
export const fluxcoreProjectorCursors = pgTable('fluxcore_projector_cursors', {
  projectorName: text('projector_name').primaryKey(),
  lastSequenceNumber: bigint('last_sequence_number', { mode: 'number' }).notNull(),
  lastProcessedAt: timestamp('last_processed_at').notNull().defaultNow(),
  errorCount: bigint('error_count', { mode: 'number' }).notNull().default(0),
  lastError: text('last_error'),
});

export type FluxCoreProjectorCursors = typeof fluxcoreProjectorCursors.$inferSelect;
export type NewFluxCoreProjectorCursors = typeof fluxcoreProjectorCursors.$inferInsert;
