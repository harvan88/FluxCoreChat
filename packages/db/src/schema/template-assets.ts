/**
 * Template Assets Schema
 * 
 * Relación entre plantillas y assets.
 * Permite definir qué assets forman parte de cada plantilla.
 */

import { pgTable, uuid, varchar, integer, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';

// ════════════════════════════════════════════════════════════════════════════
// Tabla: template_assets
// ════════════════════════════════════════════════════════════════════════════

export const templateAssets = pgTable('template_assets', {
    // Plantilla a la que está vinculado
    templateId: uuid('template_id').notNull(),
    
    // Asset vinculado
    assetId: uuid('asset_id').notNull(),
    
    // Versión específica del asset
    version: integer('version').notNull().default(1),
    
    // Slot o posición en la plantilla
    slot: varchar('slot', { length: 100 }).notNull().default('default'),

    // Timestamps
    linkedAt: timestamp('linked_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    // Primary key compuesta
    pk: primaryKey({ columns: [table.templateId, table.assetId, table.slot] }),
    
    // Índices
    templateIdx: index('idx_template_assets_template').on(table.templateId),
    assetIdx: index('idx_template_assets_asset').on(table.assetId),
}));

// ════════════════════════════════════════════════════════════════════════════
// Tipos TypeScript
// ════════════════════════════════════════════════════════════════════════════

export type TemplateAsset = typeof templateAssets.$inferSelect;
export type NewTemplateAsset = typeof templateAssets.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// Interfaces de Servicio
// ════════════════════════════════════════════════════════════════════════════

export interface LinkAssetToTemplateParams {
    templateId: string;
    assetId: string;
    version?: number;
    slot?: string;
}
