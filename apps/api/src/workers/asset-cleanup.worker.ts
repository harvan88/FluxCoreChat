/**
 * Asset Cleanup Worker
 * 
 * Worker para limpiar sesiones de upload expiradas y archivos temporales huérfanos.
 * Ejecutar periódicamente via cron o BullMQ.
 */

import { assetGatewayService } from '../services/asset-gateway.service';
import { getStorageAdapter } from '../services/storage';

const DEBUG_PREFIX = '[AssetCleanupWorker]';

export interface CleanupResult {
    expiredSessions: number;
    orphanedFiles: number;
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
