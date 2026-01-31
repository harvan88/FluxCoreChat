/**
 * Storage Adapter Interface
 * 
 * Abstracción sobre diferentes proveedores de almacenamiento (local, S3, MinIO, GCS).
 * Todos los adapters deben implementar esta interfaz.
 */

export interface StorageUploadOptions {
    contentType?: string;
    metadata?: Record<string, string>;
    encryption?: string;
}

export interface StorageDownloadResult {
    data: Buffer | ReadableStream;
    contentType: string;
    size: number;
    metadata?: Record<string, string>;
}

export interface SignedUrlOptions {
    expiresInSeconds: number;
    contentType?: string;
    disposition?: 'inline' | 'attachment';
    filename?: string;
}

export interface StorageListOptions {
    prefix?: string;
    maxKeys?: number;
    continuationToken?: string;
}

export interface StorageListResult {
    keys: string[];
    continuationToken?: string;
    isTruncated: boolean;
}

export interface IStorageAdapter {
    /**
     * Nombre del proveedor de storage
     */
    readonly provider: string;

    /**
     * Subir un archivo al storage
     * @param key Ruta del archivo en storage (ej: accountId/assetId/version)
     * @param data Contenido del archivo
     * @param options Opciones de upload
     */
    upload(key: string, data: Buffer | ReadableStream, options?: StorageUploadOptions): Promise<void>;

    /**
     * Descargar un archivo del storage
     * @param key Ruta del archivo
     */
    download(key: string): Promise<StorageDownloadResult>;

    /**
     * Eliminar un archivo del storage
     * @param key Ruta del archivo
     */
    delete(key: string): Promise<void>;

    /**
     * Eliminar múltiples archivos
     * @param keys Lista de rutas
     */
    deleteMany(keys: string[]): Promise<void>;

    /**
     * Generar URL firmada para acceso temporal
     * @param key Ruta del archivo
     * @param options Opciones de firma
     */
    getSignedUrl(key: string, options: SignedUrlOptions): Promise<string>;

    /**
     * Verificar si un archivo existe
     * @param key Ruta del archivo
     */
    exists(key: string): Promise<boolean>;

    /**
     * Obtener metadata de un archivo
     * @param key Ruta del archivo
     */
    getMetadata(key: string): Promise<{ size: number; contentType: string; lastModified: Date } | null>;

    /**
     * Listar archivos con un prefijo
     * @param options Opciones de listado
     */
    list(options: StorageListOptions): Promise<StorageListResult>;

    /**
     * Copiar un archivo a otra ubicación
     * @param sourceKey Ruta origen
     * @param destKey Ruta destino
     */
    copy(sourceKey: string, destKey: string): Promise<void>;

    /**
     * Mover un archivo (copy + delete)
     * @param sourceKey Ruta origen
     * @param destKey Ruta destino
     */
    move(sourceKey: string, destKey: string): Promise<void>;
}

/**
 * Genera la ruta de storage para un asset
 * Formato: {accountId}/{assetId}/{version}
 */
export function generateStorageKey(accountId: string, assetId: string, version: number = 1): string {
    return `${accountId}/${assetId}/${version}`;
}

/**
 * Genera la ruta temporal para uploads en progreso
 * Formato: tmp/{sessionId}/{filename}
 */
export function generateTempStorageKey(sessionId: string, filename?: string): string {
    return `tmp/${sessionId}${filename ? `/${filename}` : ''}`;
}
