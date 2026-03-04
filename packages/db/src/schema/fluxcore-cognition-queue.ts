import { 
  bigint, 
  pgTable, 
  text, 
  timestamp, 
  uuid,
  index
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Cognition Queue - Turnos de procesamiento cognitivo
 * 
 * Encola turnos de procesamiento para FluxCore basados en signals del Kernel.
 */
export const fluxcoreCognitionQueue = pgTable('fluxcore_cognition_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull(),
  accountId: uuid('account_id').notNull(),
  lastSignalSeq: bigint('last_signal_seq', { mode: 'number' }).notNull(),
  turnStartedAt: timestamp('turn_started_at').notNull().defaultNow(),
  turnWindowExpiresAt: timestamp('turn_window_expires_at').notNull(),
  processedAt: timestamp('processed_at'),
  targetAccountId: uuid('target_account_id'),
  status: text('status', { enum: ['pending', 'processing', 'processed', 'expired'] }).notNull().default('pending'),
}, (table) => ({
  // Índices para procesamiento eficiente
  conversationIdx: index('idx_cognition_conversation').on(table.conversationId, table.processedAt),
  accountIdx: index('idx_cognition_account').on(table.accountId, table.processedAt),
  pendingIdx: index('idx_cognition_pending').on(table.status, table.turnWindowExpiresAt),
}));

export type FluxCoreCognitionQueue = typeof fluxcoreCognitionQueue.$inferSelect;
export type NewFluxCoreCognitionQueue = typeof fluxcoreCognitionQueue.$inferInsert;
