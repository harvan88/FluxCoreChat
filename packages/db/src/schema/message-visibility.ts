import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { messages } from './messages';
import { actors } from './actors';

/**
 * Message Visibility — Modelo canónico de ocultamiento por actor
 * 
 * Cuando un actor decide "eliminar un mensaje para sí mismo",
 * el mensaje no se elimina ni se muta. Se registra aquí que ese
 * actor ya no debe ver ese mensaje.
 * 
 * Si el actor no tiene entrada en esta tabla para un mensaje,
 * el mensaje es visible para ese actor (visibilidad por defecto).
 */
export const messageVisibility = pgTable('message_visibility', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => actors.id, { onDelete: 'cascade' }),
  hiddenAt: timestamp('hidden_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  messageActorUnique: uniqueIndex('ux_message_visibility_message_actor').on(table.messageId, table.actorId),
  actorIdx: index('idx_message_visibility_actor').on(table.actorId),
  messageIdx: index('idx_message_visibility_message').on(table.messageId),
}));

export type MessageVisibility = typeof messageVisibility.$inferSelect;
export type NewMessageVisibility = typeof messageVisibility.$inferInsert;
