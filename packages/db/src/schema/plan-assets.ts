/**
 * Plan Assets Schema
 * 
 * Relación entre execution plans y assets.
 * Asegura que cada step declare sus dependencias de assets.
 */

import { pgTable, uuid, varchar, integer, boolean, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';

// ════════════════════════════════════════════════════════════════════════════
// Tabla: plan_assets
// ════════════════════════════════════════════════════════════════════════════

export const planAssets = pgTable('plan_assets', {
    // Plan al que está vinculado
    planId: uuid('plan_id').notNull(),
    
    // Step específico del plan (opcional, null = plan completo)
    stepId: varchar('step_id', { length: 100 }),
    
    // Asset vinculado
    assetId: uuid('asset_id').notNull(),
    
    // Versión específica del asset
    version: integer('version').notNull().default(1),
    
    // Tipo de dependencia
    dependencyType: varchar('dependency_type', { length: 50 }).notNull().default('required'),
    // required: el step no puede avanzar sin el asset ready
    // optional: el step puede avanzar sin el asset
    // output: el step produce este asset

    // Estado de disponibilidad
    isReady: boolean('is_ready').default(false),

    // Timestamps
    linkedAt: timestamp('linked_at', { withTimezone: true }).defaultNow(),
    readyAt: timestamp('ready_at', { withTimezone: true }),
}, (table) => ({
    // Primary key compuesta
    pk: primaryKey({ columns: [table.planId, table.assetId] }),
    
    // Índices
    planIdx: index('idx_plan_assets_plan').on(table.planId),
    stepIdx: index('idx_plan_assets_step').on(table.stepId),
    assetIdx: index('idx_plan_assets_asset').on(table.assetId),
    readyIdx: index('idx_plan_assets_ready').on(table.isReady),
}));

// ════════════════════════════════════════════════════════════════════════════
// Tipos TypeScript
// ════════════════════════════════════════════════════════════════════════════

export type PlanAsset = typeof planAssets.$inferSelect;
export type NewPlanAsset = typeof planAssets.$inferInsert;
export type DependencyType = 'required' | 'optional' | 'output';

// ════════════════════════════════════════════════════════════════════════════
// Interfaces de Servicio
// ════════════════════════════════════════════════════════════════════════════

export interface LinkAssetToPlanParams {
    planId: string;
    stepId?: string;
    assetId: string;
    version?: number;
    dependencyType?: DependencyType;
}

export interface PlanAssetStatus {
    planId: string;
    totalAssets: number;
    readyAssets: number;
    pendingAssets: number;
    canProceed: boolean;
}
