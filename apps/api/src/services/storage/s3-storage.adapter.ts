/**
 * S3 Storage Adapter
 * 
 * Implementación de IStorageAdapter para Amazon S3 y servicios compatibles (MinIO, DigitalOcean Spaces, etc.).
 * Para producción.
 */

import type { 
    IStorageAdapter, 
    StorageUploadOptions, 
    StorageDownloadResult, 
    SignedUrlOptions,
    StorageListOptions,
    StorageListResult
} from './storage-adapter.interface';

const DEBUG_PREFIX = '[S3Storage]';

export interface S3StorageConfig {
    bucket: string;
    region?: string;
    endpoint?: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean; // Para MinIO
}

/**
 * S3 Storage Adapter
 * 
 * NOTA: Esta es una implementación placeholder.
 * En producción, usar @aws-sdk/client-s3 y @aws-sdk/s3-request-presigner.
 * 
 * Instalación:
 * bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */
export class S3StorageAdapter implements IStorageAdapter {
    readonly provider = 's3';
    private readonly config: S3StorageConfig;

    constructor(config: S3StorageConfig) {
        this.config = config;
        console.log(`${DEBUG_PREFIX} Initialized for bucket: ${config.bucket}, region: ${config.region || 'default'}`);
    }

    async upload(key: string, data: Buffer | ReadableStream, options?: StorageUploadOptions): Promise<void> {
        console.log(`${DEBUG_PREFIX} Upload started: ${key}`);
        
        // TODO: Implementar con @aws-sdk/client-s3
        // const command = new PutObjectCommand({
        //     Bucket: this.config.bucket,
        //     Key: key,
        //     Body: data,
        //     ContentType: options?.contentType,
        //     Metadata: options?.metadata,
        // });
        // await this.client.send(command);

        throw new Error('S3 adapter not fully implemented. Install @aws-sdk/client-s3 and implement.');
    }

    async download(key: string): Promise<StorageDownloadResult> {
        console.log(`${DEBUG_PREFIX} Download: ${key}`);
        
        // TODO: Implementar con @aws-sdk/client-s3
        // const command = new GetObjectCommand({
        //     Bucket: this.config.bucket,
        //     Key: key,
        // });
        // const response = await this.client.send(command);

        throw new Error('S3 adapter not fully implemented. Install @aws-sdk/client-s3 and implement.');
    }

    async delete(key: string): Promise<void> {
        console.log(`${DEBUG_PREFIX} Delete: ${key}`);
        
        // TODO: Implementar con @aws-sdk/client-s3
        // const command = new DeleteObjectCommand({
        //     Bucket: this.config.bucket,
        //     Key: key,
        // });
        // await this.client.send(command);

        throw new Error('S3 adapter not fully implemented. Install @aws-sdk/client-s3 and implement.');
    }

    async deleteMany(keys: string[]): Promise<void> {
        console.log(`${DEBUG_PREFIX} DeleteMany: ${keys.length} files`);
        
        // TODO: Implementar con DeleteObjectsCommand para batch delete
        throw new Error('S3 adapter not fully implemented. Install @aws-sdk/client-s3 and implement.');
    }

    async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
        console.log(`${DEBUG_PREFIX} URL signed: ${key}, expires in ${options.expiresInSeconds}s`);
        
        // TODO: Implementar con @aws-sdk/s3-request-presigner
        // const command = new GetObjectCommand({
        //     Bucket: this.config.bucket,
        //     Key: key,
        //     ResponseContentDisposition: options.disposition === 'attachment' 
        //         ? `attachment; filename="${options.filename}"` 
        //         : undefined,
        // });
        // return getSignedUrl(this.client, command, { expiresIn: options.expiresInSeconds });

        throw new Error('S3 adapter not fully implemented. Install @aws-sdk/s3-request-presigner and implement.');
    }

    async exists(key: string): Promise<boolean> {
        // TODO: Implementar con HeadObjectCommand
        throw new Error('S3 adapter not fully implemented. Install @aws-sdk/client-s3 and implement.');
    }

    async getMetadata(key: string): Promise<{ size: number; contentType: string; lastModified: Date } | null> {
        // TODO: Implementar con HeadObjectCommand
        throw new Error('S3 adapter not fully implemented. Install @aws-sdk/client-s3 and implement.');
    }

    async list(options: StorageListOptions): Promise<StorageListResult> {
        console.log(`${DEBUG_PREFIX} List: prefix=${options.prefix}`);
        
        // TODO: Implementar con ListObjectsV2Command
        throw new Error('S3 adapter not fully implemented. Install @aws-sdk/client-s3 and implement.');
    }

    async copy(sourceKey: string, destKey: string): Promise<void> {
        console.log(`${DEBUG_PREFIX} Copy: ${sourceKey} -> ${destKey}`);
        
        // TODO: Implementar con CopyObjectCommand
        throw new Error('S3 adapter not fully implemented. Install @aws-sdk/client-s3 and implement.');
    }

    async move(sourceKey: string, destKey: string): Promise<void> {
        console.log(`${DEBUG_PREFIX} Move: ${sourceKey} -> ${destKey}`);
        
        // Copy then delete
        await this.copy(sourceKey, destKey);
        await this.delete(sourceKey);
    }
}

/**
 * Crear configuración S3 desde variables de entorno
 */
export function createS3ConfigFromEnv(): S3StorageConfig | null {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
        return null;
    }

    return {
        bucket,
        region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT, // Para MinIO: http://localhost:9000
        accessKeyId,
        secretAccessKey,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    };
}
