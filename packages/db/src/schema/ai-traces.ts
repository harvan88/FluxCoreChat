import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { conversations } from './conversations';
import { messages } from './messages';

export const aiTraces = pgTable(
  'ai_traces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),

    // Execution metadata
    runtime: varchar('runtime', { length: 20 }).notNull(), // 'local' | 'openai'
    provider: varchar('provider', { length: 20 }).notNull(), // 'groq' | 'openai'
    model: varchar('model', { length: 100 }).notNull(),
    mode: varchar('mode', { length: 20 }).notNull(), // 'suggest' | 'auto'

    // Timing
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),

    // Tokens
    promptTokens: integer('prompt_tokens').default(0),
    completionTokens: integer('completion_tokens').default(0),
    totalTokens: integer('total_tokens').default(0),

    // Request/Response
    requestBody: jsonb('request_body'), // system prompt + mensajes
    responseContent: text('response_content'),

    // Tool usage
    toolsOffered: jsonb('tools_offered').$type<string[]>().default([]),
    toolsCalled: jsonb('tools_called').$type<string[]>().default([]),
    toolDetails: jsonb('tool_details'), // Array of { name, args, result, durationMs }

    // Attempts (fallback entre providers)
    attempts: jsonb('attempts'), // Array of { provider, model, success, error, durationMs }

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    accountIdx: index('idx_ai_traces_account').on(table.accountId),
    conversationIdx: index('idx_ai_traces_conversation').on(table.conversationId),
    createdAtIdx: index('idx_ai_traces_created_at').on(table.createdAt),
  })
);

export type AITrace = typeof aiTraces.$inferSelect;
export type NewAITrace = typeof aiTraces.$inferInsert;
