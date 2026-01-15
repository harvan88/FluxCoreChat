/**
 * FluxCore Centralized Files Schema
 * 
 * Archivos centralizados que pueden ser referenciados por múltiples Vector Stores.
 * Sigue el patrón de "assets por referencia" de FluxCore.
 */

import { pgTable, uuid, varchar, text, bigint, timestamp, index, unique } from 'drizzle-orm/pg-core';

// ════════════════════════════════════════════════════════════════════════════
// Tabla Principal: fluxcore_files
// ════════════════════════════════════════════════════════════════════════════

export const fluxcoreFiles = pgTable('fluxcore_files', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Metadatos
    name: varchar('name', { length: 500 }).notNull(),
    originalName: varchar('original_name', { length: 500 }),
    mimeType: varchar('mime_type', { length: 100 }).default('application/octet-stream'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).default(0),

    // Contenido de texto (para reprocessing)
    textContent: text('text_content'),

    // Hash para deduplicación
    contentHash: varchar('content_hash', { length: 64 }),

    // Propietario
    accountId: uuid('account_id').notNull(),
    uploadedBy: uuid('uploaded_by'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    accountIdx: index('idx_fluxcore_files_account').on(table.accountId),
    nameIdx: index('idx_fluxcore_files_name').on(table.name),
    hashIdx: index('idx_fluxcore_files_hash').on(table.contentHash),
    createdIdx: index('idx_fluxcore_files_created').on(table.createdAt),
    uniqueHash: unique('fluxcore_files_unique_hash').on(table.accountId, table.contentHash),
}));

// ════════════════════════════════════════════════════════════════════════════
// Relaciones - definidas en un archivo separado para evitar dependencias circulares
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// Tipos TypeScript
// ════════════════════════════════════════════════════════════════════════════

export type FluxcoreFile = typeof fluxcoreFiles.$inferSelect;
export type NewFluxcoreFile = typeof fluxcoreFiles.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// Interfaces de Servicio
// ════════════════════════════════════════════════════════════════════════════

export interface FileUploadParams {
    name: string;
    mimeType?: string;
    sizeBytes?: number;
    textContent?: string;
    accountId: string;
    uploadedBy?: string;
}

export interface FileWithVectorStores extends FluxcoreFile {
    vectorStores: Array<{
        id: string;
        name: string;
        status: string;
        chunkCount?: number;
    }>;
}

export interface VectorStoreFileLink {
    linkId: string;
    vectorStoreId: string;
    fileId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    errorMessage?: string;
    chunkCount?: number;
    linkedAt: Date;
    file: FluxcoreFile;
}
