import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { conversations } from './conversations';

export const creditsWallets = pgTable(
  'credits_wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    accountUnique: uniqueIndex('credits_wallets_account_unique').on(table.accountId),
    accountIdx: index('idx_credits_wallets_account').on(table.accountId),
  })
);

export const creditsLedger = pgTable(
  'credits_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    entryType: varchar('entry_type', { length: 30 }).notNull(),
    featureKey: varchar('feature_key', { length: 60 }).notNull(),
    engine: varchar('engine', { length: 30 }),
    model: varchar('model', { length: 100 }),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    accountIdx: index('idx_credits_ledger_account').on(table.accountId),
    createdAtIdx: index('idx_credits_ledger_created_at').on(table.createdAt),
  })
);

export const creditsPolicies = pgTable(
  'credits_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    featureKey: varchar('feature_key', { length: 60 }).notNull(),
    engine: varchar('engine', { length: 30 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    costCredits: integer('cost_credits').notNull(),
    tokenBudget: integer('token_budget').notNull(),
    durationHours: integer('duration_hours').notNull().default(24),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    featureIdx: index('idx_credits_policies_feature').on(table.featureKey),
    engineModelIdx: index('idx_credits_policies_engine_model').on(table.engine, table.model),
  })
);

export const creditsConversationSessions = pgTable(
  'credits_conversation_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    featureKey: varchar('feature_key', { length: 60 }).notNull(),
    engine: varchar('engine', { length: 30 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    costCredits: integer('cost_credits').notNull(),
    tokenBudget: integer('token_budget').notNull(),
    tokensUsed: integer('tokens_used').notNull().default(0),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    accountIdx: index('idx_credits_conversation_sessions_account').on(table.accountId),
    conversationIdx: index('idx_credits_conversation_sessions_conversation').on(table.conversationId),
    featureIdx: index('idx_credits_conversation_sessions_feature').on(table.featureKey),
    expiresIdx: index('idx_credits_conversation_sessions_expires_at').on(table.expiresAt),
  })
);

export type CreditsWallet = typeof creditsWallets.$inferSelect;
export type NewCreditsWallet = typeof creditsWallets.$inferInsert;
export type CreditsLedgerEntry = typeof creditsLedger.$inferSelect;
export type NewCreditsLedgerEntry = typeof creditsLedger.$inferInsert;
export type CreditsPolicy = typeof creditsPolicies.$inferSelect;
export type NewCreditsPolicy = typeof creditsPolicies.$inferInsert;
export type CreditsConversationSession = typeof creditsConversationSessions.$inferSelect;
export type NewCreditsConversationSession = typeof creditsConversationSessions.$inferInsert;
