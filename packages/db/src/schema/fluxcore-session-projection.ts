import { pgTable, text, timestamp, jsonb, bigint, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const fluxcoreSessionProjection = pgTable('fluxcore_session_projection', {
    sessionId: uuid('session_id').primaryKey(),
    actorId: text('actor_id').notNull(),
    accountId: text('account_id').notNull(),
    entryPoint: text('entry_point'),
    deviceHash: text('device_hash'),
    method: text('method'),
    scopes: jsonb('scopes').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    status: text('status').notNull().default('pending'),
    lastSequenceNumber: bigint('last_sequence_number', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type FluxcoreSessionProjection = typeof fluxcoreSessionProjection.$inferSelect;
export type NewFluxcoreSessionProjection = typeof fluxcoreSessionProjection.$inferInsert;
