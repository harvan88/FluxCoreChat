/**
 * Asset Cleanup Worker
 * 
 * Worker para limpiar sesiones de upload expiradas y archivos temporales huérfanos.
 * Ejecutar periódicamente via cron o BullMQ.
 */

import { assetGatewayService } from '../services/asset-gateway.service';
import { assetRegistryService } from '../services/asset-registry.service';
import { assetDeletionService } from '../services/asset-deletion.service';
import { getStorageAdapter } from '../services/storage';

const DEBUG_PREFIX = '[AssetCleanupWorker]';

export interface CleanupResult {
    expiredSessions: number;
    orphanedFiles: number;
    purgedAssets: number;
    errors: string[];
}

/**
 * Ejecutar limpieza de assets
 */
export async function runAssetCleanup(): Promise<CleanupResult> {
    console.log(`${DEBUG_PREFIX} Starting cleanup...`);

    const result: CleanupResult = {
        expiredSessions: 0,
        orphanedFiles: 0,
        purgedAssets: 0,
        errors: [],
    };

    try {
        // 1. Limpiar sesiones expiradas
        result.expiredSessions = await assetGatewayService.cleanupExpiredSessions();
        console.log(`${DEBUG_PREFIX} Expired sessions cleaned: ${result.expiredSessions}`);
    } catch (error) {
        const msg = `Failed to cleanup expired sessions: ${error}`;
        console.error(`${DEBUG_PREFIX} ${msg}`);
        result.errors.push(msg);
    }

    try {
        // 2. Limpiar archivos temporales huérfanos (más de 1 hora)
        const storage = getStorageAdapter();
        const tempFiles = await storage.list({ prefix: 'tmp/' });

        const oneHourAgo = Date.now() - (60 * 60 * 1000);

        for (const key of tempFiles.keys) {
            try {
                const meta = await storage.getMetadata(key);
                if (meta && meta.lastModified.getTime() < oneHourAgo) {
                    await storage.delete(key);
                    result.orphanedFiles++;
                    console.log(`${DEBUG_PREFIX} Deleted orphaned file: ${key}`);
                }
            } catch {
                // Ignorar errores individuales
            }
        }

        console.log(`${DEBUG_PREFIX} Orphaned files cleaned: ${result.orphanedFiles}`);
    } catch (error) {
        const msg = `Failed to cleanup orphaned files: ${error}`;
        console.error(`${DEBUG_PREFIX} ${msg}`);
        result.errors.push(msg);
    }

    try {
        // 3. Purgar assets expirados (Soft deleted que pasaron el periodo de gracia)
        console.log(`${DEBUG_PREFIX} Checking for expired assets to purge...`);
        const expiredAssets = await assetRegistryService.getExpiredAssetsForPurge();

        for (const asset of expiredAssets) {
            try {
                // purgeAsset ya verifica si es huérfano si pasamos checkOrphans: true
                const purged = await assetDeletionService.purgeAsset(
                    asset.id,
                    asset.accountId,
                    'system-cleanup',
                    true
                );

                if (purged) {
                    result.purgedAssets++;
                    console.log(`${DEBUG_PREFIX} Physically purged expired orphaned asset: ${asset.id} (${asset.name})`);
                } else {
                    // Si no se purgó porque no es huérfano, renovamos su periodo de gracia?
                    // Por ahora simplemente lo dejamos en 'deleted' status. 
                    // Esto cumple la regla de persistencia legal: si el chat lo necesita, NO se borra.
                    console.log(`${DEBUG_PREFIX} Kept expired asset ${asset.id} because it is still referenced in messages`);
                }
            } catch (err) {
                console.error(`${DEBUG_PREFIX} Error purging asset ${asset.id}:`, err);
            }
        }

    } catch (error) {
        const msg = `Failed to process expired assets: ${error}`;
        console.error(`${DEBUG_PREFIX} ${msg}`);
        result.errors.push(msg);
    }

    console.log(`${DEBUG_PREFIX} Cleanup completed. Sessions: ${result.expiredSessions}, Files: ${result.orphanedFiles}, Errors: ${result.errors.length}`);

    return result;
}

/**
 * Iniciar worker con intervalo
 */
export function startAssetCleanupWorker(intervalMinutes: number = 5): NodeJS.Timeout {
    console.log(`${DEBUG_PREFIX} Worker started with interval: ${intervalMinutes} minutes`);

    // Ejecutar inmediatamente
    runAssetCleanup().catch(console.error);

    // Programar ejecuciones periódicas
    return setInterval(() => {
        runAssetCleanup().catch(console.error);
    }, intervalMinutes * 60 * 1000);
}

/**
 * Detener worker
 */
export function stopAssetCleanupWorker(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log(`${DEBUG_PREFIX} Worker stopped`);
}
