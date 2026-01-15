/**
 * PermissionService - Servicio de permisos para assets compartidos
 * 
 * Gestiona el acceso a Vector Stores, Instructions y Tools entre cuentas.
 * Implementa caché, validación y CRUD de permisos.
 * 
 * RAG-002: Sistema de Assets Centralizados
 */

import { db } from '@fluxcore/db';
import {
    fluxcoreAssetPermissions,
    fluxcoreVectorStores,
    fluxcoreInstructions,
    fluxcoreToolDefinitions,
    type FluxcoreAssetPermission,
    type NewFluxcoreAssetPermission,
    type PermissionLevel,
    type AssetType,
    type AssetAccessInfo,
    type ShareAssetRequest,
    type RevokeAssetRequest,
    type AccessibleAssetsFilter,
} from '@fluxcore/db';
import { eq, and, or, isNull, gt, sql } from 'drizzle-orm';

/**
 * Cache simple en memoria para permisos
 * En producción, usar Redis para cache distribuido
 */
interface PermissionCache {
    key: string;
    hasAccess: boolean;
    permissionLevel: PermissionLevel | null;
    expiresAt: number;
}

const permissionCache = new Map<string, PermissionCache>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function getCacheKey(accountId: string, assetType: AssetType, assetId: string): string {
    return `${accountId}:${assetType}:${assetId}`;
}

function invalidateCache(assetType: AssetType, assetId: string): void {
    // Invalidar todas las entradas para este asset
    for (const key of permissionCache.keys()) {
        if (key.includes(`:${assetType}:${assetId}`)) {
            permissionCache.delete(key);
        }
    }
}

export class PermissionService {
    /**
     * Verifica si una cuenta tiene acceso a un asset
     */
    async checkAccess(
        accountId: string,
        assetType: AssetType,
        assetId: string,
        requiredLevel: PermissionLevel = 'read'
    ): Promise<{ hasAccess: boolean; permissionLevel: PermissionLevel | null; source?: string }> {
        // 1. Verificar cache
        const cacheKey = getCacheKey(accountId, assetType, assetId);
        const cached = permissionCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return {
                hasAccess: cached.hasAccess && this.isLevelSufficient(cached.permissionLevel, requiredLevel),
                permissionLevel: cached.permissionLevel
            };
        }

        // 2. Verificar ownership
        const isOwner = await this.isOwner(accountId, assetType, assetId);
        if (isOwner) {
            permissionCache.set(cacheKey, {
                key: cacheKey,
                hasAccess: true,
                permissionLevel: 'admin',
                expiresAt: Date.now() + CACHE_TTL_MS,
            });
            return { hasAccess: true, permissionLevel: 'admin', source: 'owned' };
        }

        // 3. Verificar visibilidad pública
        const isPublic = await this.isPublic(assetType, assetId);
        if (isPublic) {
            permissionCache.set(cacheKey, {
                key: cacheKey,
                hasAccess: true,
                permissionLevel: 'read',
                expiresAt: Date.now() + CACHE_TTL_MS,
            });
            return { hasAccess: requiredLevel === 'read', permissionLevel: 'read', source: 'public' };
        }

        // 4. Verificar permisos explícitos
        const permission = await this.getPermission(accountId, assetType, assetId);
        if (permission) {
            const hasAccess = this.isLevelSufficient(permission.permissionLevel, requiredLevel);
            permissionCache.set(cacheKey, {
                key: cacheKey,
                hasAccess,
                permissionLevel: permission.permissionLevel,
                expiresAt: Date.now() + CACHE_TTL_MS,
            });
            return { hasAccess, permissionLevel: permission.permissionLevel, source: permission.source };
        }

        // 5. Sin acceso
        permissionCache.set(cacheKey, {
            key: cacheKey,
            hasAccess: false,
            permissionLevel: null,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return { hasAccess: false, permissionLevel: null };
    }

    /**
     * Comparte un asset con otra cuenta
     */
    async shareAsset(
        request: ShareAssetRequest,
        grantedByAccountId: string
    ): Promise<FluxcoreAssetPermission> {
        // Verificar que el que comparte es owner o admin
        const canShare = await this.checkAccess(
            grantedByAccountId,
            request.assetType,
            request.assetId,
            'admin'
        );
        if (!canShare.hasAccess) {
            throw new Error('No tienes permiso para compartir este asset');
        }

        // Construir el nuevo permiso
        const newPermission: NewFluxcoreAssetPermission = {
            granteeAccountId: request.granteeAccountId,
            permissionLevel: request.permissionLevel,
            source: 'shared',
            grantedByAccountId,
            expiresAt: request.expiresAt,
            notes: request.notes,
        };

        // Asignar el ID del asset según el tipo
        switch (request.assetType) {
            case 'vector_store':
                newPermission.vectorStoreId = request.assetId;
                break;
            case 'instruction':
                newPermission.instructionId = request.assetId;
                break;
            case 'tool':
                newPermission.toolDefinitionId = request.assetId;
                break;
        }

        // Insertar o actualizar (upsert)
        const [permission] = await db
            .insert(fluxcoreAssetPermissions)
            .values(newPermission)
            .onConflictDoUpdate({
                target: [
                    request.assetType === 'vector_store' ? fluxcoreAssetPermissions.vectorStoreId :
                        request.assetType === 'instruction' ? fluxcoreAssetPermissions.instructionId :
                            fluxcoreAssetPermissions.toolDefinitionId,
                    fluxcoreAssetPermissions.granteeAccountId
                ],
                set: {
                    permissionLevel: request.permissionLevel,
                    expiresAt: request.expiresAt,
                    notes: request.notes,
                    updatedAt: new Date(),
                },
            })
            .returning();

        // Invalidar cache
        invalidateCache(request.assetType, request.assetId);

        return permission;
    }

    /**
     * Revoca acceso a un asset
     */
    async revokeAccess(
        request: RevokeAssetRequest,
        revokedByAccountId: string
    ): Promise<boolean> {
        // Verificar que el que revoca es owner o admin
        const canRevoke = await this.checkAccess(
            revokedByAccountId,
            request.assetType,
            request.assetId,
            'admin'
        );
        if (!canRevoke.hasAccess) {
            throw new Error('No tienes permiso para revocar acceso a este asset');
        }

        // Construir condición según tipo de asset
        let assetCondition;
        switch (request.assetType) {
            case 'vector_store':
                assetCondition = eq(fluxcoreAssetPermissions.vectorStoreId, request.assetId);
                break;
            case 'instruction':
                assetCondition = eq(fluxcoreAssetPermissions.instructionId, request.assetId);
                break;
            case 'tool':
                assetCondition = eq(fluxcoreAssetPermissions.toolDefinitionId, request.assetId);
                break;
        }

        const result = await db
            .delete(fluxcoreAssetPermissions)
            .where(and(
                assetCondition,
                eq(fluxcoreAssetPermissions.granteeAccountId, request.granteeAccountId)
            ))
            .returning();

        // Invalidar cache
        invalidateCache(request.assetType, request.assetId);

        return result.length > 0;
    }

    /**
     * Lista todos los permisos de un asset
     */
    async listAssetPermissions(
        assetType: AssetType,
        assetId: string
    ): Promise<FluxcoreAssetPermission[]> {
        let condition;
        switch (assetType) {
            case 'vector_store':
                condition = eq(fluxcoreAssetPermissions.vectorStoreId, assetId);
                break;
            case 'instruction':
                condition = eq(fluxcoreAssetPermissions.instructionId, assetId);
                break;
            case 'tool':
                condition = eq(fluxcoreAssetPermissions.toolDefinitionId, assetId);
                break;
        }

        return db
            .select()
            .from(fluxcoreAssetPermissions)
            .where(condition);
    }

    /**
     * Lista todos los assets accesibles por una cuenta
     */
    async listAccessibleAssets(
        filter: AccessibleAssetsFilter
    ): Promise<AssetAccessInfo[]> {
        const results: AssetAccessInfo[] = [];

        // Si no se especifica tipo, buscar todos
        const assetTypes: AssetType[] = filter.assetType
            ? [filter.assetType]
            : ['vector_store', 'instruction', 'tool'];

        for (const assetType of assetTypes) {
            // Assets propios
            if (!filter.accessType || filter.accessType === 'all' || filter.accessType === 'owned') {
                const owned = await this.getOwnedAssets(filter.accountId, assetType);
                results.push(...owned);
            }

            // Assets compartidos
            if (!filter.accessType || filter.accessType === 'all' || filter.accessType === 'shared') {
                const shared = await this.getSharedAssets(filter.accountId, assetType, filter.includeExpired);
                results.push(...shared);
            }
        }

        return results;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // Métodos privados
    // ════════════════════════════════════════════════════════════════════════════

    private async isOwner(accountId: string, assetType: AssetType, assetId: string): Promise<boolean> {
        let result;
        switch (assetType) {
            case 'vector_store':
                result = await db
                    .select({ id: fluxcoreVectorStores.id })
                    .from(fluxcoreVectorStores)
                    .where(and(
                        eq(fluxcoreVectorStores.id, assetId),
                        eq(fluxcoreVectorStores.accountId, accountId)
                    ))
                    .limit(1);
                break;
            case 'instruction':
                result = await db
                    .select({ id: fluxcoreInstructions.id })
                    .from(fluxcoreInstructions)
                    .where(and(
                        eq(fluxcoreInstructions.id, assetId),
                        eq(fluxcoreInstructions.accountId, accountId)
                    ))
                    .limit(1);
                break;
            case 'tool':
                // Tools pueden no tener accountId (globales)
                result = await db
                    .select({ id: fluxcoreToolDefinitions.id })
                    .from(fluxcoreToolDefinitions)
                    .where(eq(fluxcoreToolDefinitions.id, assetId))
                    .limit(1);
                // Para tools, verificar de otra manera si es necesario
                break;
        }
        return result && result.length > 0;
    }

    private async isPublic(assetType: AssetType, assetId: string): Promise<boolean> {
        let result;
        switch (assetType) {
            case 'vector_store':
                result = await db
                    .select({ visibility: fluxcoreVectorStores.visibility })
                    .from(fluxcoreVectorStores)
                    .where(eq(fluxcoreVectorStores.id, assetId))
                    .limit(1);
                return result[0]?.visibility === 'public';
            case 'instruction':
                result = await db
                    .select({ visibility: fluxcoreInstructions.visibility })
                    .from(fluxcoreInstructions)
                    .where(eq(fluxcoreInstructions.id, assetId))
                    .limit(1);
                return result[0]?.visibility === 'public';
            case 'tool':
                result = await db
                    .select({ visibility: fluxcoreToolDefinitions.visibility })
                    .from(fluxcoreToolDefinitions)
                    .where(eq(fluxcoreToolDefinitions.id, assetId))
                    .limit(1);
                return result[0]?.visibility === 'public';
        }
        return false;
    }

    private async getPermission(
        accountId: string,
        assetType: AssetType,
        assetId: string
    ): Promise<FluxcoreAssetPermission | null> {
        let condition;
        switch (assetType) {
            case 'vector_store':
                condition = eq(fluxcoreAssetPermissions.vectorStoreId, assetId);
                break;
            case 'instruction':
                condition = eq(fluxcoreAssetPermissions.instructionId, assetId);
                break;
            case 'tool':
                condition = eq(fluxcoreAssetPermissions.toolDefinitionId, assetId);
                break;
        }

        const result = await db
            .select()
            .from(fluxcoreAssetPermissions)
            .where(and(
                condition,
                eq(fluxcoreAssetPermissions.granteeAccountId, accountId),
                or(
                    isNull(fluxcoreAssetPermissions.expiresAt),
                    gt(fluxcoreAssetPermissions.expiresAt, new Date())
                )
            ))
            .limit(1);

        return result[0] || null;
    }

    private isLevelSufficient(
        hasLevel: PermissionLevel | null,
        requiredLevel: PermissionLevel
    ): boolean {
        if (!hasLevel) return false;

        const levels: Record<PermissionLevel, number> = {
            read: 1,
            write: 2,
            admin: 3,
        };

        return levels[hasLevel] >= levels[requiredLevel];
    }

    private async getOwnedAssets(accountId: string, assetType: AssetType): Promise<AssetAccessInfo[]> {
        let result;
        switch (assetType) {
            case 'vector_store':
                result = await db
                    .select({ id: fluxcoreVectorStores.id, name: fluxcoreVectorStores.name })
                    .from(fluxcoreVectorStores)
                    .where(eq(fluxcoreVectorStores.accountId, accountId));
                return result.map(r => ({
                    assetId: r.id,
                    assetType: 'vector_store' as AssetType,
                    assetName: r.name,
                    accessType: 'owned' as const,
                    permissionLevel: 'admin' as PermissionLevel,
                }));
            case 'instruction':
                result = await db
                    .select({ id: fluxcoreInstructions.id, name: fluxcoreInstructions.name })
                    .from(fluxcoreInstructions)
                    .where(eq(fluxcoreInstructions.accountId, accountId));
                return result.map(r => ({
                    assetId: r.id,
                    assetType: 'instruction' as AssetType,
                    assetName: r.name,
                    accessType: 'owned' as const,
                    permissionLevel: 'admin' as PermissionLevel,
                }));
            case 'tool':
                // Tools globales - todos pueden verlos
                return [];
        }
        return [];
    }

    private async getSharedAssets(
        accountId: string,
        assetType: AssetType,
        includeExpired = false
    ): Promise<AssetAccessInfo[]> {
        let condition;
        switch (assetType) {
            case 'vector_store':
                condition = sql`${fluxcoreAssetPermissions.vectorStoreId} IS NOT NULL`;
                break;
            case 'instruction':
                condition = sql`${fluxcoreAssetPermissions.instructionId} IS NOT NULL`;
                break;
            case 'tool':
                condition = sql`${fluxcoreAssetPermissions.toolDefinitionId} IS NOT NULL`;
                break;
        }

        const baseConditions = [
            eq(fluxcoreAssetPermissions.granteeAccountId, accountId),
            condition,
        ];

        if (!includeExpired) {
            baseConditions.push(
                or(
                    isNull(fluxcoreAssetPermissions.expiresAt),
                    gt(fluxcoreAssetPermissions.expiresAt, new Date())
                )!
            );
        }

        const permissions = await db
            .select()
            .from(fluxcoreAssetPermissions)
            .where(and(...baseConditions));

        // Enriquecer con nombres de assets
        const results: AssetAccessInfo[] = [];
        for (const perm of permissions) {
            let assetName = 'Unknown';
            let assetId: string | null = null;

            if (perm.vectorStoreId) {
                assetId = perm.vectorStoreId;
                const vs = await db
                    .select({ name: fluxcoreVectorStores.name })
                    .from(fluxcoreVectorStores)
                    .where(eq(fluxcoreVectorStores.id, perm.vectorStoreId))
                    .limit(1);
                assetName = vs[0]?.name || 'Vector Store';
            } else if (perm.instructionId) {
                assetId = perm.instructionId;
                const inst = await db
                    .select({ name: fluxcoreInstructions.name })
                    .from(fluxcoreInstructions)
                    .where(eq(fluxcoreInstructions.id, perm.instructionId))
                    .limit(1);
                assetName = inst[0]?.name || 'Instruction';
            } else if (perm.toolDefinitionId) {
                assetId = perm.toolDefinitionId;
                const tool = await db
                    .select({ name: fluxcoreToolDefinitions.name })
                    .from(fluxcoreToolDefinitions)
                    .where(eq(fluxcoreToolDefinitions.id, perm.toolDefinitionId))
                    .limit(1);
                assetName = tool[0]?.name || 'Tool';
            }

            if (assetId) {
                results.push({
                    assetId,
                    assetType,
                    assetName,
                    accessType: perm.source as 'shared' | 'marketplace' | 'public',
                    permissionLevel: perm.permissionLevel as PermissionLevel,
                    grantedAt: perm.grantedAt,
                    expiresAt: perm.expiresAt || undefined,
                });
            }
        }

        return results;
    }
}

// Singleton export
export const permissionService = new PermissionService();
