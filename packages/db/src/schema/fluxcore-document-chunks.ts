/**
 * FluxCore: Document Chunks Schema
 * 
 * Chunks de documentos con embeddings vectoriales para RAG.
 * Cada chunk es una porción de un archivo indexado en un Vector Store.
 * 
 * RAG-001: Infraestructura de Base de Datos Vectorial
 */

import { pgTable, uuid, varchar, timestamp, text, integer, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts';
import { fluxcoreVectorStores } from './fluxcore-vector-stores';
import { fluxcoreVectorStoreFiles } from './fluxcore-vector-stores';

/**
 * Metadata del chunk para contexto adicional
 */
export interface ChunkMetadata {
  // Ubicación en el documento original
  startChar?: number;
  endChar?: number;
  pageNumber?: number;
  sectionTitle?: string;
  
  // Información del documento
  documentTitle?: string;
  documentAuthor?: string;
  
  // Etiquetas personalizadas
  tags?: string[];
  
  // Cualquier metadata adicional
  [key: string]: unknown;
}

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
  
  // Referencias a entidades padre
  vectorStoreId: uuid('vector_store_id')
    .notNull()
    .references(() => fluxcoreVectorStores.id, { onDelete: 'cascade' }),
  fileId: uuid('file_id')
    .notNull()
    .references(() => fluxcoreVectorStoreFiles.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Contenido del chunk
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  tokenCount: integer('token_count').notNull().default(0),
  
  // NOTA: La columna 'embedding' de tipo vector(1536) se crea en la migración SQL
  // Drizzle no soporta el tipo vector nativamente
  // Para queries, usar sql`` con el operador <=> para similitud coseno
  
  // Metadata JSONB para información adicional
  metadata: jsonb('metadata').$type<ChunkMetadata>().default({}),
  
  // Ubicación en el documento original
  startChar: integer('start_char'),
  endChar: integer('end_char'),
  pageNumber: integer('page_number'),
  sectionTitle: varchar('section_title', { length: 255 }),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: un chunk por posición en cada archivo
  fileChunkIdx: uniqueIndex('idx_document_chunks_file_chunk').on(table.fileId, table.chunkIndex),
  
  // Índices para filtrado eficiente
  accountIdx: index('idx_document_chunks_account_drizzle').on(table.accountId),
  vectorStoreIdx: index('idx_document_chunks_vector_store_drizzle').on(table.vectorStoreId),
  fileIdx: index('idx_document_chunks_file_drizzle').on(table.fileId),
}));

export type FluxcoreDocumentChunk = typeof fluxcoreDocumentChunks.$inferSelect;
export type NewFluxcoreDocumentChunk = typeof fluxcoreDocumentChunks.$inferInsert;

/**
 * Helper types para queries de similitud
 */
export interface SimilaritySearchResult {
  id: string;
  content: string;
  fileId: string;
  chunkIndex: number;
  metadata: ChunkMetadata;
  similarity: number;
}

export interface SimilaritySearchOptions {
  queryEmbedding: number[];
  vectorStoreIds: string[];
  accountId: string;
  limit?: number;
  minSimilarity?: number;
  filters?: {
    fileIds?: string[];
    metadata?: Record<string, unknown>;
  };
}

/**
 * SQL helper para búsqueda por similitud coseno
 * 
 * Uso:
 * ```typescript
 * const results = await db.execute(sql`
 *   SELECT * FROM search_document_chunks(
 *     ${sql.raw(`'[${embedding.join(',')}]'::vector`)},
 *     ${sql.raw(`ARRAY[${vectorStoreIds.map(id => `'${id}'::uuid`).join(',')}]`)},
 *     ${accountId}::uuid,
 *     ${limit},
 *     ${minSimilarity}
 *   )
 * `);
 * ```
 */
export const similaritySearchQuery = (
  embedding: number[],
  vectorStoreIds: string[],
  accountId: string,
  limit = 10,
  minSimilarity = 0.7
) => sql`
  SELECT 
    c.id,
    c.content,
    c.file_id as "fileId",
    c.chunk_index as "chunkIndex",
    c.metadata,
    c.page_number as "pageNumber",
    c.section_title as "sectionTitle",
    1 - (c.embedding <=> '[${sql.raw(embedding.join(','))}]'::vector) as similarity
  FROM fluxcore_document_chunks c
  WHERE c.account_id = ${accountId}::uuid
    AND c.vector_store_id = ANY(ARRAY[${sql.raw(vectorStoreIds.map(id => `'${id}'::uuid`).join(','))}])
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> '[${sql.raw(embedding.join(','))}]'::vector) >= ${minSimilarity}
  ORDER BY c.embedding <=> '[${sql.raw(embedding.join(','))}]'::vector
  LIMIT ${limit}
`;
