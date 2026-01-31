/**
 * Assets Routes
 * 
 * API REST para gestión de assets.
 */

import { Elysia, t } from 'elysia';
import { assetGatewayService } from '../services/asset-gateway.service';
import { assetRegistryService } from '../services/asset-registry.service';
import { assetPolicyService } from '../services/asset-policy.service';
import { assetAuditService } from '../services/asset-audit.service';

const DEBUG_PREFIX = '[AssetsRoutes]';

export const assetsRoutes = new Elysia({ prefix: '/assets' })
    // ════════════════════════════════════════════════════════════════════════
    // Upload Session Management
    // ════════════════════════════════════════════════════════════════════════

    /**
     * POST /assets/upload-session
     * Crear sesión de upload
     */
    .post('/upload-session', async ({ body, set }) => {
        try {
            console.log(`${DEBUG_PREFIX} POST /upload-session`);

            const session = await assetGatewayService.createUploadSession({
                accountId: body.accountId,
                uploadedBy: body.uploadedBy,
                maxSizeBytes: body.maxSizeBytes,
                allowedMimeTypes: body.allowedMimeTypes,
                fileName: body.fileName,
                mimeType: body.mimeType,
                totalBytes: body.totalBytes,
                ttlMinutes: body.ttlMinutes,
            });

            // Log audit
            await assetAuditService.logUploadStarted({
                sessionId: session.id,
                accountId: body.accountId,
                actorId: body.uploadedBy,
                fileName: body.fileName,
                mimeType: body.mimeType,
            });

            return {
                success: true,
                data: {
                    sessionId: session.id,
                    expiresAt: session.expiresAt,
                    maxSizeBytes: session.maxSizeBytes,
                },
            };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error creating upload session:`, error);
            set.status = 500;
            return { success: false, error: 'Failed to create upload session' };
        }
    }, {
        body: t.Object({
            accountId: t.String(),
            uploadedBy: t.Optional(t.String()),
            maxSizeBytes: t.Optional(t.Number()),
            allowedMimeTypes: t.Optional(t.Array(t.String())),
            fileName: t.Optional(t.String()),
            mimeType: t.Optional(t.String()),
            totalBytes: t.Optional(t.Number()),
            ttlMinutes: t.Optional(t.Number()),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Create upload session',
            description: 'Creates a new upload session with TTL and limits',
        },
    })

    /**
     * PUT /assets/upload/:sessionId
     * Upload file data to session
     */
    .put('/upload/:sessionId', async ({ params, body, set }) => {
        try {
            console.log(`${DEBUG_PREFIX} PUT /upload/${params.sessionId}`);

            // Body es el archivo raw
            const data = body as unknown as ArrayBuffer;
            const buffer = Buffer.from(data);

            const result = await assetGatewayService.uploadComplete(
                params.sessionId,
                buffer
            );

            if (!result.success) {
                set.status = 400;
                return { success: false, error: result.error };
            }

            return { success: true };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error uploading:`, error);
            set.status = 500;
            return { success: false, error: 'Upload failed' };
        }
    }, {
        params: t.Object({
            sessionId: t.String(),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Upload file data',
            description: 'Upload file data to an active session',
        },
    })

    /**
     * POST /assets/upload/:sessionId/commit
     * Commit upload and create asset
     */
    .post('/upload/:sessionId/commit', async ({ params, body, set }) => {
        try {
            console.log(`${DEBUG_PREFIX} POST /upload/${params.sessionId}/commit`);

            const result = await assetRegistryService.createFromUpload({
                sessionId: params.sessionId,
                accountId: body.accountId,
                workspaceId: body.workspaceId,
                name: body.name,
                scope: body.scope as any,
                dedupPolicy: body.dedupPolicy as any,
                uploadedBy: body.uploadedBy,
                metadata: body.metadata,
            });

            if (!result.success || !result.asset) {
                set.status = 400;
                return { success: false, error: result.error };
            }

            // Log audit
            const session = await assetGatewayService.getSession(params.sessionId);
            if (session) {
                await assetAuditService.logUploadCompleted({
                    assetId: result.asset.id,
                    sessionId: params.sessionId,
                    accountId: body.accountId,
                    actorId: body.uploadedBy,
                    sizeBytes: result.asset.sizeBytes || 0,
                    checksumSHA256: result.asset.checksumSHA256 || '',
                });
            }

            return {
                success: true,
                data: result.asset,
            };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error committing upload:`, error);
            set.status = 500;
            return { success: false, error: 'Commit failed' };
        }
    }, {
        params: t.Object({
            sessionId: t.String(),
        }),
        body: t.Object({
            accountId: t.String(),
            workspaceId: t.Optional(t.String()),
            name: t.Optional(t.String()),
            scope: t.Optional(t.String()),
            dedupPolicy: t.Optional(t.String()),
            uploadedBy: t.Optional(t.String()),
            metadata: t.Optional(t.Record(t.String(), t.Unknown())),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Commit upload',
            description: 'Commit upload session and create asset',
        },
    })

    /**
     * GET /assets/upload/:sessionId/progress
     * Get upload progress
     */
    .get('/upload/:sessionId/progress', async ({ params, set }) => {
        try {
            const progress = await assetGatewayService.getProgress(params.sessionId);
            
            if (!progress) {
                set.status = 404;
                return { success: false, error: 'Session not found' };
            }

            return { success: true, data: progress };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error getting progress:`, error);
            set.status = 500;
            return { success: false, error: 'Failed to get progress' };
        }
    }, {
        params: t.Object({
            sessionId: t.String(),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Get upload progress',
        },
    })

    /**
     * DELETE /assets/upload/:sessionId
     * Cancel upload session
     */
    .delete('/upload/:sessionId', async ({ params }) => {
        try {
            await assetGatewayService.cancelSession(params.sessionId);
            return { success: true };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error cancelling session:`, error);
            return { success: false, error: 'Failed to cancel session' };
        }
    }, {
        params: t.Object({
            sessionId: t.String(),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Cancel upload session',
        },
    })

    // ════════════════════════════════════════════════════════════════════════
    // Asset CRUD
    // ════════════════════════════════════════════════════════════════════════

    /**
     * GET /assets/:id
     * Get asset metadata
     */
    .get('/:id', async ({ params, set }) => {
        try {
            const asset = await assetRegistryService.getById(params.id);
            
            if (!asset) {
                set.status = 404;
                return { success: false, error: 'Asset not found' };
            }

            return { success: true, data: asset };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error getting asset:`, error);
            set.status = 500;
            return { success: false, error: 'Failed to get asset' };
        }
    }, {
        params: t.Object({
            id: t.String(),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Get asset metadata',
        },
    })

    /**
     * POST /assets/:id/sign
     * Generate signed URL for asset access
     */
    .post('/:id/sign', async ({ params, body, set }) => {
        try {
            console.log(`${DEBUG_PREFIX} POST /${params.id}/sign`);

            const result = await assetPolicyService.signAsset({
                assetId: params.id,
                actorId: body.actorId,
                actorType: body.actorType as any || 'user',
                context: {
                    action: body.action as any || 'download',
                    channel: body.channel as any || 'web',
                },
                disposition: body.disposition as any,
            });

            if (!result) {
                set.status = 403;
                return { success: false, error: 'Access denied' };
            }

            // Log audit
            const asset = await assetRegistryService.getById(params.id);
            if (asset) {
                await assetAuditService.logUrlSigned({
                    assetId: params.id,
                    actorId: body.actorId,
                    actorType: body.actorType as any || 'user',
                    context: `${body.action || 'download'}:${body.channel || 'web'}`,
                    ttlSeconds: result.ttlSeconds,
                    accountId: asset.accountId,
                });
            }

            return {
                success: true,
                data: {
                    url: result.url,
                    expiresAt: result.expiresAt,
                    ttlSeconds: result.ttlSeconds,
                },
            };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error signing asset:`, error);
            set.status = 500;
            return { success: false, error: 'Failed to sign asset' };
        }
    }, {
        params: t.Object({
            id: t.String(),
        }),
        body: t.Object({
            actorId: t.String(),
            actorType: t.Optional(t.String()),
            action: t.Optional(t.String()),
            channel: t.Optional(t.String()),
            disposition: t.Optional(t.String()),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Generate signed URL',
            description: 'Generate a signed URL for temporary asset access',
        },
    })

    /**
     * POST /assets/search
     * Search assets
     */
    .post('/search', async ({ body, set }) => {
        try {
            const assets = await assetRegistryService.search({
                accountId: body.accountId,
                workspaceId: body.workspaceId,
                scope: body.scope as any,
                status: body.status as any,
                mimeType: body.mimeType,
                search: body.search,
                limit: body.limit,
                offset: body.offset,
            });

            return { success: true, data: assets };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error searching assets:`, error);
            set.status = 500;
            return { success: false, error: 'Search failed' };
        }
    }, {
        body: t.Object({
            accountId: t.String(),
            workspaceId: t.Optional(t.String()),
            scope: t.Optional(t.String()),
            status: t.Optional(t.String()),
            mimeType: t.Optional(t.String()),
            search: t.Optional(t.String()),
            limit: t.Optional(t.Number()),
            offset: t.Optional(t.Number()),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Search assets',
        },
    })

    /**
     * DELETE /assets/:id
     * Delete asset (soft delete)
     */
    .delete('/:id', async ({ params, body, set }) => {
        try {
            const asset = await assetRegistryService.getById(params.id);
            
            if (!asset) {
                set.status = 404;
                return { success: false, error: 'Asset not found' };
            }

            await assetRegistryService.delete(params.id);

            // Log audit
            await assetAuditService.logDeleted({
                assetId: params.id,
                accountId: asset.accountId,
                actorId: body?.actorId,
                reason: body?.reason,
            });

            return { success: true };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error deleting asset:`, error);
            set.status = 500;
            return { success: false, error: 'Delete failed' };
        }
    }, {
        params: t.Object({
            id: t.String(),
        }),
        body: t.Optional(t.Object({
            actorId: t.Optional(t.String()),
            reason: t.Optional(t.String()),
        })),
        detail: {
            tags: ['Assets'],
            summary: 'Delete asset',
            description: 'Soft delete an asset',
        },
    })

    /**
     * GET /assets/:id/versions
     * Get asset versions
     */
    .get('/:id/versions', async ({ params, set }) => {
        try {
            const versions = await assetRegistryService.getVersions(params.id);
            return { success: true, data: versions };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error getting versions:`, error);
            set.status = 500;
            return { success: false, error: 'Failed to get versions' };
        }
    }, {
        params: t.Object({
            id: t.String(),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Get asset versions',
        },
    })

    // ════════════════════════════════════════════════════════════════════════
    // Debug & Monitoring
    // ════════════════════════════════════════════════════════════════════════

    /**
     * GET /assets/debug/logs
     * Get asset audit logs for monitoring
     */
    .get('/debug/logs', async ({ query }) => {
        try {
            const logs = await assetAuditService.queryEvents({
                accountId: query.accountId,
                assetId: query.assetId,
                action: query.action as any,
                limit: query.limit ? parseInt(query.limit) : 100,
            });

            return {
                success: true,
                data: logs.map(log => ({
                    id: log.id,
                    timestamp: log.timestamp,
                    action: log.action,
                    assetId: log.assetId,
                    sessionId: log.sessionId,
                    actorId: log.actorId,
                    actorType: log.actorType,
                    context: log.context,
                    accountId: log.accountId,
                    success: log.success,
                    errorMessage: log.errorMessage,
                    metadata: log.metadata ? JSON.parse(log.metadata) : null,
                })),
            };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error getting logs:`, error);
            return { success: false, error: 'Failed to get logs' };
        }
    }, {
        query: t.Object({
            accountId: t.Optional(t.String()),
            assetId: t.Optional(t.String()),
            action: t.Optional(t.String()),
            limit: t.Optional(t.String()),
        }),
        detail: {
            tags: ['Assets', 'Debug'],
            summary: 'Get asset audit logs',
            description: 'Get audit logs for asset monitoring panel',
        },
    })

    /**
     * GET /assets/debug/stats/:accountId
     * Get asset statistics for an account
     */
    .get('/debug/stats/:accountId', async ({ params }) => {
        try {
            const stats = await assetRegistryService.getAccountStats(params.accountId);
            return { success: true, data: stats };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error getting stats:`, error);
            return { success: false, error: 'Failed to get stats' };
        }
    }, {
        params: t.Object({
            accountId: t.String(),
        }),
        detail: {
            tags: ['Assets', 'Debug'],
            summary: 'Get account asset statistics',
        },
    });
