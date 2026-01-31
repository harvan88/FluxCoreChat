/**
 * Message Assets Schema
 * 
 * Relación entre mensajes y assets.
 * Permite vincular múltiples assets a un mensaje.
 */

import { pgTable, uuid, integer, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';

// ════════════════════════════════════════════════════════════════════════════
// Tabla: message_assets
// ════════════════════════════════════════════════════════════════════════════

export const messageAssets = pgTable('message_assets', {
    // Mensaje al que está vinculado
    messageId: uuid('message_id').notNull(),
    
    // Asset vinculado
    assetId: uuid('asset_id').notNull(),
    
    // Versión específica del asset (para inmutabilidad)
    version: integer('version').notNull().default(1),
    
    // Posición del asset en el mensaje (para ordenamiento)
    position: integer('position').notNull().default(0),

    // Timestamps
    linkedAt: timestamp('linked_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    // Primary key compuesta
    pk: primaryKey({ columns: [table.messageId, table.assetId] }),
    
    // Índices
    messageIdx: index('idx_message_assets_message').on(table.messageId),
    assetIdx: index('idx_message_assets_asset').on(table.assetId),
}));

// ════════════════════════════════════════════════════════════════════════════
// Tipos TypeScript
// ════════════════════════════════════════════════════════════════════════════

export type MessageAsset = typeof messageAssets.$inferSelect;
export type NewMessageAsset = typeof messageAssets.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// Interfaces de Servicio
// ════════════════════════════════════════════════════════════════════════════

export interface LinkAssetToMessageParams {
    messageId: string;
    assetId: string;
    version?: number;
    position?: number;
}
