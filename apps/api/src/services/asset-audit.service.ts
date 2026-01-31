/**
 * Asset Audit Service
 * 
 * Logging inmutable para auditoría y compliance.
 * Solo INSERT, nunca UPDATE o DELETE.
 */

import { db } from '@fluxcore/db';
import { 
    assetAuditLogs, 
    type AssetAuditLog,
    type LogAuditEventParams,
    type AuditQueryParams,
    type AuditAction
} from '@fluxcore/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const DEBUG_PREFIX = '[AssetAudit]';

export class AssetAuditService {
    /**
     * Registrar evento de auditoría (inmutable)
     */
    async logEvent(params: LogAuditEventParams): Promise<AssetAuditLog> {
        const [log] = await db.insert(assetAuditLogs).values({
            assetId: params.assetId,
            sessionId: params.sessionId,
            action: params.action,
            actorId: params.actorId,
            actorType: params.actorType || 'system',
            context: params.context,
            accountId: params.accountId,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            success: params.success === false ? 'false' : 'true',
            errorMessage: params.errorMessage,
        }).returning();

        console.log(`${DEBUG_PREFIX} Event logged: action=${params.action}, assetId=${params.assetId || 'N/A'}, actor=${params.actorId || 'system'}`);

        return log;
    }

    /**
     * Registrar inicio de upload
     */
    async logUploadStarted(params: {
        sessionId: string;
        accountId: string;
        actorId?: string;
        fileName?: string;
        mimeType?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void> {
        await this.logEvent({
            sessionId: params.sessionId,
            action: 'upload_started',
            actorId: params.actorId,
            actorType: 'user',
            accountId: params.accountId,
            metadata: {
                fileName: params.fileName,
                mimeType: params.mimeType,
            },
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
        });
    }

    /**
     * Registrar upload completado
     */
    async logUploadCompleted(params: {
        assetId: string;
        sessionId: string;
        accountId: string;
        actorId?: string;
        sizeBytes: number;
        checksumSHA256: string;
    }): Promise<void> {
        await this.logEvent({
            assetId: params.assetId,
            sessionId: params.sessionId,
            action: 'upload_completed',
            actorId: params.actorId,
            actorType: 'user',
            accountId: params.accountId,
            metadata: {
                sizeBytes: params.sizeBytes,
                checksumSHA256: params.checksumSHA256.substring(0, 16) + '...', // No exponer hash completo
            },
        });
    }

    /**
     * Registrar upload fallido
     */
    async logUploadFailed(params: {
        sessionId: string;
        accountId: string;
        actorId?: string;
        error: string;
    }): Promise<void> {
        await this.logEvent({
            sessionId: params.sessionId,
            action: 'upload_failed',
            actorId: params.actorId,
            actorType: 'user',
            accountId: params.accountId,
            success: false,
            errorMessage: params.error,
        });
    }

    /**
     * Registrar descarga
     */
    async logDownload(params: {
        assetId: string;
        actorId: string;
        actorType: 'user' | 'assistant' | 'system';
        context: string;
        accountId: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void> {
        await this.logEvent({
            assetId: params.assetId,
            action: 'download',
            actorId: params.actorId,
            actorType: params.actorType,
            context: params.context,
            accountId: params.accountId,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
        });
    }

    /**
     * Registrar URL firmada
     */
    async logUrlSigned(params: {
        assetId: string;
        actorId: string;
        actorType: 'user' | 'assistant' | 'system';
        context: string;
        ttlSeconds: number;
        accountId: string;
    }): Promise<void> {
        await this.logEvent({
            assetId: params.assetId,
            action: 'url_signed',
            actorId: params.actorId,
            actorType: params.actorType,
            context: params.context,
            accountId: params.accountId,
            metadata: { ttlSeconds: params.ttlSeconds },
        });
    }

    /**
     * Registrar cambio de estado
     */
    async logStateChanged(params: {
        assetId: string;
        accountId: string;
        fromStatus: string;
        toStatus: string;
        actorId?: string;
    }): Promise<void> {
        await this.logEvent({
            assetId: params.assetId,
            action: 'state_changed',
            actorId: params.actorId,
            actorType: params.actorId ? 'user' : 'system',
            accountId: params.accountId,
            metadata: {
                from: params.fromStatus,
                to: params.toStatus,
            },
        });
    }

    /**
     * Registrar deduplicación aplicada
     */
    async logDedupApplied(params: {
        assetId: string;
        existingAssetId: string;
        accountId: string;
        checksumSHA256: string;
    }): Promise<void> {
        await this.logEvent({
            assetId: params.assetId,
            action: 'dedup_applied',
            actorType: 'system',
            accountId: params.accountId,
            metadata: {
                existingAssetId: params.existingAssetId,
                checksumPrefix: params.checksumSHA256.substring(0, 16),
            },
        });
    }

    /**
     * Registrar eliminación
     */
    async logDeleted(params: {
        assetId: string;
        accountId: string;
        actorId?: string;
        reason?: string;
    }): Promise<void> {
        await this.logEvent({
            assetId: params.assetId,
            action: 'deleted',
            actorId: params.actorId,
            actorType: params.actorId ? 'user' : 'system',
            accountId: params.accountId,
            metadata: params.reason ? { reason: params.reason } : undefined,
        });
    }

    /**
     * Registrar purge (hard delete)
     */
    async logPurged(params: {
        assetId: string;
        accountId: string;
        reason?: string;
    }): Promise<void> {
        await this.logEvent({
            assetId: params.assetId,
            action: 'purged',
            actorType: 'system',
            accountId: params.accountId,
            metadata: params.reason ? { reason: params.reason } : undefined,
        });
    }

    /**
     * Registrar acceso denegado
     */
    async logAccessDenied(params: {
        assetId: string;
        actorId: string;
        actorType: 'user' | 'assistant' | 'system';
        context: string;
        reason: string;
        accountId?: string;
        ipAddress?: string;
    }): Promise<void> {
        await this.logEvent({
            assetId: params.assetId,
            action: 'access_denied',
            actorId: params.actorId,
            actorType: params.actorType,
            context: params.context,
            accountId: params.accountId,
            success: false,
            errorMessage: params.reason,
            ipAddress: params.ipAddress,
        });
    }

    /**
     * Registrar vinculación a entidad
     */
    async logLinked(params: {
        assetId: string;
        entityType: 'message' | 'template' | 'plan';
        entityId: string;
        accountId: string;
        actorId?: string;
    }): Promise<void> {
        await this.logEvent({
            assetId: params.assetId,
            action: 'linked',
            actorId: params.actorId,
            actorType: params.actorId ? 'user' : 'system',
            accountId: params.accountId,
            metadata: {
                entityType: params.entityType,
                entityId: params.entityId,
            },
        });
    }

    /**
     * Registrar desvinculación de entidad
     */
    async logUnlinked(params: {
        assetId: string;
        entityType: 'message' | 'template' | 'plan';
        entityId: string;
        accountId: string;
        actorId?: string;
    }): Promise<void> {
        await this.logEvent({
            assetId: params.assetId,
            action: 'unlinked',
            actorId: params.actorId,
            actorType: params.actorId ? 'user' : 'system',
            accountId: params.accountId,
            metadata: {
                entityType: params.entityType,
                entityId: params.entityId,
            },
        });
    }

    /**
     * Consultar eventos de auditoría
     */
    async queryEvents(params: AuditQueryParams): Promise<AssetAuditLog[]> {
        const conditions = [];

        if (params.assetId) {
            conditions.push(eq(assetAuditLogs.assetId, params.assetId));
        }

        if (params.accountId) {
            conditions.push(eq(assetAuditLogs.accountId, params.accountId));
        }

        if (params.action) {
            conditions.push(eq(assetAuditLogs.action, params.action));
        }

        if (params.actorId) {
            conditions.push(eq(assetAuditLogs.actorId, params.actorId));
        }

        if (params.startDate) {
            conditions.push(gte(assetAuditLogs.timestamp, params.startDate));
        }

        if (params.endDate) {
            conditions.push(lte(assetAuditLogs.timestamp, params.endDate));
        }

        const query = db.select()
            .from(assetAuditLogs)
            .orderBy(desc(assetAuditLogs.timestamp))
            .limit(params.limit || 100)
            .offset(params.offset || 0);

        if (conditions.length > 0) {
            return query.where(and(...conditions));
        }

        return query;
    }

    /**
     * Obtener historial de un asset
     */
    async getAssetHistory(assetId: string): Promise<AssetAuditLog[]> {
        return this.queryEvents({ assetId, limit: 500 });
    }

    /**
     * Obtener eventos recientes de una cuenta
     */
    async getRecentAccountEvents(accountId: string, limit: number = 50): Promise<AssetAuditLog[]> {
        return this.queryEvents({ accountId, limit });
    }

    /**
     * Generar reporte de compliance
     */
    async generateComplianceReport(params: {
        accountId: string;
        startDate: Date;
        endDate: Date;
    }): Promise<{
        totalEvents: number;
        byAction: Record<string, number>;
        accessDenied: number;
        uploads: number;
        downloads: number;
        deletions: number;
    }> {
        const events = await this.queryEvents({
            accountId: params.accountId,
            startDate: params.startDate,
            endDate: params.endDate,
            limit: 10000,
        });

        const report = {
            totalEvents: events.length,
            byAction: {} as Record<string, number>,
            accessDenied: 0,
            uploads: 0,
            downloads: 0,
            deletions: 0,
        };

        for (const event of events) {
            const action = event.action || 'unknown';
            report.byAction[action] = (report.byAction[action] || 0) + 1;

            if (action === 'access_denied') report.accessDenied++;
            if (action === 'upload_completed') report.uploads++;
            if (action === 'download') report.downloads++;
            if (action === 'deleted' || action === 'purged') report.deletions++;
        }

        return report;
    }
}

// Singleton
export const assetAuditService = new AssetAuditService();
