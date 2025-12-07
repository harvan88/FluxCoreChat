import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { accounts } from './accounts';

/**
 * COR-004: Actor Model Completo
 * 
 * Un Actor es cualquier entidad que puede enviar o recibir mensajes:
 * - account: Una cuenta de usuario (personal o business)
 * - user: Un usuario directamente (para contextos administrativos)
 * - builtin_ai: IA integrada del sistema (core-ai)
 * - extension: Una extensión instalada
 * 
 * Esto permite trazabilidad completa de quién envía/recibe cada mensaje.
 */
export const actors = pgTable('actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // COR-004: Tipo de actor
  actorType: varchar('actor_type', { length: 20 }).notNull(), // 'account' | 'user' | 'builtin_ai' | 'extension'
  
  // Referencias opcionales según el tipo de actor
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  extensionId: varchar('extension_id', { length: 100 }), // '@fluxcore/core-ai', '@fluxcore/appointments', etc.
  
  // Metadatos
  displayName: varchar('display_name', { length: 100 }), // Nombre para mostrar (ej: "IA de Soporte")
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Actor = typeof actors.$inferSelect;
export type NewActor = typeof actors.$inferInsert;

// COR-004: Tipos de actor
export type ActorType = 'account' | 'user' | 'builtin_ai' | 'extension';
