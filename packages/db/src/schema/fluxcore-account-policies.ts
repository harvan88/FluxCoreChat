/**
 * FluxCore: Account Policies Schema — Canon v8.3
 * 
 * Gobierna el CÓMO y CUÁNDO opera la IA por cuenta.
 */

import { pgTable, text, integer, timestamp, jsonb, uuid, boolean } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const fluxcoreAccountPolicies = pgTable('fluxcore_account_policies', {
    accountId: uuid('account_id')
        .primaryKey()
        .references(() => accounts.id, { onDelete: 'cascade' }),

    mode: text('mode', { enum: ['auto', 'suggest', 'off'] }).notNull().default('off'),
    responseDelayMs: integer('response_delay_ms').notNull().default(2000),
    turnWindowMs: integer('turn_window_ms').notNull().default(3000),
    turnWindowTypingMs: integer('turn_window_typing_ms').notNull().default(5000),
    turnWindowMaxMs: integer('turn_window_max_ms').notNull().default(60000),
    offHoursPolicy: jsonb('off_hours_policy').notNull().default({ action: 'ignore' }),

    // AI Visibility Flags (Decoupled from ChatCore accounts)
    aiIncludeName: boolean('ai_include_name').notNull().default(true),
    aiIncludeBio: boolean('ai_include_bio').notNull().default(true),
    aiIncludeLocations: boolean('ai_include_locations').notNull().default(true),
    aiIncludeSchedule: boolean('ai_include_schedule').notNull().default(true),
    aiIncludeSocialLinks: boolean('ai_include_social_links').notNull().default(true),
    aiIncludePrivateContext: boolean('ai_include_private_context').notNull().default(true),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type FluxcoreAccountPolicy = typeof fluxcoreAccountPolicies.$inferSelect;
export type NewFluxcoreAccountPolicy = typeof fluxcoreAccountPolicies.$inferInsert;
