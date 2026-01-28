import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { conversations } from './conversations';
import { accounts } from './accounts';
import { users } from './users';
import { actors } from './actors';

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
  generatedBy: varchar('generated_by', { length: 20 }).default('human').notNull(), // 'human' | 'ai'
  aiApprovedBy: uuid('ai_approved_by').references(() => users.id),
  // COR-002: Status de sincronización/entrega (migration-007)
  status: varchar('status', { length: 20 }).default('synced').notNull(),
  // COR-004: Soft delete por usuario (array de accountIds)
  deletedBy: jsonb('deleted_by').default([]).notNull(),
  // COR-003: Actor model para mensajes (migration-008)
  fromActorId: uuid('from_actor_id').references(() => actors.id),
  toActorId: uuid('to_actor_id').references(() => actors.id),
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

// COR-002: Tipos de status para mensajes
export type MessageStatus =
  | 'local_only'      // Solo existe localmente (offline-first)
  | 'pending_backend' // Pendiente de sincronizar con backend
  | 'synced'          // Sincronizado con backend
  | 'sent'            // Enviado al destinatario (adapters externos)
  | 'delivered'       // Entregado al destinatario
  | 'seen';           // Visto por el destinatario

// Tipos para el contenido del mensaje
export interface MessageMedia {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  attachmentId?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  waveformData?: any;
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
