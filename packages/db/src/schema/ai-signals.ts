import {
  pgTable,
  uuid,
  varchar,
  real,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { conversations } from './conversations';
import { relationships } from './relationships';
import { aiTraces } from './ai-traces';

export const aiSignals = pgTable(
  'ai_signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    traceId: uuid('trace_id')
      .notNull()
      .references(() => aiTraces.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
    relationshipId: uuid('relationship_id').references(() => relationships.id, { onDelete: 'set null' }),

    // The signal
    signalType: varchar('signal_type', { length: 30 }).notNull(), // 'sentiment', 'action', 'routing', 'conversion', 'topic', 'urgency'
    signalValue: varchar('signal_value', { length: 100 }).notNull(), // 'frustrated', 'escalate', 'delegate:@ana', 'sale_completed'
    confidence: real('confidence').default(1.0),
    metadata: jsonb('metadata'), // Free-form additional data

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    accountIdx: index('idx_ai_signals_account').on(table.accountId),
    typeValueIdx: index('idx_ai_signals_type_value').on(table.signalType, table.signalValue),
    conversationIdx: index('idx_ai_signals_conversation').on(table.conversationId),
    createdAtIdx: index('idx_ai_signals_created_at').on(table.createdAt),
  })
);

export type AISignal = typeof aiSignals.$inferSelect;
export type NewAISignal = typeof aiSignals.$inferInsert;
