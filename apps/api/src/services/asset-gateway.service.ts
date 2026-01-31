/**
 * Asset Gateway Service
 * 
 * Gestiona sesiones de upload, validación de límites y orquestación de uploads.
 * No persiste blobs directamente; transmite al Storage Adapter.
 */

import { db } from '@fluxcore/db';
import { 
    assetUploadSessions, 
    type AssetUploadSession, 
    type CreateUploadSessionParams,
    type UploadSessionProgress 
} from '@fluxcore/db';
import { eq, and, lt } from 'drizzle-orm';
import { createHash } from 'crypto';
import { getStorageAdapter, generateTempStorageKey } from './storage';

const DEBUG_PREFIX = '[AssetGateway]';

// Configuración por defecto
const DEFAULT_SESSION_TTL_MINUTES = 10;
const DEFAULT_MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const DEFAULT_ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'text/plain', 'text/markdown', 'text/csv',
    'application/json',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export interface UploadChunkParams {
    sessionId: string;
    chunk: Buffer;
    chunkIndex?: number;
    isLastChunk?: boolean;
}

export interface CommitUploadResult {
    assetId: string;
    storageKey: string;
    checksumSHA256: string;
    sizeBytes: number;
}

export class AssetGatewayService {
    /**
     * Crear una nueva sesión de upload
     */
    async createUploadSession(params: CreateUploadSessionParams): Promise<AssetUploadSession> {
        const ttlMinutes = params.ttlMinutes || DEFAULT_SESSION_TTL_MINUTES;
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        const allowedMimeTypes = params.allowedMimeTypes || DEFAULT_ALLOWED_MIME_TYPES;

        console.log(`${DEBUG_PREFIX} Session created: accountId=${params.accountId}, expiresAt=${expiresAt.toISOString()}`);

        const [session] = await db.insert(assetUploadSessions).values({
            accountId: params.accountId,
            uploadedBy: params.uploadedBy,
            maxSizeBytes: params.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES,
            allowedMimeTypes: JSON.stringify(allowedMimeTypes),
            fileName: params.fileName,
            mimeType: params.mimeType,
            totalBytes: params.totalBytes,
            expiresAt,
            status: 'active',
        }).returning();

        console.log(`${DEBUG_PREFIX} Session ID: ${session.id}`);

        return session;
    }

    /**
     * Obtener sesión de upload por ID
     */
    async getSession(sessionId: string): Promise<AssetUploadSession | null> {
        const [session] = await db.select()
            .from(assetUploadSessions)
            .where(eq(assetUploadSessions.id, sessionId))
            .limit(1);

        return session || null;
    }

    /**
     * Validar que la sesión está activa y no expirada
     */
    async validateSession(sessionId: string): Promise<{ valid: boolean; session?: AssetUploadSession; error?: string }> {
        const session = await this.getSession(sessionId);

        if (!session) {
            console.log(`${DEBUG_PREFIX} Session not found: ${sessionId}`);
            return { valid: false, error: 'Session not found' };
        }

        if (session.status === 'expired' || session.status === 'cancelled') {
            console.log(`${DEBUG_PREFIX} Session ${session.status}: ${sessionId}`);
            return { valid: false, error: `Session ${session.status}` };
        }

        if (session.status === 'committed') {
            console.log(`${DEBUG_PREFIX} Session already committed: ${sessionId}`);
            return { valid: false, error: 'Session already committed' };
        }

        if (new Date() > session.expiresAt) {
            console.log(`${DEBUG_PREFIX} Session expired: ${sessionId}`);
            await this.expireSession(sessionId);
            return { valid: false, error: 'Session expired' };
        }

        return { valid: true, session };
    }

    /**
     * Validar archivo antes de upload
     */
    validateFile(params: {
        mimeType: string;
        sizeBytes: number;
        session: AssetUploadSession;
    }): { valid: boolean; error?: string } {
        const { mimeType, sizeBytes, session } = params;

        // Validar tamaño
        if (sizeBytes > (session.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES)) {
            console.log(`${DEBUG_PREFIX} File too large: ${sizeBytes} > ${session.maxSizeBytes}`);
            return { valid: false, error: `File exceeds maximum size of ${session.maxSizeBytes} bytes` };
        }

        // Validar mime type
        const allowedMimeTypes = session.allowedMimeTypes 
            ? JSON.parse(session.allowedMimeTypes) as string[]
            : DEFAULT_ALLOWED_MIME_TYPES;

        if (!allowedMimeTypes.includes(mimeType) && !allowedMimeTypes.includes('*/*')) {
            console.log(`${DEBUG_PREFIX} Invalid mime type: ${mimeType}`);
            return { valid: false, error: `File type ${mimeType} not allowed` };
        }

        return { valid: true };
    }

    /**
     * Procesar chunk de upload
     */
    async uploadChunk(params: UploadChunkParams): Promise<{ success: boolean; bytesUploaded: number; error?: string }> {
        const { sessionId, chunk } = params;

        const validation = await this.validateSession(sessionId);
        if (!validation.valid || !validation.session) {
            return { success: false, bytesUploaded: 0, error: validation.error };
        }

        const session = validation.session;
        const storage = getStorageAdapter();

        // Actualizar estado a uploading
        if (session.status === 'active') {
            await db.update(assetUploadSessions)
                .set({ status: 'uploading', updatedAt: new Date() })
                .where(eq(assetUploadSessions.id, sessionId));
        }

        // Generar key temporal si no existe
        let tempKey = session.tempStorageKey;
        if (!tempKey) {
            tempKey = generateTempStorageKey(sessionId, session.fileName || 'upload');
            await db.update(assetUploadSessions)
                .set({ tempStorageKey: tempKey })
                .where(eq(assetUploadSessions.id, sessionId));
        }

        // Para simplificar, guardamos todo el chunk como archivo
        // En producción, se usaría multipart upload para S3
        try {
            // Leer contenido existente si hay
            let existingData = Buffer.alloc(0);
            if (await storage.exists(tempKey)) {
                const result = await storage.download(tempKey);
                existingData = result.data as Buffer;
            }

            // Concatenar nuevo chunk
            const newData = Buffer.concat([existingData, chunk]);
            
            // Validar tamaño total
            if (newData.length > (session.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES)) {
                console.log(`${DEBUG_PREFIX} Upload exceeds max size: ${newData.length}`);
                return { success: false, bytesUploaded: session.bytesUploaded || 0, error: 'Upload exceeds maximum size' };
            }

            // Guardar
            await storage.upload(tempKey, newData, { contentType: session.mimeType || 'application/octet-stream' });

            // Actualizar progreso
            const bytesUploaded = newData.length;
            const chunksReceived = (session.chunksReceived || 0) + 1;

            await db.update(assetUploadSessions)
                .set({ 
                    bytesUploaded, 
                    chunksReceived,
                    updatedAt: new Date() 
                })
                .where(eq(assetUploadSessions.id, sessionId));

            console.log(`${DEBUG_PREFIX} Upload progress: ${sessionId}, ${bytesUploaded} bytes, ${chunksReceived} chunks`);

            return { success: true, bytesUploaded };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Upload error:`, error);
            return { success: false, bytesUploaded: session.bytesUploaded || 0, error: 'Upload failed' };
        }
    }

    /**
     * Subir archivo completo en una sola operación
     */
    async uploadComplete(sessionId: string, data: Buffer, mimeType?: string): Promise<{ success: boolean; error?: string }> {
        const validation = await this.validateSession(sessionId);
        if (!validation.valid || !validation.session) {
            return { success: false, error: validation.error };
        }

        const session = validation.session;
        const storage = getStorageAdapter();

        // Validar archivo
        const fileValidation = this.validateFile({
            mimeType: mimeType || session.mimeType || 'application/octet-stream',
            sizeBytes: data.length,
            session,
        });

        if (!fileValidation.valid) {
            return { success: false, error: fileValidation.error };
        }

        // Generar key temporal
        const tempKey = generateTempStorageKey(sessionId, session.fileName || 'upload');

        try {
            await storage.upload(tempKey, data, { 
                contentType: mimeType || session.mimeType || 'application/octet-stream' 
            });

            await db.update(assetUploadSessions)
                .set({ 
                    status: 'uploading',
                    tempStorageKey: tempKey,
                    bytesUploaded: data.length,
                    chunksReceived: 1,
                    mimeType: mimeType || session.mimeType,
                    updatedAt: new Date() 
                })
                .where(eq(assetUploadSessions.id, sessionId));

            console.log(`${DEBUG_PREFIX} Upload complete: ${sessionId}, ${data.length} bytes`);

            return { success: true };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Upload error:`, error);
            return { success: false, error: 'Upload failed' };
        }
    }

    /**
     * Confirmar upload y crear asset
     * Retorna información para que AssetRegistryService cree el asset
     */
    async commitUpload(sessionId: string): Promise<{ success: boolean; data?: CommitUploadResult; error?: string }> {
        const validation = await this.validateSession(sessionId);
        if (!validation.valid || !validation.session) {
            return { success: false, error: validation.error };
        }

        const session = validation.session;

        if (!session.tempStorageKey || !session.bytesUploaded) {
            console.log(`${DEBUG_PREFIX} No data uploaded: ${sessionId}`);
            return { success: false, error: 'No data uploaded' };
        }

        const storage = getStorageAdapter();

        try {
            // Descargar para calcular hash
            const { data } = await storage.download(session.tempStorageKey);
            const buffer = data as Buffer;
            
            const checksumSHA256 = createHash('sha256').update(buffer).digest('hex');

            console.log(`${DEBUG_PREFIX} Upload committed: ${sessionId}, checksum=${checksumSHA256.substring(0, 16)}...`);

            // Marcar sesión como committed
            await db.update(assetUploadSessions)
                .set({ 
                    status: 'committed',
                    committedAt: new Date(),
                    updatedAt: new Date() 
                })
                .where(eq(assetUploadSessions.id, sessionId));

            return {
                success: true,
                data: {
                    assetId: '', // Será asignado por AssetRegistryService
                    storageKey: session.tempStorageKey,
                    checksumSHA256,
                    sizeBytes: session.bytesUploaded,
                },
            };
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Commit error:`, error);
            return { success: false, error: 'Commit failed' };
        }
    }

    /**
     * Cancelar sesión de upload
     */
    async cancelSession(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (!session) return;

        console.log(`${DEBUG_PREFIX} Session cancelled: ${sessionId}`);

        // Limpiar archivo temporal
        if (session.tempStorageKey) {
            const storage = getStorageAdapter();
            try {
                await storage.delete(session.tempStorageKey);
            } catch {
                // Ignorar errores de limpieza
            }
        }

        await db.update(assetUploadSessions)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(assetUploadSessions.id, sessionId));
    }

    /**
     * Marcar sesión como expirada
     */
    async expireSession(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (!session) return;

        console.log(`${DEBUG_PREFIX} Session expired: ${sessionId}`);

        // Limpiar archivo temporal
        if (session.tempStorageKey) {
            const storage = getStorageAdapter();
            try {
                await storage.delete(session.tempStorageKey);
            } catch {
                // Ignorar errores de limpieza
            }
        }

        await db.update(assetUploadSessions)
            .set({ status: 'expired', updatedAt: new Date() })
            .where(eq(assetUploadSessions.id, sessionId));
    }

    /**
     * Obtener progreso de upload
     */
    async getProgress(sessionId: string): Promise<UploadSessionProgress | null> {
        const session = await this.getSession(sessionId);
        if (!session) return null;

        const bytesUploaded = session.bytesUploaded || 0;
        const totalBytes = session.totalBytes || null;
        const percentComplete = totalBytes ? Math.round((bytesUploaded / totalBytes) * 100) : 0;

        return {
            sessionId: session.id,
            status: session.status as any,
            bytesUploaded,
            totalBytes,
            chunksReceived: session.chunksReceived || 0,
            percentComplete,
            expiresAt: session.expiresAt,
        };
    }

    /**
     * Limpiar sesiones expiradas (para worker/cron)
     */
    async cleanupExpiredSessions(): Promise<number> {
        const now = new Date();

        // Buscar sesiones expiradas
        const expiredSessions = await db.select()
            .from(assetUploadSessions)
            .where(and(
                lt(assetUploadSessions.expiresAt, now),
                eq(assetUploadSessions.status, 'active')
            ));

        console.log(`${DEBUG_PREFIX} Cleanup: found ${expiredSessions.length} expired sessions`);

        const storage = getStorageAdapter();

        for (const session of expiredSessions) {
            // Limpiar archivo temporal
            if (session.tempStorageKey) {
                try {
                    await storage.delete(session.tempStorageKey);
                } catch {
                    // Ignorar errores de limpieza
                }
            }

            await db.update(assetUploadSessions)
                .set({ status: 'expired', updatedAt: new Date() })
                .where(eq(assetUploadSessions.id, session.id));
        }

        // También limpiar sesiones uploading expiradas
        const uploadingExpired = await db.select()
            .from(assetUploadSessions)
            .where(and(
                lt(assetUploadSessions.expiresAt, now),
                eq(assetUploadSessions.status, 'uploading')
            ));

        for (const session of uploadingExpired) {
            if (session.tempStorageKey) {
                try {
                    await storage.delete(session.tempStorageKey);
                } catch {
                    // Ignorar
                }
            }

            await db.update(assetUploadSessions)
                .set({ status: 'expired', updatedAt: new Date() })
                .where(eq(assetUploadSessions.id, session.id));
        }

        const total = expiredSessions.length + uploadingExpired.length;
        console.log(`${DEBUG_PREFIX} Cleanup completed: ${total} sessions expired`);

        return total;
    }

    /**
     * Vincular asset a sesión (después de crear el asset)
     */
    async linkAssetToSession(sessionId: string, assetId: string): Promise<void> {
        await db.update(assetUploadSessions)
            .set({ assetId, updatedAt: new Date() })
            .where(eq(assetUploadSessions.id, sessionId));

        console.log(`${DEBUG_PREFIX} Asset linked: session=${sessionId}, asset=${assetId}`);
    }
}

// Singleton
export const assetGatewayService = new AssetGatewayService();
