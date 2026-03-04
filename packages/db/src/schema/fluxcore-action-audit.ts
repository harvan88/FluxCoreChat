/**
 * FluxCore: Action Audit Schema — Canon v8.3
 * 
 * Auditoría de todas las acciones ejecutadas por rumbos de IA.
 */

import { pgTable, bigserial, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const fluxcoreActionAudit = pgTable('fluxcore_action_audit', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    conversationId: text('conversation_id').notNull(),
    accountId: text('account_id').notNull(),
    runtimeId: text('runtime_id').notNull(),
    actionType: text('action_type').notNull(),
    actionPayload: jsonb('action_payload'),
    status: text('status', { enum: ['executed', 'rejected', 'failed'] }).notNull(),
    rejectionReason: text('rejection_reason'),
    executedAt: timestamp('executed_at', { withTimezone: true })
        .notNull()
        .default(sql`clock_timestamp()`),
}, (table) => ({
    idxAccount: index('idx_action_audit_account').on(table.accountId, table.executedAt),
}));

export type FluxcoreActionAudit = typeof fluxcoreActionAudit.$inferSelect;
export type NewFluxcoreActionAudit = typeof fluxcoreActionAudit.$inferInsert;
