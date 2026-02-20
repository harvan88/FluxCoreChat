import { pgTable, uuid, varchar, timestamp, text, jsonb, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  username: varchar('username', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  accountType: varchar('account_type', { length: 20 }).notNull(), // 'personal' | 'business'
  profile: jsonb('profile').default({}).notNull(),
  privateContext: text('private_context'),
  // COR-005: Alias para identificación contextual (migration-009)
  alias: varchar('alias', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  allowAutomatedUse: boolean('allow_automated_use').default(false).notNull(),
  aiIncludeName: boolean('ai_include_name').default(true).notNull(),
  aiIncludeBio: boolean('ai_include_bio').default(true).notNull(),
  aiIncludePrivateContext: boolean('ai_include_private_context').default(true).notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
