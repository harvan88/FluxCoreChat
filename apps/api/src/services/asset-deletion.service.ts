/**
 * Asset Deletion Service
 * 
 * Servicio para eliminar assets y sus archivos físicos del storage.
 * Integrado con el sistema de eliminación de cuentas.
 * 
 * Pertenece a CHAT CORE, no a FluxCore.
 */

import { db } from '@fluxcore/db';
import { 
    assets, 
    assetUploadSessions,
    assetAuditLogs,
    messageAssets,
    templateAssets,
    planAssets,
} from '@fluxcore/db';
import { eq, inArray } from 'drizzle-orm';
import { getStorageAdapter } from './storage/storage-adapter.factory';
import { AssetAuditService } from './asset-audit.service';

// ════════════════════════════════════════════════════════════════════════════
// Tipos
// ════════════════════════════════════════════════════════════════════════════

export interface AssetDeletionResult {
    accountId: string;
    assetsDeleted: number;
    storageFilesDeleted: number;
    storageErrors: string[];
    relationsDeleted: {
        messageAssets: number;
        templateAssets: number;
        planAssets: number;
    };
}

// ════════════════════════════════════════════════════════════════════════════
// Servicio
// ════════════════════════════════════════════════════════════════════════════

export class AssetDeletionService {
    private auditService: AssetAuditService;

    constructor() {
        this.auditService = new AssetAuditService();
    }

    /**
     * Eliminar todos los assets de una cuenta incluyendo archivos físicos
     */
    async purgeAccountAssets(accountId: string): Promise<AssetDeletionResult> {
        console.log(`[AssetDeletion] Starting purge for account ${accountId}`);

        const result: AssetDeletionResult = {
            accountId,
            assetsDeleted: 0,
            storageFilesDeleted: 0,
            storageErrors: [],
            relationsDeleted: {
                messageAssets: 0,
                templateAssets: 0,
                planAssets: 0,
            },
        };

        try {
            // 1. Obtener todos los assets de la cuenta
            const accountAssets = await db
                .select({ 
                    id: assets.id, 
                    storageKey: assets.storageKey,
                    name: assets.name,
                })
                .from(assets)
                .where(eq(assets.accountId, accountId));

            if (accountAssets.length === 0) {
                console.log(`[AssetDeletion] No assets found for account ${accountId}`);
                return result;
            }

            const assetIds = accountAssets.map(a => a.id);
            console.log(`[AssetDeletion] Found ${assetIds.length} assets to delete`);

            // 2. Eliminar relaciones
            const [msgAssets, tplAssets, plnAssets] = await Promise.all([
                db.delete(messageAssets)
                    .where(inArray(messageAssets.assetId, assetIds))
                    .returning({ assetId: messageAssets.assetId }),
                db.delete(templateAssets)
                    .where(inArray(templateAssets.assetId, assetIds))
                    .returning({ assetId: templateAssets.assetId }),
                db.delete(planAssets)
                    .where(inArray(planAssets.assetId, assetIds))
                    .returning({ assetId: planAssets.assetId }),
            ]);

            result.relationsDeleted.messageAssets = msgAssets.length;
            result.relationsDeleted.templateAssets = tplAssets.length;
            result.relationsDeleted.planAssets = plnAssets.length;

            console.log(`[AssetDeletion] Deleted relations: messages=${msgAssets.length}, templates=${tplAssets.length}, plans=${plnAssets.length}`);

            // 3. Eliminar archivos físicos del storage
            const storage = getStorageAdapter();
            for (const asset of accountAssets) {
                if (asset.storageKey) {
                    try {
                        await storage.delete(asset.storageKey);
                        result.storageFilesDeleted++;
                    } catch (err) {
                        const errorMsg = `Failed to delete storage file ${asset.storageKey}: ${err instanceof Error ? err.message : 'Unknown error'}`;
                        console.error(`[AssetDeletion] ${errorMsg}`);
                        result.storageErrors.push(errorMsg);
                    }
                }
            }

            console.log(`[AssetDeletion] Deleted ${result.storageFilesDeleted} storage files, ${result.storageErrors.length} errors`);

            // 4. Eliminar sesiones de upload pendientes
            const deletedSessions = await db
                .delete(assetUploadSessions)
                .where(eq(assetUploadSessions.accountId, accountId))
                .returning({ id: assetUploadSessions.id });

            // Limpiar archivos temporales de sesiones
            for (const session of deletedSessions) {
                try {
                    // Las sesiones tienen tempStorageKey que también debe limpiarse
                    const sessionData = await db
                        .select({ tempStorageKey: assetUploadSessions.tempStorageKey })
                        .from(assetUploadSessions)
                        .where(eq(assetUploadSessions.id, session.id))
                        .limit(1);
                    
                    if (sessionData[0]?.tempStorageKey) {
                        await storage.delete(sessionData[0].tempStorageKey);
                    }
                } catch {
                    // Ignorar errores de limpieza de temporales
                }
            }

            console.log(`[AssetDeletion] Deleted ${deletedSessions.length} upload sessions`);

            // 5. Registrar en audit log antes de eliminar
            await this.auditService.logEvent({
                assetId: 'account-purge',
                action: 'purged',
                actorType: 'system',
                accountId,
                metadata: {
                    assetsCount: assetIds.length,
                    reason: 'account_deletion',
                },
            });

            // 6. Eliminar audit logs de la cuenta
            await db.delete(assetAuditLogs).where(eq(assetAuditLogs.accountId, accountId));

            // 7. Eliminar los assets de la base de datos
            const deletedAssets = await db
                .delete(assets)
                .where(eq(assets.accountId, accountId))
                .returning({ id: assets.id });

            result.assetsDeleted = deletedAssets.length;

            console.log(`[AssetDeletion] Purge completed for account ${accountId}: ${result.assetsDeleted} assets deleted`);

            return result;
        } catch (error) {
            console.error(`[AssetDeletion] Error purging assets for account ${accountId}:`, error);
            throw error;
        }
    }

    /**
     * Eliminar un asset individual con su archivo físico
     */
    async deleteAsset(assetId: string, accountId: string, actorId?: string): Promise<boolean> {
        try {
            // Obtener asset
            const [asset] = await db
                .select({ storageKey: assets.storageKey, name: assets.name })
                .from(assets)
                .where(eq(assets.id, assetId))
                .limit(1);

            if (!asset) {
                return false;
            }

            // Eliminar relaciones
            await Promise.all([
                db.delete(messageAssets).where(eq(messageAssets.assetId, assetId)),
                db.delete(templateAssets).where(eq(templateAssets.assetId, assetId)),
                db.delete(planAssets).where(eq(planAssets.assetId, assetId)),
            ]);

            // Eliminar archivo físico
            if (asset.storageKey) {
                const storage = getStorageAdapter();
                try {
                    await storage.delete(asset.storageKey);
                } catch (err) {
                    console.error(`[AssetDeletion] Failed to delete storage file:`, err);
                }
            }

            // Registrar en audit
            await this.auditService.logDeleted({
                assetId,
                accountId,
                actorId,
            });

            // Eliminar de base de datos
            await db.delete(assets).where(eq(assets.id, assetId));

            console.log(`[AssetDeletion] Asset ${assetId} deleted`);
            return true;
        } catch (error) {
            console.error(`[AssetDeletion] Error deleting asset ${assetId}:`, error);
            return false;
        }
    }
}

// Singleton
export const assetDeletionService = new AssetDeletionService();
