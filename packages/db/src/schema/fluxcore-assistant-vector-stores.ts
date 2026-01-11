/**
 * FluxCore: Assistant Vector Stores Schema
 * 
 * Relación muchos a muchos: Asistentes <-> Bases de Conocimiento (Vector Stores)
 * Permite que un asistente tenga acceso a múltiples fuentes de conocimiento.
 */

import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { fluxcoreAssistants } from './fluxcore-assistants';
import { fluxcoreVectorStores } from './fluxcore-vector-stores';

export const fluxcoreAssistantVectorStores = pgTable('fluxcore_assistant_vector_stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  assistantId: uuid('assistant_id')
    .notNull()
    .references(() => fluxcoreAssistants.id, { onDelete: 'cascade' }),
  vectorStoreId: uuid('vector_store_id')
    .notNull()
    .references(() => fluxcoreVectorStores.id, { onDelete: 'cascade' }),
  
  // Configuración de acceso
  accessMode: varchar('access_mode', { length: 20 }).default('read').notNull(), // 'read', 'write', 'read_write'
  isEnabled: boolean('is_enabled').default(true).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreAssistantVectorStore = typeof fluxcoreAssistantVectorStores.$inferSelect;
export type NewFluxcoreAssistantVectorStore = typeof fluxcoreAssistantVectorStores.$inferInsert;
