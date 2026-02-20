import { pgTable, bigserial, text, timestamp, integer, index, uuid, bigint, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * FluxCore Cognition Queue — v8.2
 * 
 * Ensures at-least-once delivery and turn-window grouping.
 */
export const fluxcoreCognitionQueue = pgTable('fluxcore_cognition_queue', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),

    conversationId: uuid('conversation_id').notNull(),
    accountId: uuid('account_id').notNull(),

    lastSignalSeq: bigint('last_signal_seq', { mode: 'number' }),

    turnStartedAt: timestamp('turn_started_at', { withTimezone: true })
        .notNull()
        .default(sql`clock_timestamp()`),

    turnWindowExpiresAt: timestamp('turn_window_expires_at', { withTimezone: true })
        .notNull(),

    processedAt: timestamp('processed_at', { withTimezone: true }),

    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
}, (table) => ({
    readyIdx: index('idx_cognition_queue_ready').on(table.turnWindowExpiresAt).where(sql`processed_at IS NULL`),
    pendingUniqueConversation: uniqueIndex('ux_cognition_queue_pending_conversation')
        .on(table.conversationId)
        .where(sql`processed_at IS NULL`),
}));

export type CognitionQueueEntry = typeof fluxcoreCognitionQueue.$inferSelect;
export type NewCognitionQueueEntry = typeof fluxcoreCognitionQueue.$inferInsert;

