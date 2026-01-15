/**
 * FileService - Servicio de Archivos Centralizados
 * 
 * Gestiona archivos como assets centralizados que pueden ser
 * referenciados por múltiples Vector Stores.
 * 
 * Características:
 * - Deduplicación por hash SHA-256
 * - Almacena contenido de texto para reprocessing
 * - Vinculación N:M con Vector Stores
 */

import { db } from '@fluxcore/db';
import {
    fluxcoreFiles,
    fluxcoreVectorStoreFiles,
    fluxcoreVectorStores,
    type FluxcoreFile,
    type NewFluxcoreFile,
} from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';
import { createHash } from 'crypto';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export interface UploadFileParams {
    name: string;
    mimeType?: string;
    sizeBytes?: number;
    content: Buffer | string;
    accountId: string;
    uploadedBy?: string;
}

export interface LinkFileParams {
    fileId: string;
    vectorStoreId: string;
}

export interface FileListOptions {
    limit?: number;
    offset?: number;
}

export interface VectorStoreFileWithDetails {
    id: string;
    vectorStoreId: string;
    fileId: string;
    status: string;
    errorMessage?: string;
    chunkCount?: number;
    createdAt: Date;
    file: {
        id: string;
        name: string;
        mimeType: string;
        sizeBytes: number;
    };
}

// ════════════════════════════════════════════════════════════════════════════
// Service Class
// ════════════════════════════════════════════════════════════════════════════

export class FileService {
    /**
     * Sube un archivo con deduplicación automática
     */
    async uploadFile(params: UploadFileParams): Promise<FluxcoreFile> {
        const { name, mimeType, sizeBytes, content, accountId, uploadedBy } = params;

        // Convertir contenido a texto si es Buffer
        const textContent = Buffer.isBuffer(content)
            ? content.toString('utf-8')
            : content;

        // Calcular hash para deduplicación
        const contentHash = createHash('sha256')
            .update(textContent)
            .digest('hex');

        // Buscar archivo existente con mismo hash
        const existing = await db
            .select()
            .from(fluxcoreFiles)
            .where(and(
                eq(fluxcoreFiles.accountId, accountId),
                eq(fluxcoreFiles.contentHash, contentHash)
            ))
            .limit(1);

        if (existing.length > 0) {
            // Retornar archivo existente (deduplicación)
            return existing[0];
        }

        // Crear nuevo archivo
        const [file] = await db
            .insert(fluxcoreFiles)
            .values({
                name,
                originalName: name,
                mimeType: mimeType || 'text/plain',
                sizeBytes: sizeBytes || Buffer.byteLength(textContent),
                textContent,
                contentHash,
                accountId,
                uploadedBy,
            })
            .returning();

        return file;
    }

    /**
     * Vincula un archivo a un Vector Store
     */
    async linkToVectorStore(params: LinkFileParams): Promise<string> {
        const { fileId, vectorStoreId } = params;

        // Verificar que el archivo existe
        const file = await db
            .select()
            .from(fluxcoreFiles)
            .where(eq(fluxcoreFiles.id, fileId))
            .limit(1);

        if (file.length === 0) {
            throw new Error(`File not found: ${fileId}`);
        }

        // Verificar si ya existe el enlace
        const existing = await db
            .select()
            .from(fluxcoreVectorStoreFiles)
            .where(and(
                eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId),
                eq(fluxcoreVectorStoreFiles.fileId, fileId)
            ))
            .limit(1);

        if (existing.length > 0) {
            return existing[0].id;
        }

        // Crear enlace
        const [link] = await db
            .insert(fluxcoreVectorStoreFiles)
            .values({
                vectorStoreId,
                fileId,
                name: file[0].name,
                mimeType: file[0].mimeType,
                sizeBytes: file[0].sizeBytes,
                status: 'pending',
            })
            .returning();

        return link.id;
    }

    /**
     * Sube y vincula un archivo en un solo paso
     */
    async uploadAndLink(
        params: UploadFileParams,
        vectorStoreId: string
    ): Promise<{ file: FluxcoreFile; linkId: string }> {
        const file = await this.uploadFile(params);
        const linkId = await this.linkToVectorStore({
            fileId: file.id,
            vectorStoreId,
        });
        return { file, linkId };
    }

    /**
     * Obtiene archivo por ID
     */
    async getById(fileId: string): Promise<FluxcoreFile | null> {
        const result = await db
            .select()
            .from(fluxcoreFiles)
            .where(eq(fluxcoreFiles.id, fileId))
            .limit(1);

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Lista archivos de una cuenta
     */
    async listByAccount(
        accountId: string,
        options: FileListOptions = {}
    ): Promise<FluxcoreFile[]> {
        const { limit = 50, offset = 0 } = options;

        return db
            .select()
            .from(fluxcoreFiles)
            .where(eq(fluxcoreFiles.accountId, accountId))
            .orderBy(desc(fluxcoreFiles.createdAt))
            .limit(limit)
            .offset(offset);
    }

    /**
     * Lista archivos de un Vector Store con detalles
     */
    async listByVectorStore(vectorStoreId: string): Promise<VectorStoreFileWithDetails[]> {
        const results = await db
            .select({
                link: fluxcoreVectorStoreFiles,
                file: fluxcoreFiles,
            })
            .from(fluxcoreVectorStoreFiles)
            .leftJoin(fluxcoreFiles, eq(fluxcoreVectorStoreFiles.fileId, fluxcoreFiles.id))
            .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId))
            .orderBy(desc(fluxcoreVectorStoreFiles.createdAt));

        return results.map(r => ({
            id: r.link.id,
            vectorStoreId: r.link.vectorStoreId,
            fileId: r.link.fileId || r.link.id, // Fallback para migración
            status: r.link.status || 'pending',
            errorMessage: r.link.errorMessage || undefined,
            chunkCount: r.link.chunkCount || undefined,
            createdAt: r.link.createdAt,
            file: r.file ? {
                id: r.file.id,
                name: r.file.name,
                mimeType: r.file.mimeType || 'application/octet-stream',
                sizeBytes: Number(r.file.sizeBytes) || 0,
            } : {
                // Fallback para archivos legacy sin file_id
                id: r.link.id,
                name: r.link.name || 'Unknown',
                mimeType: r.link.mimeType || 'application/octet-stream',
                sizeBytes: Number(r.link.sizeBytes) || 0,
            },
        }));
    }

    /**
     * Desvincula archivo de Vector Store (no elimina el archivo)
     */
    async unlinkFromVectorStore(linkId: string, vectorStoreId: string): Promise<boolean> {
        const result = await db
            .delete(fluxcoreVectorStoreFiles)
            .where(and(
                eq(fluxcoreVectorStoreFiles.id, linkId),
                eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId)
            ))
            .returning();

        return result.length > 0;
    }

    /**
     * Elimina archivo y todos sus enlaces
     */
    async deleteFile(fileId: string, accountId: string): Promise<boolean> {
        // Verificar propiedad
        const file = await db
            .select()
            .from(fluxcoreFiles)
            .where(and(
                eq(fluxcoreFiles.id, fileId),
                eq(fluxcoreFiles.accountId, accountId)
            ))
            .limit(1);

        if (file.length === 0) {
            return false;
        }

        // Eliminar enlaces primero (cascade debería manejarlo, pero por seguridad)
        await db
            .delete(fluxcoreVectorStoreFiles)
            .where(eq(fluxcoreVectorStoreFiles.fileId, fileId));

        // Eliminar archivo
        const result = await db
            .delete(fluxcoreFiles)
            .where(eq(fluxcoreFiles.id, fileId))
            .returning();

        return result.length > 0;
    }

    /**
     * Obtiene contenido de texto del archivo (para reprocessing)
     */
    async getTextContent(fileId: string): Promise<string | null> {
        const result = await db
            .select({ textContent: fluxcoreFiles.textContent })
            .from(fluxcoreFiles)
            .where(eq(fluxcoreFiles.id, fileId))
            .limit(1);

        return result.length > 0 ? result[0].textContent : null;
    }

    /**
     * Actualiza estado de procesamiento de un enlace
     */
    async updateLinkStatus(
        linkId: string,
        status: 'pending' | 'processing' | 'completed' | 'failed',
        options?: { errorMessage?: string; chunkCount?: number }
    ): Promise<void> {
        await db
            .update(fluxcoreVectorStoreFiles)
            .set({
                status,
                errorMessage: options?.errorMessage,
                chunkCount: options?.chunkCount,
            })
            .where(eq(fluxcoreVectorStoreFiles.id, linkId));
    }
}

// Singleton export
export const fileService = new FileService();
