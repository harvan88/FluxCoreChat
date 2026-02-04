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
import { assetDeletionService } from '../services/asset-deletion.service';

const DEBUG_PREFIX = '[AssetsRoutes]';

export const assetsRoutes = new Elysia({ prefix: '/api/assets' })
    // ════════════════════════════════════════════════════════════════════════
    // Upload Session Management
    // ════════════════════════════════════════════════════════════════════════

    /**
     * POST /api/assets/upload-session
     * Crear sesión de upload
     */
    .post('/upload-session', async ({ body, query, set }) => {
        try {
            console.log(`${DEBUG_PREFIX} POST /upload-session`);

            const accountId = query.accountId || body.accountId;
            if (!accountId) {
                set.status = 400;
                return { success: false, error: 'accountId is required' };
            }

            const session = await assetGatewayService.createUploadSession({
                accountId,
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
                accountId,
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
            accountId: t.Optional(t.String()),
            uploadedBy: t.Optional(t.String()),
            maxSizeBytes: t.Optional(t.Number()),
            allowedMimeTypes: t.Optional(t.Array(t.String())),
            fileName: t.Optional(t.String()),
            mimeType: t.Optional(t.String()),
            totalBytes: t.Optional(t.Number()),
            ttlMinutes: t.Optional(t.Number()),
        }),
        query: t.Object({
            accountId: t.Optional(t.String()),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Create upload session',
            description: 'Creates a new upload session with TTL and limits',
        },
    })

    /**
     * PUT /api/assets/upload/:sessionId
     * Upload file data to session
     */
    .put('/upload/:sessionId', async ({ params, body, set }) => {
        try {
            console.log(`${DEBUG_PREFIX} PUT /upload/${params.sessionId}`);

            // Elysia con t.File() maneja el archivo correctamente
            const file = body.file as File;
            if (!file) {
                set.status = 400;
                return { success: false, error: 'No file provided' };
            }

            // Convertir File a Buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const result = await assetGatewayService.uploadComplete(
                params.sessionId,
                buffer,
                file.type
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
        body: t.Object({
            file: t.File(),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Upload file data',
            description: 'Upload file data to an active session',
        },
    })

    /**
     * POST /api/assets/upload/:sessionId/commit
     * Commit upload and create asset
     */
    .post('/upload/:sessionId/commit', async ({ params, body, query, set }) => {
        try {
            console.log(`${DEBUG_PREFIX} POST /upload/${params.sessionId}/commit`);
            console.log(`${DEBUG_PREFIX} Query:`, query);
            console.log(`${DEBUG_PREFIX} Body:`, body);

            const accountId = query.accountId || body?.accountId;
            if (!accountId) {
                console.log(`${DEBUG_PREFIX} ERROR: accountId is required`);
                set.status = 400;
                return { success: false, error: 'accountId is required' };
            }

            console.log(`${DEBUG_PREFIX} Creating asset from upload for account: ${accountId}`);

            const result = await assetRegistryService.createFromUpload({
                sessionId: params.sessionId,
                accountId,
                workspaceId: body?.workspaceId,
                name: body?.name,
                scope: body?.scope as any,
                dedupPolicy: body?.dedupPolicy as any,
                uploadedBy: body?.uploadedBy,
                metadata: body?.metadata,
            });

            if (!result.success || !result.asset) {
                console.log(`${DEBUG_PREFIX} ERROR:`, result.error);
                set.status = 400;
                return { success: false, error: result.error };
            }

            console.log(`${DEBUG_PREFIX} Asset created: ${result.asset.id}`);

            // Log audit
            const session = await assetGatewayService.getSession(params.sessionId);
            if (session) {
                await assetAuditService.logUploadCompleted({
                    assetId: result.asset.id,
                    sessionId: params.sessionId,
                    accountId,
                    actorId: body?.uploadedBy,
                    sizeBytes: result.asset.sizeBytes || 0,
                    checksumSHA256: result.asset.checksumSHA256 || '',
                });
            }

            return {
                success: true,
                data: {
                    assetId: result.asset.id,
                    name: result.asset.name,
                    mimeType: result.asset.mimeType,
                    sizeBytes: result.asset.sizeBytes,
                    status: result.asset.status,
                },
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
        query: t.Object({
            accountId: t.Optional(t.String()),
        }),
        body: t.Optional(t.Object({
            accountId: t.Optional(t.String()),
            workspaceId: t.Optional(t.String()),
            name: t.Optional(t.String()),
            scope: t.Optional(t.String()),
            dedupPolicy: t.Optional(t.String()),
            uploadedBy: t.Optional(t.String()),
            metadata: t.Optional(t.Record(t.String(), t.Unknown())),
        })),
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
     * GET /api/assets/:assetId
     * Get asset metadata
     */
    .get('/:assetId', async ({ params, set }) => {
        try {
            const asset = await assetRegistryService.getById(params.assetId);
            
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
            assetId: t.String(),
        }),
        detail: {
            tags: ['Assets'],
            summary: 'Get asset metadata',
        },
    })

    /**
     * POST /api/assets/:assetId/sign
     * Generate signed URL for asset access
     */
    .post('/:assetId/sign', async ({ params, body, set }) => {
        try {
            console.log(`${DEBUG_PREFIX} POST /${params.assetId}/sign`);

            const result = await assetPolicyService.signAsset({
                assetId: params.assetId,
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
            const asset = await assetRegistryService.getById(params.assetId);
            if (asset) {
                await assetAuditService.logUrlSigned({
                    assetId: params.assetId,
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
            assetId: t.String(),
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
     * DELETE /api/assets/:assetId
     * Delete asset (soft delete)
     */
    .delete('/:assetId', async ({ params, query, body, set }) => {
        try {
            const accountId = query.accountId || body?.accountId;
            if (!accountId) {
                set.status = 400;
                return { success: false, error: 'accountId is required' };
            }

            const asset = await assetRegistryService.getById(params.assetId);
            if (!asset) {
                set.status = 404;
                return { success: false, error: 'Asset not found' };
            }

            if (asset.accountId !== accountId) {
                set.status = 403;
                return { success: false, error: 'Asset does not belong to this account' };
            }

            const deleted = await assetDeletionService.deleteAsset(params.assetId, accountId, body?.actorId);
            if (!deleted) {
                set.status = 500;
                return { success: false, error: 'Could not delete asset' };
            }

            return { success: true };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error deleting asset:`, error);
            set.status = 500;
            return { success: false, error: 'Delete failed' };
        }
    }, {
        params: t.Object({
            assetId: t.String(),
        }),
        query: t.Object({
            accountId: t.Optional(t.String()),
        }),
        body: t.Optional(t.Object({
            accountId: t.Optional(t.String()),
            actorId: t.Optional(t.String()),
            reason: t.Optional(t.String()),
        })),
        detail: {
            tags: ['Assets'],
            summary: 'Delete asset',
            description: 'Delete an asset and its physical file',
        },
    })

    /**
     * GET /api/assets/:assetId/versions
     * Get asset versions
     */
    .get('/:assetId/versions', async ({ params, set }) => {
        try {
            const versions = await assetRegistryService.getVersions(params.assetId);
            return { success: true, data: versions };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Error getting versions:`, error);
            set.status = 500;
            return { success: false, error: 'Failed to get versions' };
        }
    }, {
        params: t.Object({
            assetId: t.String(),
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
