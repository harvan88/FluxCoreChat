/**
 * FluxCore: Document Chunks Schema
 * 
 * Chunks de documentos con embeddings vectoriales para RAG.
 * Cada chunk es una porción de un archivo indexado en un Vector Store.
 * 
 * RAG-001: Infraestructura de Base de Datos Vectorial
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  varchar,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { assets } from './assets';


/**
 * Tabla de chunks de documentos con embeddings vectoriales
 * 
 * NOTA: La columna 'embedding' es de tipo vector(1536) para compatibilidad
 * con OpenAI text-embedding-3-small. Para otros modelos, ajustar dimensiones.
 * 
 * Drizzle no tiene soporte nativo para pgvector, por lo que usamos sql`` 
 * para definir la columna. La migración SQL crea la columna correctamente.
 */
export const fluxcoreDocumentChunks = pgTable('fluxcore_document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),

  // References to parent entities
  fileId: uuid('file_id')
    .references(() => assets.id, { onDelete: 'cascade' })
    .notNull(),
  
  // Model Configuration for multi-dimensional support
  embeddingModel: varchar('embedding_model', { length: 255 }).notNull(),

  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull(),

  // Chunk content and metadata
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  tokenCount: integer('token_count').notNull().default(0),
  metadata: jsonb('metadata').default({}),

  // Indexing info
  startChar: integer('start_char'),
  endChar: integer('end_char'),
  pageNumber: integer('page_number'),
  sectionTitle: varchar('section_title', { length: 255 }),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    // Unique constraint: one chunk per file position PER MODEL
    uniqueChunkPerFileModel: uniqueIndex('idx_document_chunks_file_chunk_model').on(table.fileId, table.embeddingModel, table.chunkIndex),

    // Indexes for common query patterns
    idxFileModel: index('idx_document_chunks_file_model').on(table.fileId, table.embeddingModel),
    idxAccount: index('idx_document_chunks_account_drizzle').on(table.accountId),
  };
});
