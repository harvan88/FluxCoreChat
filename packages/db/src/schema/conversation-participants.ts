import { pgTable, uuid, timestamp, varchar, text, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { conversations } from './conversations';
import { accounts } from './accounts';

export const conversationParticipants = pgTable('conversation_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().default('initiator'),
  identityType: varchar('identity_type', { length: 20 }).notNull().default('registered'),
  visitorToken: text('visitor_token'),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).defaultNow().notNull(),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
}, (table) => ({
  conversationAccountUnique: uniqueIndex('ux_conversation_participants_account').on(table.conversationId, table.accountId),
  conversationIdx: index('idx_conversation_participants_conversation').on(table.conversationId),
  accountIdx: index('idx_conversation_participants_account').on(table.accountId),
  visitorTokenIdx: index('idx_conversation_participants_token').on(table.visitorToken),
  roleValid: sql`CHECK (${table.role} IN ('initiator', 'recipient', 'observer'))`,
  identityTypeValid: sql`CHECK (${table.identityType} IN ('registered', 'anonymous', 'system'))`,
}));

export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type NewConversationParticipant = typeof conversationParticipants.$inferInsert;
