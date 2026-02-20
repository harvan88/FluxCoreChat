import { pgTable, uuid, varchar, timestamp, integer, text, index } from 'drizzle-orm/pg-core';
import { relationships } from './relationships';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  relationshipId: uuid('relationship_id')
    .notNull()
    .references(() => relationships.id, { onDelete: 'cascade' }),
  channel: varchar('channel', { length: 20 }).notNull(), // 'web' | 'whatsapp' | 'telegram'
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active' | 'archived' | 'closed'

  // Desnormalización para performance
  lastMessageAt: timestamp('last_message_at'),
  lastMessageText: varchar('last_message_text', { length: 500 }),
  unreadCountA: integer('unread_count_a').default(0).notNull(),
  unreadCountB: integer('unread_count_b').default(0).notNull(),

  // Widget identity support
  visitorToken: text('visitor_token'),
  identityLinkedAt: timestamp('identity_linked_at', { withTimezone: true }),
  linkedAccountId: text('linked_account_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  visitorTokenIdx: index('idx_conversations_visitor_token').on(table.visitorToken),
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
