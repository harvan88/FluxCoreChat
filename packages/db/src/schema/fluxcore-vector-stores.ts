/**
 * FluxCore: Vector Stores Schema
 * 
 * Base de conocimiento vectorizada para RAG (Retrieval Augmented Generation).
 * Almacena referencias a archivos indexados y configuración de expiración.
 */

import { pgTable, uuid, varchar, timestamp, text, integer, jsonb } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

/**
 * Detalles de uso del vector store
 */
export interface VectorStoreUsage {
  bytesUsed: number;
  hoursUsedThisMonth: number;
  costPerGBPerDay: number;
}

export const fluxcoreVectorStores = pgTable('fluxcore_vector_stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Identificación
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  externalId: varchar('external_id', { length: 255 }), // ID de OpenAI vector store si aplica
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'), // 'private', 'shared', 'public'
  
  // Estado
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft', 'production', 'expired'
  
  // Configuración de expiración
  expirationPolicy: varchar('expiration_policy', { length: 50 }).default('never'), // 'never', 'days_after_creation', 'days_after_last_use'
  expirationDays: integer('expiration_days'),
  expiresAt: timestamp('expires_at'),
  
  // Uso y métricas
  usage: jsonb('usage').$type<VectorStoreUsage>().default({
    bytesUsed: 0,
    hoursUsedThisMonth: 0,
    costPerGBPerDay: 0.1,
  }).notNull(),
  
  // Metadata
  sizeBytes: integer('size_bytes').default(0),
  fileCount: integer('file_count').default(0),
  lastModifiedBy: varchar('last_modified_by', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreVectorStore = typeof fluxcoreVectorStores.$inferSelect;
export type NewFluxcoreVectorStore = typeof fluxcoreVectorStores.$inferInsert;

/**
 * Archivos dentro de un Vector Store
 */
export const fluxcoreVectorStoreFiles = pgTable('fluxcore_vector_store_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  vectorStoreId: uuid('vector_store_id')
    .notNull()
    .references(() => fluxcoreVectorStores.id, { onDelete: 'cascade' }),
  
  // Identificación
  name: varchar('name', { length: 255 }).notNull(),
  externalId: varchar('external_id', { length: 255 }), // ID de OpenAI file si aplica
  
  // Archivo
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: integer('size_bytes').default(0),
  
  // Estado de procesamiento
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  errorMessage: text('error_message'),
  
  // Metadata
  lastModifiedBy: varchar('last_modified_by', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreVectorStoreFile = typeof fluxcoreVectorStoreFiles.$inferSelect;
export type NewFluxcoreVectorStoreFile = typeof fluxcoreVectorStoreFiles.$inferInsert;
