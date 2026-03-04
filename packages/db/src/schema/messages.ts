import { pgTable, uuid, varchar, timestamp, jsonb, bigint, integer, boolean, text, uniqueIndex, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { conversations } from './conversations';
import { accounts } from './accounts';
import { users } from './users';
import { fluxcoreActors } from './fluxcore-identity';

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderAccountId: uuid('sender_account_id')
    .notNull()
    .references(() => accounts.id),
  content: jsonb('content').notNull(), // { text?, media?, location?, buttons? }
  type: varchar('type', { length: 20 }).notNull(), // 'incoming' | 'outgoing' | 'system'
  eventType: varchar('event_type', { length: 20 }).default('message').notNull(), // 'message' | 'reaction' | 'edit' | 'internal_note' | 'system'
  generatedBy: varchar('generated_by', { length: 20 }).default('human').notNull(), // 'human' | 'ai' | 'system'
  aiApprovedBy: uuid('ai_approved_by').references(() => users.id),
  // COR-002: Status de sincronización/entrega (migration-007)
  status: varchar('status', { length: 20 }).default('synced').notNull(),
  // COR-003: Actor model para mensajes (migration-008)
  fromActorId: uuid('from_actor_id').references(() => fluxcoreActors.id),
  toActorId: uuid('to_actor_id').references(() => fluxcoreActors.id),
  parentId: uuid('parent_id'),
  originalId: uuid('original_id'),
  version: integer('version').notNull().default(1),
  isCurrent: boolean('is_current').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: text('deleted_by'),
  deletedScope: varchar('deleted_scope', { length: 10 }),
  // FLUX-001: Kernel alignment
  signalId: bigint('signal_id', { mode: 'number' }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  messagesSignalIdUnique: uniqueIndex('ux_messages_signal_id').on(table.signalId),
  messagesConversationIdx: index('idx_messages_conversation').on(table.conversationId, table.createdAt),
  messagesParentIdx: index('idx_messages_parent').on(table.parentId),
  messagesOriginalIdx: index('idx_messages_original').on(table.originalId),
  messageHasContent: check('message_has_content', sql`
    (${table.content} ->> 'text') IS NOT NULL
    OR jsonb_array_length(COALESCE(${table.content} -> 'media', '[]'::jsonb)) > 0
    OR ${table.eventType} IN ('reaction', 'system')
  `),
  messageDeletedScopeValid: check('message_deleted_scope_valid', sql`
    ${table.deletedScope} IS NULL OR ${table.deletedScope} IN ('self', 'all')
  `),
}));

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
  assetId: string;
  mimeType?: string;
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
  text?: string;
  media?: MessageMedia[];
  location?: MessageLocation;
  buttons?: MessageButton[];
}
