/**
 * Asset Registry Service (ARS)
 * 
 * Servicio central de registro de assets.
 * Gestiona CRUD, estados, versionado y deduplicación controlada.
 */

import { db } from '@fluxcore/db';
import {
    assets,
    type Asset,
    type NewAsset,
    type CreateAssetParams,
    type AssetSearchParams,
    type AssetStatus,
    type AssetScope,
    type DedupPolicy
} from '@fluxcore/db';
import { eq, and, desc, ilike, sql } from 'drizzle-orm';
import { getStorageAdapter, generateStorageKey } from './storage';
import { assetGatewayService } from './asset-gateway.service';

const DEBUG_PREFIX = '[AssetRegistry]';
const DEFAULT_RETENTION_DAYS = 30;

export interface CreateAssetFromUploadParams {
    sessionId: string;
    accountId: string;
    workspaceId?: string;
    name?: string;
    scope?: AssetScope;
    dedupPolicy?: DedupPolicy;
    uploadedBy?: string;
    metadata?: Record<string, unknown>;
}

export interface UpdateAssetParams {
    name?: string;
    metadata?: Record<string, unknown>;
    status?: AssetStatus;
}

export class AssetRegistryService {
    /**
     * Crear asset desde una sesión de upload completada
     */
    async createFromUpload(params: CreateAssetFromUploadParams): Promise<{ success: boolean; asset?: Asset; error?: string }> {
        const { sessionId, accountId, workspaceId, name, scope, dedupPolicy, uploadedBy, metadata } = params;

        // Commit upload
        const commitResult = await assetGatewayService.commitUpload(sessionId);
        if (!commitResult.success || !commitResult.data) {
            return { success: false, error: commitResult.error };
        }

        const { storageKey: tempStorageKey, checksumSHA256, sizeBytes } = commitResult.data;

        // Verificar deduplicación
        const policy = dedupPolicy || 'intra_account';
        if (policy !== 'none') {
            const existing = await this.findByChecksum(accountId, checksumSHA256, workspaceId, policy);
            if (existing) {
                console.log(`${DEBUG_PREFIX} Dedup applied: existing asset ${existing.id}`);

                // Limpiar archivo temporal
                const storage = getStorageAdapter();
                try {
                    await storage.delete(tempStorageKey);
                } catch {
                    // Ignorar
                }

                // Vincular sesión al asset existente
                await assetGatewayService.linkAssetToSession(sessionId, existing.id);

                return { success: true, asset: existing };
            }
        }

        // Obtener info de la sesión
        const session = await assetGatewayService.getSession(sessionId);
        const fileName = name || session?.fileName || 'unnamed';
        const mimeType = session?.mimeType || 'application/octet-stream';

        // Crear asset
        const [asset] = await db.insert(assets).values({
            accountId,
            workspaceId,
            name: fileName,
            originalName: session?.fileName,
            mimeType,
            sizeBytes,
            checksumSHA256,
            storageKey: tempStorageKey, // Mantener en ubicación temporal por ahora
            storageProvider: getStorageAdapter().provider,
            scope: scope || 'message_attachment',
            dedupPolicy: policy,
            status: 'pending', // Será 'ready' después de validación
            uploadedBy,
            metadata: metadata ? JSON.stringify(metadata) : null,
        }).returning();

        console.log(`${DEBUG_PREFIX} Asset created: ${asset.id}, status=pending`);

        // Vincular sesión al asset
        await assetGatewayService.linkAssetToSession(sessionId, asset.id);

        // Mover a ubicación final
        const finalStorageKey = generateStorageKey(accountId, asset.id, 1);
        const storage = getStorageAdapter();

        try {
            await storage.move(tempStorageKey, finalStorageKey);

            await db.update(assets)
                .set({ storageKey: finalStorageKey, updatedAt: new Date() })
                .where(eq(assets.id, asset.id));

            console.log(`${DEBUG_PREFIX} Asset moved to final location: ${finalStorageKey}`);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Failed to move asset:`, error);
            // El asset sigue siendo válido en ubicación temporal
        }

        // Marcar como ready (en producción, esto sería después de validación antivirus)
        await this.updateStatus(asset.id, 'ready');

        const updatedAsset = await this.getById(asset.id);
        return { success: true, asset: updatedAsset! };
    }

    /**
     * Crear asset directamente (sin sesión de upload)
     */
    async create(params: CreateAssetParams): Promise<Asset> {
        const [asset] = await db.insert(assets).values({
            accountId: params.accountId,
            workspaceId: params.workspaceId,
            name: params.name,
            originalName: params.originalName,
            mimeType: params.mimeType || 'application/octet-stream',
            sizeBytes: params.sizeBytes || 0,
            storageKey: params.storageKey,
            storageProvider: params.storageProvider || 'local',
            scope: params.scope || 'message_attachment',
            dedupPolicy: params.dedupPolicy || 'intra_account',
            status: 'ready',
            uploadedBy: params.uploadedBy,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        }).returning();

        console.log(`${DEBUG_PREFIX} Asset created directly: ${asset.id}`);

        return asset;
    }

    /**
     * Obtener asset por ID
     */
    async getById(assetId: string): Promise<Asset | null> {
        const [asset] = await db.select()
            .from(assets)
            .where(eq(assets.id, assetId))
            .limit(1);

        return asset || null;
    }

    /**
     * Buscar assets
     */
    async search(params: AssetSearchParams): Promise<Asset[]> {
        const conditions = [eq(assets.accountId, params.accountId)];

        if (params.workspaceId) {
            conditions.push(eq(assets.workspaceId, params.workspaceId));
        }

        if (params.scope) {
            conditions.push(eq(assets.scope, params.scope));
        }

        if (params.status) {
            conditions.push(eq(assets.status, params.status));
        }

        if (params.mimeType) {
            conditions.push(ilike(assets.mimeType, `${params.mimeType}%`));
        }

        if (params.search) {
            conditions.push(ilike(assets.name, `%${params.search}%`));
        }

        const result = await db.select()
            .from(assets)
            .where(and(...conditions))
            .orderBy(desc(assets.createdAt))
            .limit(params.limit || 50)
            .offset(params.offset || 0);

        return result;
    }

    /**
     * Buscar por checksum para deduplicación
     */
    async findByChecksum(
        accountId: string,
        checksumSHA256: string,
        workspaceId?: string,
        policy: DedupPolicy = 'intra_account'
    ): Promise<Asset | null> {
        const conditions = [
            eq(assets.checksumSHA256, checksumSHA256),
            eq(assets.status, 'ready'),
        ];

        if (policy === 'intra_account') {
            conditions.push(eq(assets.accountId, accountId));
        } else if (policy === 'intra_workspace' && workspaceId) {
            conditions.push(eq(assets.workspaceId, workspaceId));
        }

        const [existing] = await db.select()
            .from(assets)
            .where(and(...conditions))
            .limit(1);

        return existing || null;
    }

    /**
     * Actualizar asset
     */
    async update(assetId: string, params: UpdateAssetParams): Promise<Asset | null> {
        const updates: Partial<NewAsset> = {
            updatedAt: new Date(),
        };

        if (params.name !== undefined) {
            updates.name = params.name;
        }

        if (params.metadata !== undefined) {
            updates.metadata = JSON.stringify(params.metadata);
        }

        if (params.status !== undefined) {
            updates.status = params.status;
        }

        const [updated] = await db.update(assets)
            .set(updates)
            .where(eq(assets.id, assetId))
            .returning();

        if (updated) {
            console.log(`${DEBUG_PREFIX} Asset updated: ${assetId}`);
        }

        return updated || null;
    }

    /**
     * Actualizar estado del asset
     */
    async updateStatus(assetId: string, status: AssetStatus): Promise<void> {
        const asset = await this.getById(assetId);
        const previousStatus = asset?.status;

        await db.update(assets)
            .set({ status, updatedAt: new Date() })
            .where(eq(assets.id, assetId));

        console.log(`${DEBUG_PREFIX} Asset state changed: ${assetId}, ${previousStatus} -> ${status}`);
    }

    /**
     * Eliminar asset (soft delete)
     */
    async delete(assetId: string): Promise<void> {
        const hardDeleteAt = new Date();
        hardDeleteAt.setDate(hardDeleteAt.getDate() + DEFAULT_RETENTION_DAYS);

        await db.update(assets)
            .set({
                status: 'deleted',
                hardDeleteAt,
                updatedAt: new Date()
            })
            .where(eq(assets.id, assetId));

        console.log(`${DEBUG_PREFIX} Asset marked for deletion (soft): ${assetId}, hardDeleteAt: ${hardDeleteAt.toISOString()}`);
    }

    /**
     * Archivar asset
     */
    async archive(assetId: string): Promise<void> {
        await this.updateStatus(assetId, 'archived');
        console.log(`${DEBUG_PREFIX} Asset archived: ${assetId}`);
    }

    /**
     * Restaurar asset archivado
     */
    async restore(assetId: string): Promise<void> {
        await this.updateStatus(assetId, 'ready');
        console.log(`${DEBUG_PREFIX} Asset restored: ${assetId}`);
    }

    /**
     * Purgar asset (hard delete)
     */
    async purge(assetId: string): Promise<void> {
        const asset = await this.getById(assetId);
        if (!asset) return;

        // Eliminar archivo del storage
        const storage = getStorageAdapter();
        try {
            await storage.delete(asset.storageKey);
            console.log(`${DEBUG_PREFIX} Asset file purged: ${asset.storageKey}`);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Failed to purge file:`, error);
        }

        // Eliminar registro
        await db.delete(assets).where(eq(assets.id, assetId));
        console.log(`${DEBUG_PREFIX} Asset purged: ${assetId}`);
    }

    /**
     * Crear nueva versión de un asset
     */
    async createVersion(assetId: string, data: Buffer, mimeType?: string): Promise<Asset | null> {
        const original = await this.getById(assetId);
        if (!original) return null;

        const newVersion = (original.version || 1) + 1;
        const storage = getStorageAdapter();
        const storageKey = generateStorageKey(original.accountId, assetId, newVersion);

        // Subir nueva versión
        await storage.upload(storageKey, data, { contentType: mimeType || original.mimeType || undefined });

        // Actualizar asset
        const [updated] = await db.update(assets)
            .set({
                version: newVersion,
                storageKey,
                sizeBytes: data.length,
                mimeType: mimeType || original.mimeType,
                updatedAt: new Date(),
            })
            .where(eq(assets.id, assetId))
            .returning();

        console.log(`${DEBUG_PREFIX} Asset version created: ${assetId}, version=${newVersion}`);

        return updated || null;
    }

    /**
     * Obtener todas las versiones de un asset
     */
    async getVersions(assetId: string): Promise<{ version: number; storageKey: string; createdAt: Date }[]> {
        const asset = await this.getById(assetId);
        if (!asset) return [];

        const storage = getStorageAdapter();
        const prefix = `${asset.accountId}/${assetId}/`;
        const files = await storage.list({ prefix });

        const versions: { version: number; storageKey: string; createdAt: Date }[] = [];

        for (const key of files.keys) {
            const versionStr = key.split('/').pop();
            const version = parseInt(versionStr || '1', 10);
            const meta = await storage.getMetadata(key);

            versions.push({
                version,
                storageKey: key,
                createdAt: meta?.lastModified || new Date(),
            });
        }

        return versions.sort((a, b) => b.version - a.version);
    }

    /**
     * Archivar todos los assets de una cuenta (para account deletion)
     */
    async archiveAccountAssets(accountId: string): Promise<number> {
        const result = await db.update(assets)
            .set({ status: 'archived', updatedAt: new Date() })
            .where(and(
                eq(assets.accountId, accountId),
                eq(assets.status, 'ready')
            ));

        console.log(`${DEBUG_PREFIX} Account assets archived: ${accountId}`);
        return 0; // Drizzle no retorna count fácilmente
    }

    /**
     * Purgar todos los assets de una cuenta
     */
    async purgeAccountAssets(accountId: string): Promise<number> {
        const accountAssets = await db.select()
            .from(assets)
            .where(eq(assets.accountId, accountId));

        const storage = getStorageAdapter();
        let purged = 0;

        for (const asset of accountAssets) {
            try {
                await storage.delete(asset.storageKey);
                await db.delete(assets).where(eq(assets.id, asset.id));
                purged++;
            } catch (error) {
                console.error(`${DEBUG_PREFIX} Failed to purge asset ${asset.id}:`, error);
            }
        }

        console.log(`${DEBUG_PREFIX} Account assets purged: ${accountId}, count=${purged}`);
        return purged;
    }

    /**
     * Obtener estadísticas de assets por cuenta
     */
    async getAccountStats(accountId: string): Promise<{
        totalAssets: number;
        totalSizeBytes: number;
        byStatus: Record<string, number>;
        byScope: Record<string, number>;
    }> {
        const accountAssets = await db.select()
            .from(assets)
            .where(eq(assets.accountId, accountId));

        const stats = {
            totalAssets: accountAssets.length,
            totalSizeBytes: 0,
            byStatus: {} as Record<string, number>,
            byScope: {} as Record<string, number>,
        };

        for (const asset of accountAssets) {
            stats.totalSizeBytes += asset.sizeBytes || 0;

            const status = asset.status || 'unknown';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

            const scope = asset.scope || 'unknown';
            stats.byScope[scope] = (stats.byScope[scope] || 0) + 1;
        }

        return stats;
    }

    /**
     * Obtener assets marcados para eliminación que ya cumplieron su periodo de retención
     */
    async getExpiredAssetsForPurge(): Promise<Asset[]> {
        const now = new Date();
        return db.select()
            .from(assets)
            .where(and(
                eq(assets.status, 'deleted'),
                sql`${assets.hardDeleteAt} <= ${now}`
            ));
    }
}

// Singleton
export const assetRegistryService = new AssetRegistryService();
