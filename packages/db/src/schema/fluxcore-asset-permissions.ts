/**
 * FluxCore: Asset Permissions Schema
 * 
 * Sistema de permisos para compartir assets entre cuentas.
 * Permite que Vector Stores, Instructions y Tools sean compartidos
 * con diferentes niveles de acceso (read, write, admin).
 * 
 * RAG-002: Sistema de Assets Centralizados
 */

import { pgTable, uuid, varchar, timestamp, text, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { fluxcoreVectorStores } from './fluxcore-vector-stores';
import { fluxcoreInstructions } from './fluxcore-instructions';
import { fluxcoreToolDefinitions } from './fluxcore-tools';

/**
 * Niveles de permiso disponibles
 */
export type PermissionLevel = 'read' | 'write' | 'admin';

/**
 * Origen del permiso
 */
export type PermissionSource = 'shared' | 'marketplace' | 'public';

/**
 * Tabla de permisos de assets
 * 
 * Permite compartir assets entre cuentas con diferentes niveles de acceso.
 * Un usuario puede tener solo un permiso por asset.
 */
export const fluxcoreAssetPermissions = pgTable('fluxcore_asset_permissions', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Asset referenciado (exactamente uno debe estar presente)
    vectorStoreId: uuid('vector_store_id')
        .references(() => fluxcoreVectorStores.id, { onDelete: 'cascade' }),
    instructionId: uuid('instruction_id')
        .references(() => fluxcoreInstructions.id, { onDelete: 'cascade' }),
    toolDefinitionId: uuid('tool_definition_id')
        .references(() => fluxcoreToolDefinitions.id, { onDelete: 'cascade' }),

    // Quién tiene acceso
    granteeAccountId: uuid('grantee_account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),

    // Tipo de acceso
    permissionLevel: varchar('permission_level', { length: 20 })
        .notNull()
        .default('read')
        .$type<PermissionLevel>(),

    // Origen del permiso
    source: varchar('source', { length: 20 })
        .notNull()
        .default('shared')
        .$type<PermissionSource>(),

    // Quién lo compartió
    grantedByAccountId: uuid('granted_by_account_id')
        .notNull()
        .references(() => accounts.id),
    grantedAt: timestamp('granted_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),  // NULL = no expira

    // Metadata
    notes: text('notes'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    // Índices para queries comunes
    granteeIdx: index('idx_asset_permissions_grantee_drizzle').on(table.granteeAccountId),
    sourceIdx: index('idx_asset_permissions_source_drizzle').on(table.source),
}));

export type FluxcoreAssetPermission = typeof fluxcoreAssetPermissions.$inferSelect;
export type NewFluxcoreAssetPermission = typeof fluxcoreAssetPermissions.$inferInsert;

/**
 * Tipos de assets que pueden tener permisos
 */
export type AssetType = 'vector_store' | 'instruction' | 'tool';

/**
 * Información de acceso a un asset
 */
export interface AssetAccessInfo {
    assetId: string;
    assetType: AssetType;
    assetName: string;
    accessType: 'owned' | 'shared' | 'marketplace' | 'public';
    permissionLevel: PermissionLevel;
    grantedAt?: Date;
    expiresAt?: Date;
}

/**
 * Request para compartir un asset
 */
export interface ShareAssetRequest {
    assetId: string;
    assetType: AssetType;
    granteeAccountId: string;
    permissionLevel: PermissionLevel;
    expiresAt?: Date;
    notes?: string;
}

/**
 * Request para revocar acceso a un asset
 */
export interface RevokeAssetRequest {
    assetId: string;
    assetType: AssetType;
    granteeAccountId: string;
}

/**
 * Filtros para buscar assets accesibles
 */
export interface AccessibleAssetsFilter {
    accountId: string;
    assetType?: AssetType;
    accessType?: 'owned' | 'shared' | 'marketplace' | 'public' | 'all';
    includeExpired?: boolean;
}
