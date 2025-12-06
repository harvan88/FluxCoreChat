import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { accounts } from './accounts';

// Actors representan la relación entre usuarios y cuentas (para workspaces colaborativos)
export const actors = pgTable('actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'owner' | 'admin' | 'operator' | 'viewer'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Actor = typeof actors.$inferSelect;
export type NewActor = typeof actors.$inferInsert;
