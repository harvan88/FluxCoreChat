import { pgTable, uuid, varchar, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const accountAiEntitlements = pgTable('account_ai_entitlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').default(false).notNull(),
  allowedProviders: jsonb('allowed_providers').default([]).$type<string[]>(),
  defaultProvider: varchar('default_provider', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AccountAiEntitlement = typeof accountAiEntitlements.$inferSelect;
export type NewAccountAiEntitlement = typeof accountAiEntitlements.$inferInsert;
