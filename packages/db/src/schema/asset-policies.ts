/**
 * Asset Policies Schema
 * 
 * Políticas de acceso para assets.
 * Define TTL de URLs firmadas, contextos permitidos y reglas de deduplicación.
 */

import { pgTable, uuid, varchar, text, integer, timestamp, index, boolean } from 'drizzle-orm/pg-core';

// ════════════════════════════════════════════════════════════════════════════
// Tabla: asset_policies
// ════════════════════════════════════════════════════════════════════════════

export const assetPolicies = pgTable('asset_policies', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Nombre descriptivo de la política
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),

    // Scope al que aplica esta política
    scope: varchar('scope', { length: 50 }).notNull(), // message_attachment, template_asset, etc.

    // Contextos permitidos (JSON array)
    // Ej: ["download:web", "preview:assistant", "internal:compliance"]
    allowedContexts: text('allowed_contexts').notNull(),

    // TTL de URLs firmadas (en segundos)
    defaultTtlSeconds: integer('default_ttl_seconds').notNull().default(3600), // 1 hora
    maxTtlSeconds: integer('max_ttl_seconds').notNull().default(86400), // 24 horas

    // Reglas de deduplicación
    dedupScope: varchar('dedup_scope', { length: 50 }).default('intra_account'),
    
    // Límites
    maxFileSizeBytes: integer('max_file_size_bytes'),
    allowedMimeTypes: text('allowed_mime_types'), // JSON array

    // Flags
    requireEncryption: boolean('require_encryption').default(false),
    allowPublicAccess: boolean('allow_public_access').default(false),
    auditAllAccess: boolean('audit_all_access').default(true),

    // Retención
    retentionDays: integer('retention_days'),
    
    // Ownership (null = política global del sistema)
    accountId: uuid('account_id'),

    // Estado
    isActive: boolean('is_active').default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    scopeIdx: index('idx_asset_policies_scope').on(table.scope),
    accountIdx: index('idx_asset_policies_account').on(table.accountId),
    activeIdx: index('idx_asset_policies_active').on(table.isActive),
}));

// ════════════════════════════════════════════════════════════════════════════
// Tipos TypeScript
// ════════════════════════════════════════════════════════════════════════════

export type AssetPolicy = typeof assetPolicies.$inferSelect;
export type NewAssetPolicy = typeof assetPolicies.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// Interfaces de Servicio
// ════════════════════════════════════════════════════════════════════════════

export interface PolicyContext {
    action: 'download' | 'preview' | 'internal';
    channel: 'web' | 'api' | 'assistant' | 'compliance';
}

export interface EvaluatePolicyParams {
    assetId: string;
    actorId: string;
    actorType: 'user' | 'assistant' | 'system';
    context: PolicyContext;
}

export interface PolicyEvaluationResult {
    allowed: boolean;
    ttlSeconds: number;
    reason?: string;
    policyId?: string;
}
