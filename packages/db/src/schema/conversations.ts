import { pgTable, uuid, varchar, timestamp, text, index, jsonb, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relationships } from './relationships';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  // WES-180: Relationship is optional for visitor threads
  relationshipId: uuid('relationship_id')
    .references(() => relationships.id, { onDelete: 'cascade' }),
  conversationType: varchar('conversation_type', { length: 32 }).notNull().default('internal'), // 'internal' | 'anonymous_thread' | 'external'
  channel: varchar('channel', { length: 32 }).notNull().default('web'), // 'web' | 'whatsapp' | 'telegram' | 'webchat' | 'external'
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active' | 'archived' | 'closed'

  // Desnormalización para performance
  lastMessageAt: timestamp('last_message_at'),
  lastMessageText: varchar('last_message_text', { length: 500 }),

  frozenAt: timestamp('frozen_at'),
  frozenReason: text('frozen_reason'),
  metadata: jsonb('metadata').default({}).notNull(),

  // Widget identity support
  visitorToken: text('visitor_token'),
  identityLinkedAt: timestamp('identity_linked_at', { withTimezone: true }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  visitorTokenIdx: index('idx_conversations_visitor_token').on(table.visitorToken),
  conversationTypeValid: check('conversation_type_valid', sql`${table.conversationType} IN ('internal', 'anonymous_thread', 'external')`),
  conversationChannelValid: check('conversation_channel_valid', sql`${table.channel} IN ('web', 'whatsapp', 'telegram', 'webchat', 'external')`),
  conversationStatusValid: check('conversation_status_valid', sql`${table.status} IN ('active', 'archived', 'closed')`),
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
