/**
 * FluxCore: Vector Stores Schema
 * 
 * Base de conocimiento vectorizada para RAG (Retrieval Augmented Generation).
 * 
 * CONFORMIDAD CON REGLAS ARQUITECTÓNICAS:
 * - Para backend='openai': Todos los campos de estado son REGISTRO REFERENCIAL
 *   derivado de OpenAI (fuente de verdad). FluxCore no infiere ni corrige.
 * - Para backend='local': FluxCore es la fuente de verdad.
 */

import { pgTable, uuid, varchar, timestamp, text, integer, jsonb, bigint } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

/**
 * Detalles de uso del vector store (para cálculos locales)
 */
export interface VectorStoreUsage {
  bytesUsed: number;
  hoursUsedThisMonth: number;
  costPerGBPerDay: number;
}

/**
 * File counts en formato OpenAI
 * NOTA: Para backend=openai, estos valores se LEEN desde OpenAI, no se infieren.
 */
export interface OpenAIFileCounts {
  in_progress: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
}

/**
 * Política de expiración en formato OpenAI
 */
export interface OpenAIExpiresAfter {
  anchor: 'last_active_at';
  days: number;
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
  backend: varchar('backend', { length: 20 }).notNull().default('local'), // 'local', 'openai'

  // ════════════════════════════════════════════════════════════════════════════
  // CAMPOS ALINEADOS CON OPENAI API
  // Para backend='openai': valores LEÍDOS desde OpenAI (fuente de verdad)
  // Para backend='local': valores calculados localmente
  // ════════════════════════════════════════════════════════════════════════════

  // Metadata de OpenAI (hasta 16 pares clave-valor)
  metadata: jsonb('metadata').$type<Record<string, string>>().default({}),

  // File counts en formato OpenAI (LEÍDO desde OpenAI para backend=openai)
  fileCounts: jsonb('file_counts').$type<OpenAIFileCounts>().default({
    in_progress: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    total: 0,
  }),

  // Expires after en formato OpenAI
  expiresAfter: jsonb('expires_after').$type<OpenAIExpiresAfter | null>(),

  // Última actividad (LEÍDA desde OpenAI para backend=openai)
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),

  // Usage bytes (LEÍDO desde OpenAI para backend=openai)
  usageBytes: bigint('usage_bytes', { mode: 'number' }).default(0),

  // ════════════════════════════════════════════════════════════════════════════
  // CAMPOS LEGACY (se mantienen por compatibilidad)
  // ════════════════════════════════════════════════════════════════════════════

  // Configuración de expiración (legacy, usar expiresAfter para OpenAI)
  expirationPolicy: varchar('expiration_policy', { length: 50 }).default('never'),
  expirationDays: integer('expiration_days'),
  expiresAt: timestamp('expires_at'),

  // Uso y métricas (legacy, para local)
  usage: jsonb('usage').$type<VectorStoreUsage>().default({
    bytesUsed: 0,
    hoursUsedThisMonth: 0,
    costPerGBPerDay: 0.1,
  }).notNull(),

  // Metadata legacy
  sizeBytes: integer('size_bytes').default(0),
  fileCount: integer('file_count').default(0), // Legacy, usar fileCounts
  lastModifiedBy: varchar('last_modified_by', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreVectorStore = typeof fluxcoreVectorStores.$inferSelect;
export type NewFluxcoreVectorStore = typeof fluxcoreVectorStores.$inferInsert;

/**
 * Estrategia de chunking en formato OpenAI
 */
export interface OpenAIChunkingStrategy {
  type: 'auto' | 'static';
  static?: {
    max_chunk_size_tokens: number;  // 100-4096
    chunk_overlap_tokens: number;    // <= max/2
  };
}

/**
 * Last error en formato OpenAI
 */
export interface OpenAILastError {
  code: string;
  message: string;
}

/**
 * Archivos dentro de un Vector Store
 * 
 * CONFORMIDAD CON REGLAS ARQUITECTÓNICAS:
 * - Para VS con backend='openai': status y atributos se LEEN desde OpenAI
 * - El externalId (openai_file_id) es el identificador de verdad en OpenAI
 * - Si OpenAI no reconoce el archivo, FluxCore debe considerarlo inexistente
 */
export const fluxcoreVectorStoreFiles = pgTable('fluxcore_vector_store_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  vectorStoreId: uuid('vector_store_id')
    .notNull()
    .references(() => fluxcoreVectorStores.id, { onDelete: 'cascade' }),

  // Referencia al archivo centralizado (solo para backend=local)
  fileId: uuid('file_id'),

  // Identificación
  name: varchar('name', { length: 255 }).notNull(),
  externalId: varchar('external_id', { length: 255 }), // ID de OpenAI file (OBLIGATORIO para backend=openai)

  // Archivo
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: integer('size_bytes').default(0),

  // Estado de procesamiento
  // Estados permitidos: 'pending', 'processing', 'completed', 'failed'
  // Para backend=openai: DEBE derivar de OpenAI o representar transición en curso
  status: varchar('status', { length: 20 }).notNull().default('pending'),

  // ════════════════════════════════════════════════════════════════════════════
  // CAMPOS ALINEADOS CON OPENAI API
  // Para backend='openai': valores LEÍDOS desde OpenAI
  // ════════════════════════════════════════════════════════════════════════════

  // Atributos para filtrado en búsquedas OpenAI (hasta 16 pares)
  attributes: jsonb('attributes').$type<Record<string, string | number | boolean>>().default({}),

  // Estrategia de chunking usada al subir a OpenAI
  chunkingStrategy: jsonb('chunking_strategy').$type<OpenAIChunkingStrategy>(),

  // Usage bytes (LEÍDO desde OpenAI)
  usageBytes: bigint('usage_bytes', { mode: 'number' }).default(0),

  // Last error en formato OpenAI (reemplaza errorMessage)
  lastError: jsonb('last_error').$type<OpenAILastError | null>(),

  // ════════════════════════════════════════════════════════════════════════════
  // CAMPOS LEGACY (se mantienen por compatibilidad con backend=local)
  // ════════════════════════════════════════════════════════════════════════════

  errorMessage: text('error_message'), // Legacy, usar lastError para OpenAI
  chunkCount: integer('chunk_count').default(0), // Solo para backend=local

  // Metadata
  lastModifiedBy: varchar('last_modified_by', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreVectorStoreFile = typeof fluxcoreVectorStoreFiles.$inferSelect;
export type NewFluxcoreVectorStoreFile = typeof fluxcoreVectorStoreFiles.$inferInsert;
