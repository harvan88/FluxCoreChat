/**
 * Permissions Routes
 * 
 * API REST para gestionar permisos de assets compartidos.
 * RAG-002: Sistema de Assets Centralizados
 * 
 * Endpoints:
 * - GET    /permissions/check           - Verificar acceso a un asset
 * - GET    /permissions/accessible      - Listar assets accesibles
 * - GET    /permissions/asset/:id       - Listar permisos de un asset
 * - POST   /permissions/share           - Compartir asset
 * - DELETE /permissions/revoke          - Revocar acceso
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { permissionService } from '../services/permission.service';
import type { AssetType, PermissionLevel } from '@fluxcore/db';

export const permissionsRoutes = new Elysia({ prefix: '/permissions' })
    .use(authMiddleware)

    // ════════════════════════════════════════════════════════════════════════════
    // GET /permissions/check - Verificar si tiene acceso a un asset
    // ════════════════════════════════════════════════════════════════════════════
    .get(
        '/check',
        async ({ user, query, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            try {
                const result = await permissionService.checkAccess(
                    query.accountId,
                    query.assetType as AssetType,
                    query.assetId,
                    (query.requiredLevel as PermissionLevel) || 'read'
                );

                return {
                    success: true,
                    data: {
                        hasAccess: result.hasAccess,
                        permissionLevel: result.permissionLevel,
                        source: result.source,
                    }
                };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            query: t.Object({
                accountId: t.String(),
                assetType: t.Union([
                    t.Literal('vector_store'),
                    t.Literal('instruction'),
                    t.Literal('tool'),
                ]),
                assetId: t.String(),
                requiredLevel: t.Optional(t.Union([
                    t.Literal('read'),
                    t.Literal('write'),
                    t.Literal('admin'),
                ])),
            }),
            detail: {
                tags: ['Permissions'],
                summary: 'Check if account has access to an asset',
            },
        }
    )

    // ════════════════════════════════════════════════════════════════════════════
    // GET /permissions/accessible - Listar assets accesibles para una cuenta
    // ════════════════════════════════════════════════════════════════════════════
    .get(
        '/accessible',
        async ({ user, query, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            try {
                const assets = await permissionService.listAccessibleAssets({
                    accountId: query.accountId,
                    assetType: query.assetType as AssetType | undefined,
                    accessType: query.accessType as any,
                    includeExpired: query.includeExpired === 'true',
                });

                return { success: true, data: assets };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            query: t.Object({
                accountId: t.String(),
                assetType: t.Optional(t.Union([
                    t.Literal('vector_store'),
                    t.Literal('instruction'),
                    t.Literal('tool'),
                ])),
                accessType: t.Optional(t.Union([
                    t.Literal('owned'),
                    t.Literal('shared'),
                    t.Literal('marketplace'),
                    t.Literal('public'),
                    t.Literal('all'),
                ])),
                includeExpired: t.Optional(t.String()),
            }),
            detail: {
                tags: ['Permissions'],
                summary: 'List all assets accessible by an account',
            },
        }
    )

    // ════════════════════════════════════════════════════════════════════════════
    // GET /permissions/asset/:assetType/:assetId - Listar permisos de un asset
    // ════════════════════════════════════════════════════════════════════════════
    .get(
        '/asset/:assetType/:assetId',
        async ({ user, params, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            try {
                const permissions = await permissionService.listAssetPermissions(
                    params.assetType as AssetType,
                    params.assetId
                );

                return { success: true, data: permissions };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            params: t.Object({
                assetType: t.Union([
                    t.Literal('vector_store'),
                    t.Literal('instruction'),
                    t.Literal('tool'),
                ]),
                assetId: t.String(),
            }),
            detail: {
                tags: ['Permissions'],
                summary: 'List all permissions for a specific asset',
            },
        }
    )

    // ════════════════════════════════════════════════════════════════════════════
    // POST /permissions/share - Compartir un asset con otra cuenta
    // ════════════════════════════════════════════════════════════════════════════
    .post(
        '/share',
        async ({ user, body, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            try {
                const permission = await permissionService.shareAsset(
                    {
                        assetId: body.assetId,
                        assetType: body.assetType as AssetType,
                        granteeAccountId: body.granteeAccountId,
                        permissionLevel: body.permissionLevel as PermissionLevel,
                        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
                        notes: body.notes,
                    },
                    body.grantedByAccountId
                );

                return { success: true, data: permission };
            } catch (error: any) {
                if (error.message.includes('No tienes permiso')) {
                    set.status = 403;
                } else {
                    set.status = 500;
                }
                return { success: false, message: error.message };
            }
        },
        {
            body: t.Object({
                assetId: t.String(),
                assetType: t.Union([
                    t.Literal('vector_store'),
                    t.Literal('instruction'),
                    t.Literal('tool'),
                ]),
                granteeAccountId: t.String(),
                grantedByAccountId: t.String(),
                permissionLevel: t.Union([
                    t.Literal('read'),
                    t.Literal('write'),
                    t.Literal('admin'),
                ]),
                expiresAt: t.Optional(t.String()),
                notes: t.Optional(t.String()),
            }),
            detail: {
                tags: ['Permissions'],
                summary: 'Share an asset with another account',
            },
        }
    )

    // ════════════════════════════════════════════════════════════════════════════
    // DELETE /permissions/revoke - Revocar acceso a un asset
    // ════════════════════════════════════════════════════════════════════════════
    .delete(
        '/revoke',
        async ({ user, body, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            try {
                const revoked = await permissionService.revokeAccess(
                    {
                        assetId: body.assetId,
                        assetType: body.assetType as AssetType,
                        granteeAccountId: body.granteeAccountId,
                    },
                    body.revokedByAccountId
                );

                return {
                    success: true,
                    data: { revoked },
                    message: revoked ? 'Permiso revocado exitosamente' : 'No se encontró el permiso'
                };
            } catch (error: any) {
                if (error.message.includes('No tienes permiso')) {
                    set.status = 403;
                } else {
                    set.status = 500;
                }
                return { success: false, message: error.message };
            }
        },
        {
            body: t.Object({
                assetId: t.String(),
                assetType: t.Union([
                    t.Literal('vector_store'),
                    t.Literal('instruction'),
                    t.Literal('tool'),
                ]),
                granteeAccountId: t.String(),
                revokedByAccountId: t.String(),
            }),
            detail: {
                tags: ['Permissions'],
                summary: 'Revoke access to an asset',
            },
        }
    );

export default permissionsRoutes;
