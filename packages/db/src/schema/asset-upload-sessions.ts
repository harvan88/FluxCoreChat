/**
 * Asset Upload Sessions Schema
 * 
 * Sesiones efímeras para uploads de assets.
 * Las sesiones tienen TTL y se limpian automáticamente al expirar.
 */

import { pgTable, uuid, varchar, text, bigint, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';

// ════════════════════════════════════════════════════════════════════════════
// Enums
// ════════════════════════════════════════════════════════════════════════════

export const uploadSessionStatusEnum = pgEnum('upload_session_status', [
    'active',       // Sesión activa, esperando chunks
    'uploading',    // Upload en progreso
    'committed',    // Upload completado y confirmado
    'expired',      // Sesión expirada
    'cancelled'     // Sesión cancelada por el usuario
]);

// ════════════════════════════════════════════════════════════════════════════
// Tabla: asset_upload_sessions
// ════════════════════════════════════════════════════════════════════════════

export const assetUploadSessions = pgTable('asset_upload_sessions', {
    // Identificador de sesión
    id: uuid('id').primaryKey().defaultRandom(),

    // Ownership
    accountId: uuid('account_id').notNull(),
    uploadedBy: uuid('uploaded_by'),

    // Estado de la sesión
    status: uploadSessionStatusEnum('status').notNull().default('active'),

    // Límites de la sesión
    maxSizeBytes: bigint('max_size_bytes', { mode: 'number' }).notNull().default(104857600), // 100MB default
    allowedMimeTypes: text('allowed_mime_types'), // JSON array de mime types permitidos

    // Progreso del upload
    bytesUploaded: bigint('bytes_uploaded', { mode: 'number' }).default(0),
    totalBytes: bigint('total_bytes', { mode: 'number' }),
    chunksReceived: bigint('chunks_received', { mode: 'number' }).default(0),

    // Storage temporal
    tempStorageKey: varchar('temp_storage_key', { length: 1000 }),

    // Metadatos del archivo (proporcionados al crear sesión)
    fileName: varchar('file_name', { length: 500 }),
    mimeType: varchar('mime_type', { length: 100 }),

    // Asset resultante (después de commit)
    assetId: uuid('asset_id'),

    // TTL
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    committedAt: timestamp('committed_at', { withTimezone: true }),
}, (table) => ({
    // Índices
    accountIdx: index('idx_upload_sessions_account').on(table.accountId),
    statusIdx: index('idx_upload_sessions_status').on(table.status),
    expiresIdx: index('idx_upload_sessions_expires').on(table.expiresAt),
    assetIdx: index('idx_upload_sessions_asset').on(table.assetId),
}));

// ════════════════════════════════════════════════════════════════════════════
// Tipos TypeScript
// ════════════════════════════════════════════════════════════════════════════

export type AssetUploadSession = typeof assetUploadSessions.$inferSelect;
export type NewAssetUploadSession = typeof assetUploadSessions.$inferInsert;
export type UploadSessionStatus = 'active' | 'uploading' | 'committed' | 'expired' | 'cancelled';

// ════════════════════════════════════════════════════════════════════════════
// Interfaces de Servicio
// ════════════════════════════════════════════════════════════════════════════

export interface CreateUploadSessionParams {
    accountId: string;
    uploadedBy?: string;
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
    fileName?: string;
    mimeType?: string;
    totalBytes?: number;
    ttlMinutes?: number; // Default 10 minutos
}

export interface UploadSessionProgress {
    sessionId: string;
    status: UploadSessionStatus;
    bytesUploaded: number;
    totalBytes: number | null;
    chunksReceived: number;
    percentComplete: number;
    expiresAt: Date;
}
