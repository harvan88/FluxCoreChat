import { 
  bigint, 
  bigserial, 
  pgTable, 
  text, 
  timestamp, 
  uuid,
  index
} from 'drizzle-orm/pg-core';
import { messages } from './messages';

/**
 * ChatCore Outbox - Garantiza certificación de mensajes en el Kernel
 * 
 * Esta tabla asegura que cada mensaje persistido por ChatCore
 * sea certificado en el Kernel incluso si el proceso falla.
 */
export const chatcoreOutbox = pgTable('chatcore_outbox', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'processing', 'sent'] }).notNull().default('pending'),
  payload: text('payload').notNull(), // JSON string
  attempts: bigint('attempts', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  sentAt: timestamp('sent_at'),
  lastError: text('last_error')
}, (table) => ({
  // Índice para procesamiento eficiente de pendientes
  pendingIdx: index('idx_chatcore_outbox_pending').on(table.status, table.createdAt)
}));

export type ChatCoreOutbox = typeof chatcoreOutbox.$inferSelect;
export type NewChatCoreOutbox = typeof chatcoreOutbox.$inferInsert;
