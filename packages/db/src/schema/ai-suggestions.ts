import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { conversations } from './conversations';

export const aiSuggestions = pgTable(
  'ai_suggestions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    provider: varchar('provider', { length: 20 }),
    baseUrl: varchar('base_url', { length: 255 }),
    traceId: uuid('trace_id'),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'edited'

    // Usage
    promptTokens: integer('prompt_tokens').default(0),
    completionTokens: integer('completion_tokens').default(0),
    totalTokens: integer('total_tokens').default(0),

    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }), // when approved/rejected/edited
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index('idx_ai_suggestions_conversation').on(table.conversationId),
    accountIdx: index('idx_ai_suggestions_account').on(table.accountId),
    statusIdx: index('idx_ai_suggestions_status').on(table.status),
    createdAtIdx: index('idx_ai_suggestions_created_at').on(table.createdAt),
  })
);

export type AISuggestionRow = typeof aiSuggestions.$inferSelect;
export type NewAISuggestionRow = typeof aiSuggestions.$inferInsert;
