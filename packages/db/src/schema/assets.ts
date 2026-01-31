/**
 * Assets Schema - Sistema de Gestión de Assets
 * 
 * Tabla principal para almacenar metadatos de assets.
 * Los assets son archivos (imágenes, documentos, etc.) que pueden ser
 * adjuntados a mensajes, plantillas o execution plans.
 */

import { pgTable, uuid, varchar, text, bigint, timestamp, index, unique, pgEnum } from 'drizzle-orm/pg-core';

// ════════════════════════════════════════════════════════════════════════════
// Enums
// ════════════════════════════════════════════════════════════════════════════

export const assetStatusEnum = pgEnum('asset_status', [
    'pending',      // Subido pero no validado
    'ready',        // Validado y listo para uso
    'archived',     // Archivado (soft delete)
    'deleted'       // Marcado para eliminación física
]);

export const assetScopeEnum = pgEnum('asset_scope', [
    'message_attachment',   // Adjunto a mensaje
    'template_asset',       // Parte de una plantilla
    'execution_plan',       // Dependencia de execution plan
    'shared_internal',      // Compartido internamente
    'profile_avatar',       // Avatar de perfil
    'workspace_asset'       // Asset de workspace
]);

export const dedupPolicyEnum = pgEnum('dedup_policy', [
    'none',             // Sin deduplicación
    'intra_account',    // Dedup dentro de la cuenta
    'intra_workspace',  // Dedup dentro del workspace
    'custom'            // Política personalizada
]);

// ════════════════════════════════════════════════════════════════════════════
// Tabla Principal: assets
// ════════════════════════════════════════════════════════════════════════════

export const assets = pgTable('assets', {
    // Identificador opaco (UUID v7/ULID) - identifica la entidad lógica, no el contenido
    id: uuid('id').primaryKey().defaultRandom(),

    // Ownership
    accountId: uuid('account_id').notNull(),
    workspaceId: uuid('workspace_id'),

    // Scope del asset
    scope: assetScopeEnum('scope').notNull().default('message_attachment'),

    // Estado del asset
    status: assetStatusEnum('status').notNull().default('pending'),

    // Versionado
    version: bigint('version', { mode: 'number' }).notNull().default(1),

    // Metadatos del archivo
    name: varchar('name', { length: 500 }).notNull(),
    originalName: varchar('original_name', { length: 500 }),
    mimeType: varchar('mime_type', { length: 100 }).default('application/octet-stream'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).default(0),

    // Integridad y deduplicación
    checksumSHA256: varchar('checksum_sha256', { length: 64 }),
    dedupPolicy: dedupPolicyEnum('dedup_policy').notNull().default('intra_account'),

    // Storage
    storageKey: varchar('storage_key', { length: 1000 }).notNull(),
    storageProvider: varchar('storage_provider', { length: 50 }).default('local'),

    // Encriptación
    encryption: varchar('encryption', { length: 50 }),
    encryptionKeyId: varchar('encryption_key_id', { length: 100 }),

    // Metadatos adicionales (JSON)
    metadata: text('metadata'),

    // Usuario que subió el asset
    uploadedBy: uuid('uploaded_by'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),

    // Retención
    retentionPolicy: varchar('retention_policy', { length: 50 }),
    hardDeleteAt: timestamp('hard_delete_at', { withTimezone: true }),
}, (table) => ({
    // Índices para queries frecuentes
    accountIdx: index('idx_assets_account').on(table.accountId),
    workspaceIdx: index('idx_assets_workspace').on(table.workspaceId),
    statusIdx: index('idx_assets_status').on(table.status),
    scopeIdx: index('idx_assets_scope').on(table.scope),
    checksumIdx: index('idx_assets_checksum').on(table.checksumSHA256),
    createdIdx: index('idx_assets_created').on(table.createdAt),
    storageKeyIdx: index('idx_assets_storage_key').on(table.storageKey),
    
    // Unique constraint para deduplicación intra-account
    uniqueChecksum: unique('assets_unique_checksum_account').on(table.accountId, table.checksumSHA256),
}));

// ════════════════════════════════════════════════════════════════════════════
// Tipos TypeScript
// ════════════════════════════════════════════════════════════════════════════

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AssetStatus = 'pending' | 'ready' | 'archived' | 'deleted';
export type AssetScope = 'message_attachment' | 'template_asset' | 'execution_plan' | 'shared_internal' | 'profile_avatar' | 'workspace_asset';
export type DedupPolicy = 'none' | 'intra_account' | 'intra_workspace' | 'custom';

// ════════════════════════════════════════════════════════════════════════════
// Interfaces de Servicio
// ════════════════════════════════════════════════════════════════════════════

export interface CreateAssetParams {
    accountId: string;
    workspaceId?: string;
    name: string;
    originalName?: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey: string;
    storageProvider?: string;
    scope?: AssetScope;
    dedupPolicy?: DedupPolicy;
    uploadedBy?: string;
    metadata?: Record<string, unknown>;
}

export interface AssetSearchParams {
    accountId: string;
    workspaceId?: string;
    scope?: AssetScope;
    status?: AssetStatus;
    mimeType?: string;
    search?: string;
    limit?: number;
    offset?: number;
}
