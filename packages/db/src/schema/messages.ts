import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { conversations } from './conversations';
import { accounts } from './accounts';
import { users } from './users';

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderAccountId: uuid('sender_account_id')
    .notNull()
    .references(() => accounts.id),
  
  content: jsonb('content').notNull(), // { text, media[], location, buttons[] }
  type: varchar('type', { length: 20 }).notNull(), // 'incoming' | 'outgoing' | 'system'
  
  // IA metadata
  generatedBy: varchar('generated_by', { length: 20 }).default('human').notNull(), // 'human' | 'ai'
  aiApprovedBy: uuid('ai_approved_by').references(() => users.id),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messageEnrichments = pgTable('message_enrichments', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  extensionId: varchar('extension_id', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageEnrichment = typeof messageEnrichments.$inferSelect;
export type NewMessageEnrichment = typeof messageEnrichments.$inferInsert;

// Tipos para el contenido del mensaje
export interface MessageMedia {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface MessageLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MessageButton {
  id: string;
  text: string;
  action: string;
}

export interface MessageContent {
  text: string;
  media?: MessageMedia[];
  location?: MessageLocation;
  buttons?: MessageButton[];
}
