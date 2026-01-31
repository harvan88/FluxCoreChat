/**
 * Asset Audit Logs Schema
 * 
 * Eventos inmutables para auditoría y compliance.
 * Solo INSERT, nunca UPDATE o DELETE.
 */

import { pgTable, uuid, varchar, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';

// ════════════════════════════════════════════════════════════════════════════
// Enums
// ════════════════════════════════════════════════════════════════════════════

export const auditActionEnum = pgEnum('asset_audit_action', [
    'upload_started',       // Inicio de upload
    'upload_completed',     // Upload completado
    'upload_failed',        // Upload fallido
    'upload_cancelled',     // Upload cancelado
    'session_expired',      // Sesión de upload expirada
    'download',             // Descarga de asset
    'preview',              // Vista previa
    'url_signed',           // URL firmada generada
    'state_changed',        // Cambio de estado
    'dedup_applied',        // Deduplicación aplicada
    'deleted',              // Asset eliminado (soft)
    'purged',               // Asset purgado (hard delete)
    'archived',             // Asset archivado
    'restored',             // Asset restaurado
    'access_denied',        // Acceso denegado
    'policy_evaluated',     // Política evaluada
    'metadata_updated',     // Metadatos actualizados
    'linked',               // Vinculado a entidad (mensaje, template, etc.)
    'unlinked'              // Desvinculado de entidad
]);

export const actorTypeEnum = pgEnum('asset_actor_type', [
    'user',         // Usuario humano
    'assistant',    // Asistente IA
    'system',       // Sistema (workers, cron, etc.)
    'api'           // API externa
]);

// ════════════════════════════════════════════════════════════════════════════
// Tabla: asset_audit_logs
// ════════════════════════════════════════════════════════════════════════════

export const assetAuditLogs = pgTable('asset_audit_logs', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Asset relacionado (puede ser null para eventos de sesión)
    assetId: uuid('asset_id'),
    
    // Sesión de upload relacionada (para eventos de upload)
    sessionId: uuid('session_id'),

    // Acción realizada
    action: auditActionEnum('action').notNull(),

    // Actor que realizó la acción
    actorId: uuid('actor_id'),
    actorType: actorTypeEnum('actor_type').notNull().default('system'),

    // Contexto de la acción
    context: varchar('context', { length: 100 }), // download:web, preview:assistant, etc.

    // Account relacionada
    accountId: uuid('account_id'),

    // Metadatos adicionales (JSON)
    metadata: text('metadata'),

    // IP y User Agent (para compliance)
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),

    // Resultado de la acción
    success: varchar('success', { length: 10 }).default('true'),
    errorMessage: text('error_message'),

    // Timestamp inmutable
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    // Índices para queries de auditoría
    assetIdx: index('idx_audit_logs_asset').on(table.assetId),
    sessionIdx: index('idx_audit_logs_session').on(table.sessionId),
    actionIdx: index('idx_audit_logs_action').on(table.action),
    actorIdx: index('idx_audit_logs_actor').on(table.actorId),
    accountIdx: index('idx_audit_logs_account').on(table.accountId),
    timestampIdx: index('idx_audit_logs_timestamp').on(table.timestamp),
    
    // Índice compuesto para queries frecuentes
    accountTimestampIdx: index('idx_audit_logs_account_timestamp').on(table.accountId, table.timestamp),
}));

// ════════════════════════════════════════════════════════════════════════════
// Tipos TypeScript
// ════════════════════════════════════════════════════════════════════════════

export type AssetAuditLog = typeof assetAuditLogs.$inferSelect;
export type NewAssetAuditLog = typeof assetAuditLogs.$inferInsert;
export type AuditAction = 
    | 'upload_started' | 'upload_completed' | 'upload_failed' | 'upload_cancelled'
    | 'session_expired' | 'download' | 'preview' | 'url_signed'
    | 'state_changed' | 'dedup_applied' | 'deleted' | 'purged'
    | 'archived' | 'restored' | 'access_denied' | 'policy_evaluated'
    | 'metadata_updated' | 'linked' | 'unlinked';
export type ActorType = 'user' | 'assistant' | 'system' | 'api';

// ════════════════════════════════════════════════════════════════════════════
// Interfaces de Servicio
// ════════════════════════════════════════════════════════════════════════════

export interface LogAuditEventParams {
    assetId?: string;
    sessionId?: string;
    action: AuditAction;
    actorId?: string;
    actorType?: ActorType;
    context?: string;
    accountId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
}

export interface AuditQueryParams {
    assetId?: string;
    accountId?: string;
    action?: AuditAction;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}
