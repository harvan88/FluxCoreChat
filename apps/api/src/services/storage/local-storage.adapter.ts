/**
 * Local Storage Adapter
 * 
 * Implementación de IStorageAdapter para almacenamiento local en disco.
 * Ideal para desarrollo y testing.
 */

import { mkdir, readFile, writeFile, unlink, stat, readdir, copyFile, rename } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import { join, dirname } from 'path';
import { createHash, randomBytes } from 'crypto';
import type { 
    IStorageAdapter, 
    StorageUploadOptions, 
    StorageDownloadResult, 
    SignedUrlOptions,
    StorageListOptions,
    StorageListResult
} from './storage-adapter.interface';

const DEBUG_PREFIX = '[LocalStorage]';

export class LocalStorageAdapter implements IStorageAdapter {
    readonly provider = 'local';
    private readonly basePath: string;
    private readonly baseUrl: string;
    private readonly signedUrlSecret: string;

    constructor(options?: { basePath?: string; baseUrl?: string; secret?: string }) {
        this.basePath = options?.basePath || join(process.cwd(), 'uploads', 'assets');
        this.baseUrl = options?.baseUrl || 'http://localhost:3000/assets';
        this.signedUrlSecret = options?.secret || process.env.ASSET_SIGNING_SECRET || 'dev-secret-change-in-production';
        
        console.log(`${DEBUG_PREFIX} Initialized with basePath: ${this.basePath}`);
    }

    private getFullPath(key: string): string {
        return join(this.basePath, key);
    }

    async upload(key: string, data: Buffer | ReadableStream, options?: StorageUploadOptions): Promise<void> {
        const fullPath = this.getFullPath(key);
        const dir = dirname(fullPath);

        console.log(`${DEBUG_PREFIX} Upload started: ${key}`);

        await mkdir(dir, { recursive: true });

        if (Buffer.isBuffer(data)) {
            await writeFile(fullPath, data);
        } else {
            const chunks: Buffer[] = [];
            const reader = (data as ReadableStream).getReader();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(Buffer.from(value));
            }
            
            await writeFile(fullPath, Buffer.concat(chunks));
        }

        if (options?.metadata) {
            const metaPath = `${fullPath}.meta.json`;
            await writeFile(metaPath, JSON.stringify({
                contentType: options.contentType,
                metadata: options.metadata,
                uploadedAt: new Date().toISOString(),
            }));
        }

        console.log(`${DEBUG_PREFIX} Upload completed: ${key}`);
    }

    async download(key: string): Promise<StorageDownloadResult> {
        const fullPath = this.getFullPath(key);
        
        console.log(`${DEBUG_PREFIX} Download: ${key}`);

        if (!existsSync(fullPath)) {
            throw new Error(`File not found: ${key}`);
        }

        const data = await readFile(fullPath);
        const stats = await stat(fullPath);
        
        let contentType = 'application/octet-stream';
        const metaPath = `${fullPath}.meta.json`;
        if (existsSync(metaPath)) {
            try {
                const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
                contentType = meta.contentType || contentType;
            } catch {
                // Ignore meta read errors
            }
        }

        return {
            data,
            contentType,
            size: stats.size,
        };
    }

    async delete(key: string): Promise<void> {
        const fullPath = this.getFullPath(key);
        
        console.log(`${DEBUG_PREFIX} Delete: ${key}`);

        if (existsSync(fullPath)) {
            await unlink(fullPath);
        }

        const metaPath = `${fullPath}.meta.json`;
        if (existsSync(metaPath)) {
            await unlink(metaPath);
        }
    }

    async deleteMany(keys: string[]): Promise<void> {
        console.log(`${DEBUG_PREFIX} DeleteMany: ${keys.length} files`);
        
        await Promise.all(keys.map(key => this.delete(key)));
    }

    async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
        const expiresAt = Date.now() + (options.expiresInSeconds * 1000);
        const payload = `${key}:${expiresAt}`;
        const signature = createHash('sha256')
            .update(payload + this.signedUrlSecret)
            .digest('hex')
            .substring(0, 32);

        const params = new URLSearchParams({
            expires: expiresAt.toString(),
            sig: signature,
        });

        if (options.disposition) {
            params.set('disposition', options.disposition);
        }
        if (options.filename) {
            params.set('filename', options.filename);
        }

        const url = `${this.baseUrl}/${key}?${params.toString()}`;
        
        console.log(`${DEBUG_PREFIX} URL signed: ${key}, expires in ${options.expiresInSeconds}s`);
        
        return url;
    }

    /**
     * Verificar firma de URL
     */
    verifySignedUrl(key: string, expires: string, signature: string): boolean {
        const expiresAt = parseInt(expires, 10);
        
        if (Date.now() > expiresAt) {
            console.log(`${DEBUG_PREFIX} URL expired: ${key}`);
            return false;
        }

        const payload = `${key}:${expiresAt}`;
        const expectedSig = createHash('sha256')
            .update(payload + this.signedUrlSecret)
            .digest('hex')
            .substring(0, 32);

        const valid = signature === expectedSig;
        
        if (!valid) {
            console.log(`${DEBUG_PREFIX} Invalid signature: ${key}`);
        }

        return valid;
    }

    async exists(key: string): Promise<boolean> {
        const fullPath = this.getFullPath(key);
        return existsSync(fullPath);
    }

    async getMetadata(key: string): Promise<{ size: number; contentType: string; lastModified: Date } | null> {
        const fullPath = this.getFullPath(key);
        
        if (!existsSync(fullPath)) {
            return null;
        }

        const stats = await stat(fullPath);
        let contentType = 'application/octet-stream';

        const metaPath = `${fullPath}.meta.json`;
        if (existsSync(metaPath)) {
            try {
                const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
                contentType = meta.contentType || contentType;
            } catch {
                // Ignore
            }
        }

        return {
            size: stats.size,
            contentType,
            lastModified: stats.mtime,
        };
    }

    async list(options: StorageListOptions): Promise<StorageListResult> {
        const prefix = options.prefix || '';
        const searchPath = this.getFullPath(prefix);
        const keys: string[] = [];

        console.log(`${DEBUG_PREFIX} List: prefix=${prefix}`);

        if (!existsSync(searchPath)) {
            return { keys: [], isTruncated: false };
        }

        const listRecursive = async (dir: string, base: string): Promise<void> => {
            const entries = await readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const relativePath = base ? `${base}/${entry.name}` : entry.name;
                
                if (entry.isDirectory()) {
                    await listRecursive(join(dir, entry.name), relativePath);
                } else if (!entry.name.endsWith('.meta.json')) {
                    keys.push(prefix ? `${prefix}/${relativePath}` : relativePath);
                }

                if (options.maxKeys && keys.length >= options.maxKeys) {
                    return;
                }
            }
        };

        try {
            const stats = await stat(searchPath);
            if (stats.isDirectory()) {
                await listRecursive(searchPath, '');
            }
        } catch {
            // Path doesn't exist or isn't accessible
        }

        const maxKeys = options.maxKeys || 1000;
        const isTruncated = keys.length > maxKeys;
        
        return {
            keys: keys.slice(0, maxKeys),
            isTruncated,
        };
    }

    async copy(sourceKey: string, destKey: string): Promise<void> {
        const sourcePath = this.getFullPath(sourceKey);
        const destPath = this.getFullPath(destKey);

        console.log(`${DEBUG_PREFIX} Copy: ${sourceKey} -> ${destKey}`);

        await mkdir(dirname(destPath), { recursive: true });
        await copyFile(sourcePath, destPath);

        const sourceMetaPath = `${sourcePath}.meta.json`;
        if (existsSync(sourceMetaPath)) {
            await copyFile(sourceMetaPath, `${destPath}.meta.json`);
        }
    }

    async move(sourceKey: string, destKey: string): Promise<void> {
        const sourcePath = this.getFullPath(sourceKey);
        const destPath = this.getFullPath(destKey);

        console.log(`${DEBUG_PREFIX} Move: ${sourceKey} -> ${destKey}`);

        await mkdir(dirname(destPath), { recursive: true });
        await rename(sourcePath, destPath);

        const sourceMetaPath = `${sourcePath}.meta.json`;
        if (existsSync(sourceMetaPath)) {
            await rename(sourceMetaPath, `${destPath}.meta.json`);
        }
    }

    /**
     * Crear un stream de lectura para archivos grandes
     */
    createReadStream(key: string): NodeJS.ReadableStream {
        const fullPath = this.getFullPath(key);
        return createReadStream(fullPath);
    }
}
