import { eq, and, desc, isNotNull } from 'drizzle-orm';
import {
    db,
    fluxcoreVectorStores,
    fluxcoreVectorStoreFiles,
    fluxcoreFiles,
    type FluxcoreVectorStore,
    type NewFluxcoreVectorStore,
    type FluxcoreVectorStoreFile,
    type NewFluxcoreVectorStoreFile,
} from '@fluxcore/db';
import { OpenAIDriver } from '../drivers/openai.driver';
import { deleteVectorStoreCascade } from '../vector-store-deletion.service';
import { convertToOpenAIExpiration } from '../../utils/expiration-converter';

// Driver singleton lazy (para evitar crash al inicio si falta env)
let openaiDriverInstance: OpenAIDriver | null = null;

export function getOpenAIDriver(): OpenAIDriver {
    if (!openaiDriverInstance) {
        openaiDriverInstance = new OpenAIDriver();
    }
    return openaiDriverInstance;
}


// ============================================================================
// HELPERS
// ============================================================================

/**
 * Recalcula file_counts, size_bytes y fileCount en fluxcore_vector_stores
 * a partir de los archivos reales en fluxcore_vector_store_files.
 */
export async function syncVectorStoreStats(vectorStoreId: string): Promise<void> {
    const files = await db
        .select()
        .from(fluxcoreVectorStoreFiles)
        .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId));

    const total = files.length;
    const completed = files.filter(f => f.status === 'completed').length;
    const failed = files.filter(f => f.status === 'failed').length;
    const inProgress = files.filter(f => f.status === 'processing' || f.status === 'pending').length;
    const totalSize = files.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0);

    await db
        .update(fluxcoreVectorStores)
        .set({
            fileCount: total,
            sizeBytes: totalSize,
            fileCounts: {
                total,
                completed,
                failed,
                cancelled: 0,
                in_progress: inProgress,
            },
            updatedAt: new Date(),
        })
        .where(eq(fluxcoreVectorStores.id, vectorStoreId));
}

// ============================================================================
// VECTOR STORES
// ============================================================================

export async function getVectorStores(accountId: string): Promise<FluxcoreVectorStore[]> {
    return db
        .select()
        .from(fluxcoreVectorStores)
        .where(eq(fluxcoreVectorStores.accountId, accountId))
        .orderBy(desc(fluxcoreVectorStores.updatedAt));
}

export async function getVectorStoreById(id: string, accountId: string): Promise<FluxcoreVectorStore | null> {
    const [store] = await db
        .select()
        .from(fluxcoreVectorStores)
        .where(and(
            eq(fluxcoreVectorStores.id, id),
            eq(fluxcoreVectorStores.accountId, accountId)
        ))
        .limit(1);
    return store || null;
}

export async function createVectorStore(data: NewFluxcoreVectorStore): Promise<FluxcoreVectorStore> {
    let externalId = data.externalId;
    let openaiData: any = {};
    let source = 'primary'; // Default for local

    if (data.backend === 'openai') {
        const driver = getOpenAIDriver();

        // Convert expiration policy
        const expiration = convertToOpenAIExpiration(
            data.expirationPolicy || 'never',
            data.expirationDays ?? undefined
        );

        externalId = await driver.createStore(data.name, {
            ...(data.metadata as any),
            expires_after: expiration
        });

        // Mark as cache
        source = 'cache';

        // Defaults para nuevo store
        openaiData = {
            status: 'production', // Recien creado está vacío y listo
            fileCounts: { total: 0, completed: 0, failed: 0, cancelled: 0, in_progress: 0 },
            usageBytes: 0,
            lastActiveAt: new Date(),
            metadata: data.metadata,
            expiresAfter: data.expiresAfter,
        };
    }

    const [store] = await db
        .insert(fluxcoreVectorStores)
        .values({
            ...data,
            ...openaiData,
            externalId,
            source,
        })
        .returning();
    return store;
}


export async function updateVectorStore(
    id: string,
    accountId: string,
    data: Partial<NewFluxcoreVectorStore>
): Promise<FluxcoreVectorStore | null> {
    const [existing] = await db
        .select()
        .from(fluxcoreVectorStores)
        .where(and(
            eq(fluxcoreVectorStores.id, id),
            eq(fluxcoreVectorStores.accountId, accountId)
        ))
        .limit(1);

    if (!existing) return null;

    if ((existing as any).source === 'cache' && existing.backend === 'openai' && existing.externalId) {
        const driver = getOpenAIDriver();
        const openaiUpdates: any = {};

        if (data.name) openaiUpdates.name = data.name;

        if (data.expirationPolicy || data.expirationDays) {
            const expiration = convertToOpenAIExpiration(
                (data.expirationPolicy as any) || (existing as any).expirationPolicy || 'never',
                data.expirationDays ?? (existing as any).expirationDays ?? undefined
            );
            openaiUpdates.expires_after = expiration;
        }

        if (Object.keys(openaiUpdates).length > 0) {
            await driver.updateStore(existing.externalId as string, openaiUpdates);
        }
    } else if ((existing as any).source === 'cache') {
        throw new Error('Cannot update a vector store that is a cache of an external source');
    }

    const [store] = await db
        .update(fluxcoreVectorStores)
        .set({ ...data, updatedAt: new Date() })
        .where(and(
            eq(fluxcoreVectorStores.id, id),
            eq(fluxcoreVectorStores.accountId, accountId)
        ))
        .returning();
    return store || null;
}

// Actualiza el registro local con datos obtenidos desde OpenAI (fuente de verdad)
export async function updateVectorStoreFromOpenAI(
    id: string,
    accountId: string,
    data: {
        status: string;
        fileCounts: any;
        usageBytes: number;
        lastActiveAt: Date | null;
        expiresAt?: Date | null;
        expiresAfter?: any;
        metadata: Record<string, any>;
        name?: string;
    }
): Promise<FluxcoreVectorStore | null> {
    const updatePayload: any = {
        status: data.status,
        fileCounts: data.fileCounts,
        usageBytes: data.usageBytes,
        lastActiveAt: data.lastActiveAt,
        metadata: data.metadata,
        updatedAt: new Date(),
    };

    if (data.expiresAt !== undefined) updatePayload.expiresAt = data.expiresAt;
    if (data.expiresAfter !== undefined) {
        updatePayload.expiresAfter = data.expiresAfter;
        // Convertir de vuelta a campos legibles por la UI local (Legacy sync)
        if (data.expiresAfter) {
            updatePayload.expirationPolicy = 'after_days';
            updatePayload.expirationDays = data.expiresAfter.days;
        } else {
            updatePayload.expirationPolicy = 'never';
        }
    }
    if (data.name !== undefined) updatePayload.name = data.name;

    const [store] = await db
        .update(fluxcoreVectorStores)
        .set(updatePayload)
        .where(and(
            eq(fluxcoreVectorStores.id, id),
            eq(fluxcoreVectorStores.accountId, accountId)
        ))
        .returning();
    return store || null;
}

export async function deleteVectorStore(id: string, accountId: string): Promise<boolean> {
    await deleteVectorStoreCascade(id, accountId);
    return true;
}

// Vector Store Files
export async function getVectorStoreFiles(vectorStoreId: string): Promise<FluxcoreVectorStoreFile[]> {
    return db
        .select()
        .from(fluxcoreVectorStoreFiles)
        .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId))
        .orderBy(desc(fluxcoreVectorStoreFiles.createdAt));
}

export async function addVectorStoreFile(data: NewFluxcoreVectorStoreFile): Promise<FluxcoreVectorStoreFile> {
    const [file] = await db
        .insert(fluxcoreVectorStoreFiles)
        .values(data)
        .returning();

    await syncVectorStoreStats(data.vectorStoreId);

    return file;
}

export async function deleteVectorStoreFile(id: string, vectorStoreId: string): Promise<boolean> {
    const result = await db
        .delete(fluxcoreVectorStoreFiles)
        .where(and(
            eq(fluxcoreVectorStoreFiles.id, id),
            eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId)
        ))
        .returning();

    if (result.length > 0) {
        await syncVectorStoreStats(vectorStoreId);
    }

    return result.length > 0;
}

export async function getVectorStoreFileById(id: string, vectorStoreId: string): Promise<FluxcoreVectorStoreFile | null> {
    const [row] = await db
        .select()
        .from(fluxcoreVectorStoreFiles)
        .where(and(
            eq(fluxcoreVectorStoreFiles.id, id),
            eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId)
        ))
        .limit(1);
    return row || null;
}

export async function updateVectorStoreFileStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
    await db
        .update(fluxcoreVectorStoreFiles)
        .set({ status, updatedAt: new Date() })
        .where(eq(fluxcoreVectorStoreFiles.id, id));
}

/**
 * Sincroniza los archivos locales con la lista remota de OpenAI.
 * - Actualiza metadatos y estado de archivos existentes.
 * - Elimina archivos locales que ya no existen en OpenAI.
 * - INSERT: Crea registros para archivos externos sin binario local (Fix reciente)
 */
export async function syncVectorStoreFiles(
    vectorStoreId: string,
    remoteFiles: Array<{
        id: string;
        status: string;
        usageBytes: number;
        attributes: Record<string, any>;
        chunkingStrategy: any;
        lastError: any;
    }>
): Promise<void> {
    // Obtener archivos locales que tienen externalId (son los vinculados)
    const localFiles = await db.select().from(fluxcoreVectorStoreFiles)
        .where(and(
            eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId),
            isNotNull(fluxcoreVectorStoreFiles.externalId)
        ));

    const remoteMap = new Map(remoteFiles.map(f => [f.id, f]));

    // Procesar locales: Actualizar o Borrar
    for (const local of localFiles) {
        if (!local.externalId) continue;

        const remote = remoteMap.get(local.externalId);

        if (!remote) {
            // CASE 1: DELETE - Archivo local tiene externalId pero no está en OpenAI
            await db.delete(fluxcoreVectorStoreFiles)
                .where(eq(fluxcoreVectorStoreFiles.id, local.id));
        } else {
            // CASE 2: UPDATE - Sincronizar estado
            await db.update(fluxcoreVectorStoreFiles)
                .set({
                    status: remote.status,
                    usageBytes: remote.usageBytes,
                    attributes: remote.attributes,
                    chunkingStrategy: remote.chunkingStrategy,
                    lastError: remote.lastError,
                    updatedAt: new Date(),
                })
                .where(eq(fluxcoreVectorStoreFiles.id, local.id));
        }
    }

    // CASE 3: INSERT - Archivos nuevos en OpenAI que no están localmente
    const [store] = await db
        .select({ accountId: fluxcoreVectorStores.accountId })
        .from(fluxcoreVectorStores)
        .where(eq(fluxcoreVectorStores.id, vectorStoreId));

    if (store) {
        const localExternalIds = new Set(localFiles.map(f => f.externalId));

        for (const remote of remoteFiles) {
            if (!localExternalIds.has(remote.id)) {
                // Nuevo archivo detectado en OpenAI.
                let resolvedName = `Archivo OpenAI ${remote.id.substring(0, 8)}`;
                let resolvedMime = 'application/openai-external';

                try {
                    const { getOpenAIFileMetadata } = await import('../openai-sync.service');
                    const meta = await getOpenAIFileMetadata(remote.id);
                    if (meta?.filename) {
                        resolvedName = meta.filename;
                    }
                } catch (err) {
                    console.warn(`[fluxcore] No se pudo resolver nombre para archivo ${remote.id}`);
                }

                // 1. Crear registro en tabla files (placeholder)
                const [newFile] = await db.insert(fluxcoreFiles).values({
                    accountId: store.accountId,
                    name: resolvedName,
                    mimeType: resolvedMime,
                    sizeBytes: remote.usageBytes,
                    uploadedBy: null,
                }).returning();

                // 2. Vincular al Vector Store
                await db.insert(fluxcoreVectorStoreFiles).values({
                    vectorStoreId,
                    fileId: newFile.id,
                    name: resolvedName,
                    externalId: remote.id,
                    status: remote.status,
                    usageBytes: remote.usageBytes,
                    attributes: remote.attributes,
                    chunkingStrategy: remote.chunkingStrategy,
                    lastError: remote.lastError
                });
            }
        }
    }
}
