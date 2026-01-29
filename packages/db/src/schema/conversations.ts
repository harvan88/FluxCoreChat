import { pgTable, uuid, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
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

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
