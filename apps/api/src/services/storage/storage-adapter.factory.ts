/**
 * Storage Adapter Factory
 * 
 * Crea el adapter de storage apropiado basado en la configuración.
 */

import type { IStorageAdapter } from './storage-adapter.interface';
import { LocalStorageAdapter } from './local-storage.adapter';
import { S3StorageAdapter, createS3ConfigFromEnv } from './s3-storage.adapter';

const DEBUG_PREFIX = '[StorageFactory]';

export type StorageProvider = 'local' | 's3' | 'auto';

export interface StorageFactoryOptions {
    provider?: StorageProvider;
    localBasePath?: string;
    localBaseUrl?: string;
    signingSecret?: string;
}

let _instance: IStorageAdapter | null = null;

/**
 * Crear o obtener instancia singleton del storage adapter
 */
export function getStorageAdapter(options?: StorageFactoryOptions): IStorageAdapter {
    if (_instance) {
        return _instance;
    }

    const provider = options?.provider || (process.env.STORAGE_PROVIDER as StorageProvider) || 'auto';

    console.log(`${DEBUG_PREFIX} Creating adapter with provider: ${provider}`);

    if (provider === 's3') {
        const s3Config = createS3ConfigFromEnv();
        if (!s3Config) {
            throw new Error('S3 configuration missing. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY');
        }
        _instance = new S3StorageAdapter(s3Config);
        console.log(`${DEBUG_PREFIX} Using S3 adapter for bucket: ${s3Config.bucket}`);
        return _instance;
    }

    if (provider === 'local') {
        _instance = new LocalStorageAdapter({
            basePath: options?.localBasePath,
            baseUrl: options?.localBaseUrl,
            secret: options?.signingSecret,
        });
        console.log(`${DEBUG_PREFIX} Using Local adapter`);
        return _instance;
    }

    // Auto-detect: try S3 first, fallback to local
    if (provider === 'auto') {
        const s3Config = createS3ConfigFromEnv();
        if (s3Config) {
            try {
                _instance = new S3StorageAdapter(s3Config);
                console.log(`${DEBUG_PREFIX} Auto-detected S3 configuration, using S3 adapter`);
                return _instance;
            } catch (error) {
                console.warn(`${DEBUG_PREFIX} S3 config found but failed to initialize, falling back to local`);
            }
        }

        _instance = new LocalStorageAdapter({
            basePath: options?.localBasePath,
            baseUrl: options?.localBaseUrl,
            secret: options?.signingSecret,
        });
        console.log(`${DEBUG_PREFIX} Using Local adapter (auto-detected)`);
        return _instance;
    }

    throw new Error(`Unknown storage provider: ${provider}`);
}

/**
 * Resetear instancia singleton (para testing)
 */
export function resetStorageAdapter(): void {
    _instance = null;
}

/**
 * Obtener el adapter actual sin crear uno nuevo
 */
export function getCurrentStorageAdapter(): IStorageAdapter | null {
    return _instance;
}
