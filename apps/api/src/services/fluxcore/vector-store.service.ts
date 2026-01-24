import { eq, and, desc, isNotNull } from 'drizzle-orm';
import {
    db,
    fluxcoreVectorStores,
    fluxcoreVectorStoreFiles,
    fluxcoreAssistantVectorStores,
    fluxcoreAssistants,
    fluxcoreFiles,
    type FluxcoreVectorStore,
    type NewFluxcoreVectorStore,
    type FluxcoreVectorStoreFile,
    type NewFluxcoreVectorStoreFile,
} from '@fluxcore/db';
import { OpenAIDriver } from '../drivers/openai.driver';

// Driver singleton (podría inyectarse)
const openaiDriver = new OpenAIDriver();

type FluxcoreConflictError = Error & {
    statusCode?: number;
    details?: any;
};

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

    if (data.backend === 'openai') {
        // Hito 3: Usar Driver
        externalId = await openaiDriver.createStore(data.name, data.metadata as any);

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

    if (existing.backend === 'openai' && typeof existing.externalId === 'string' && existing.externalId.length > 0) {
        // Si cambia el nombre o expiresAfter, actualizar en OpenAI primero
        // Si cambia el nombre, actualizar en OpenAI (Driver no soporta update directo aun, implementar si necesario)
        // Por ahora, solo soportamos rename si el driver lo soportara. El driver actual no tiene updateStore.
        // TODO: Agregar updateStore a IVectorStoreDriver
        // Por consistencia, implementamos update manual o ignoramos sync de nombre por ahora.
        // OpenAI Beta Vector Store Update endpoint existe.
        // Dejaremos esto pendiente para R-03.X o implementamos updateStore en Driver ahora.
        // Dado que interface no lo tiene, saltamos sync por ahora.
        // await openaiDriver.updateStore(...)
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
    const [existing] = await db
        .select()
        .from(fluxcoreVectorStores)
        .where(and(
            eq(fluxcoreVectorStores.id, id),
            eq(fluxcoreVectorStores.accountId, accountId)
        ))
        .limit(1);

    if (!existing) return false;

    const usedBy = await db
        .select({ id: fluxcoreAssistants.id, name: fluxcoreAssistants.name })
        .from(fluxcoreAssistantVectorStores)
        .innerJoin(
            fluxcoreAssistants,
            eq(fluxcoreAssistantVectorStores.assistantId, fluxcoreAssistants.id)
        )
        .where(and(
            eq(fluxcoreAssistantVectorStores.vectorStoreId, id),
            eq(fluxcoreAssistants.accountId, accountId)
        ))
        .limit(1);

    if (usedBy.length > 0) {
        const err = new Error('No se puede eliminar: este vector store está siendo usado por un asistente') as FluxcoreConflictError;
        err.statusCode = 409;
        err.details = { usedByAssistants: usedBy };
        throw err;
    }

    if (existing.backend === 'openai' && typeof existing.externalId === 'string' && existing.externalId.length > 0) {
        try {
            await openaiDriver.deleteStore(existing.externalId);
        } catch (e) {
            console.warn('[VectorStore] Error deleting external store:', e);
        }
    }

    const result = await db
        .delete(fluxcoreVectorStores)
        .where(and(
            eq(fluxcoreVectorStores.id, id),
            eq(fluxcoreVectorStores.accountId, accountId)
        ))
        .returning();
    return result.length > 0;
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

    // Actualizar contador de archivos en el vector store
    const files = await db
        .select()
        .from(fluxcoreVectorStoreFiles)
        .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, data.vectorStoreId));

    await db
        .update(fluxcoreVectorStores)
        .set({
            fileCount: files.length,
            updatedAt: new Date()
        })
        .where(eq(fluxcoreVectorStores.id, data.vectorStoreId));

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
            // Significa que fue borrado en OpenAI. Borrar localmente para reflejar verdad.
            await db.delete(fluxcoreVectorStoreFiles)
                .where(eq(fluxcoreVectorStoreFiles.id, local.id));
        } else {
            // CASE 2: UPDATE - Sincronizar estado
            // Se podría optimizar checking diffs, pero update es seguro
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
        // Optimización: Crear Set de externalIds locales para búsqueda rápida
        const localExternalIds = new Set(localFiles.map(f => f.externalId));

        for (const remote of remoteFiles) {
            if (!localExternalIds.has(remote.id)) {
                // Nuevo archivo detectado en OpenAI. Crear referencia local.

                // 1. Crear registro en tabla files (placeholder)
                const [newFile] = await db.insert(fluxcoreFiles).values({
                    accountId: store.accountId,
                    name: `OpenAI File ${remote.id.substring(0, 8)}`, // Nombre temporal
                    mimeType: 'application/openai-external',
                    sizeBytes: remote.usageBytes,
                    uploadedBy: null, // Sistema
                }).returning();

                // 2. Vincular al Vector Store
                await db.insert(fluxcoreVectorStoreFiles).values({
                    vectorStoreId,
                    fileId: newFile.id,
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
