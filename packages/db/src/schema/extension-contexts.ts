/**
 * Schema: Extension Contexts
 * FC-151: Context Overlays - Datos adicionales por extensión
 */

import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { relationships } from './relationships';
import { conversations } from './conversations';

/**
 * Tabla de contextos de extensión (Context Overlays)
 * Permite a las extensiones almacenar datos adicionales
 * asociados a accounts, relationships o conversations
 */
export const extensionContexts = pgTable('extension_contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Identificador de la extensión
  extensionId: varchar('extension_id', { length: 100 }).notNull(),
  
  // Solo UNA de estas FK puede estar activa (constraint check)
  accountId: uuid('account_id').references(() => accounts.id),
  relationshipId: uuid('relationship_id').references(() => relationships.id),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  
  // Tipo de contexto (permite múltiples overlays por entidad)
  contextType: varchar('context_type', { length: 50 }).notNull(),
  
  // Datos del overlay
  payload: jsonb('payload').notNull().$type<Record<string, any>>(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Tipos inferidos
 */
export type ExtensionContext = typeof extensionContexts.$inferSelect;
export type NewExtensionContext = typeof extensionContexts.$inferInsert;

/**
 * Tipos de contexto comunes
 */
export type ExtensionContextType = 
  | 'ai_settings'      // Configuración de IA para la cuenta
  | 'ai_preferences'   // Preferencias de IA para relación
  | 'ai_conversation'  // Datos de IA para conversación
  | 'custom';          // Tipo personalizado
