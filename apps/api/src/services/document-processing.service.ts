/**
 * Document Processing Service - Pipeline de Ingesta de Documentos
 * 
 * Procesa documentos para RAG:
 * 1. Parse del documento (PDF, TXT, MD, DOCX)
 * 2. Chunking con estrategia configurada
 * 3. Generación de embeddings
 * 4. Almacenamiento en base de datos vectorial
 * 
 * RAG-006: Pipeline de Documentos
 */

import { db } from '@fluxcore/db';
import {
    fluxcoreDocumentChunks,
    fluxcoreVectorStoreFiles,
    type NewFluxcoreDocumentChunk,
} from '@fluxcore/db';
import { eq, sql } from 'drizzle-orm';
import { chunkingService } from './chunking.service';
import { embeddingService } from './embedding.service';
import { ragConfigService } from './rag-config.service';
import { syncVectorStoreStats } from './fluxcore/vector-store.service';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export interface ProcessingJob {
    id: string;
    fileId: string;
    vectorStoreId: string;
    accountId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

export interface ProcessingResult {
    fileId: string;
    chunksCreated: number;
    tokensProcessed: number;
    embeddingsGenerated: number;
    processingTimeMs: number;
}

export interface DocumentContent {
    text: string;
    metadata?: {
        title?: string;
        author?: string;
        pageCount?: number;
        createdDate?: string;
    };
}

// ════════════════════════════════════════════════════════════════════════════
// Document Parser (simple implementation)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Parsea contenido de documento según tipo MIME
 * En producción, usar librerías como pdf-parse, mammoth, etc.
 */
async function parseDocument(
    content: Buffer | string,
    mimeType: string
): Promise<DocumentContent> {
    // Por ahora, implementación simple para texto
    // TODO: Integrar parsers para PDF, DOCX, etc.

    if (typeof content === 'string') {
        return { text: content };
    }

    switch (mimeType) {
        case 'text/plain':
        case 'text/markdown':
            return { text: content.toString('utf-8') };

        case 'application/pdf':
            // TODO: Usar pdf-parse
            console.warn('PDF parsing not implemented, using raw text');
            return { text: content.toString('utf-8') };

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            // TODO: Usar mammoth
            console.warn('DOCX parsing not implemented, using raw text');
            return { text: content.toString('utf-8') };

        default:
            return { text: content.toString('utf-8') };
    }
}

// ════════════════════════════════════════════════════════════════════════════
// In-Memory Job Queue (simple implementation)
// En producción, usar BullMQ + Redis
// ════════════════════════════════════════════════════════════════════════════

const processingJobs = new Map<string, ProcessingJob>();

function createJob(fileId: string, vectorStoreId: string, accountId: string): ProcessingJob {
    const job: ProcessingJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        fileId,
        vectorStoreId,
        accountId,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
    };
    processingJobs.set(job.id, job);
    return job;
}

function updateJob(jobId: string, updates: Partial<ProcessingJob>): void {
    const job = processingJobs.get(jobId);
    if (job) {
        Object.assign(job, updates);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Main Document Processing Service
// ════════════════════════════════════════════════════════════════════════════

export class DocumentProcessingService {
    /**
     * Procesa un documento y lo indexa en el vector store
     */
    async processDocument(
        fileId: string,
        vectorStoreId: string,
        accountId: string,
        content: Buffer | string,
        mimeType: string
    ): Promise<ProcessingResult> {
        const startTime = Date.now();
        const job = createJob(fileId, vectorStoreId, accountId);

        try {
            // 1. Actualizar estado del archivo a "processing"
            await db
                .update(fluxcoreVectorStoreFiles)
                .set({ status: 'processing' })
                .where(eq(fluxcoreVectorStoreFiles.id, fileId));

            updateJob(job.id, { status: 'processing', startedAt: new Date() });

            // 2. Parsear documento
            updateJob(job.id, { progress: 10 });
            const parsed = await parseDocument(content, mimeType);

            // 3. Obtener configuración RAG
            const config = await ragConfigService.getEffectiveConfig(vectorStoreId, accountId);

            // 4. Dividir en chunks
            updateJob(job.id, { progress: 30 });
            const chunkingResult = chunkingService.chunkWithConfig(parsed.text, config.chunking);

            // 5. Eliminar chunks anteriores de este archivo
            await db
                .delete(fluxcoreDocumentChunks)
                .where(eq(fluxcoreDocumentChunks.fileId, fileId));

            // 6. Generar embeddings en batches
            updateJob(job.id, { progress: 50 });
            const batchSize = config.embedding.batchSize;
            const chunks = chunkingResult.chunks;
            const allChunksToInsert: NewFluxcoreDocumentChunk[] = [];
            const allEmbeddings: number[][] = [];

            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const texts = batch.map(c => c.content);

                // Generar embeddings (almacenar para uso futuro con SQL raw)
                const embeddingResult = await embeddingService.embedBatchWithConfig(texts, {
                    provider: config.embedding.provider,
                    model: config.embedding.model,
                    dimensions: config.embedding.dimensions,
                    endpointUrl: config.embedding.endpointUrl,
                });

                // Preparar chunks para inserción
                for (let j = 0; j < batch.length; j++) {
                    const chunk = batch[j];
                    const embedding = embeddingResult.embeddings[j] || [];
                    allChunksToInsert.push({
                        vectorStoreId,
                        fileId,
                        accountId,
                        content: chunk.content,
                        chunkIndex: chunk.index,
                        tokenCount: chunk.tokenCount,
                        startChar: chunk.startChar,
                        endChar: chunk.endChar,
                        pageNumber: chunk.metadata?.pageNumber,
                        sectionTitle: chunk.metadata?.sectionTitle,
                        metadata: {
                            ...chunk.metadata,
                            documentTitle: parsed.metadata?.title,
                            documentAuthor: parsed.metadata?.author,
                        },
                        // NOTA: El embedding se insertará via SQL raw porque Drizzle no soporta vector
                    });
                    allEmbeddings.push(embedding);
                }

                // Actualizar progreso
                const progress = 50 + Math.round((i / chunks.length) * 40);
                updateJob(job.id, { progress });
            }

            // 7. Insertar chunks (sin embeddings por ahora, se agregarán via SQL)
            updateJob(job.id, { progress: 90 });

            if (allChunksToInsert.length > 0) {
                const inserted = await db
                    .insert(fluxcoreDocumentChunks)
                    .values(allChunksToInsert)
                    .returning({ id: fluxcoreDocumentChunks.id });

                for (let i = 0; i < inserted.length; i++) {
                    const rowId = inserted[i]?.id;
                    const embedding = allEmbeddings[i];
                    if (!rowId) continue;
                    if (!embedding || embedding.length === 0) continue;

                    const embeddingStr = `[${embedding.join(',')}]`;
                    await db.execute(sql`
                      UPDATE fluxcore_document_chunks
                      SET embedding = ${sql.raw(`'${embeddingStr}'::vector`)}
                      WHERE id = ${rowId}::uuid
                    `);
                }
            }

            // 8. Actualizar estado del archivo a "completed"
            await db
                .update(fluxcoreVectorStoreFiles)
                .set({ status: 'completed' })
                .where(eq(fluxcoreVectorStoreFiles.id, fileId));

            // 9. Sincronizar stats del vector store padre
            await syncVectorStoreStats(vectorStoreId);

            updateJob(job.id, {
                status: 'completed',
                progress: 100,
                completedAt: new Date()
            });

            return {
                fileId,
                chunksCreated: chunks.length,
                tokensProcessed: chunkingResult.totalTokens,
                embeddingsGenerated: chunks.length,
                processingTimeMs: Date.now() - startTime,
            };

        } catch (error: any) {
            console.error('Document processing error:', error);

            // Actualizar estado del archivo a "failed"
            await db
                .update(fluxcoreVectorStoreFiles)
                .set({
                    status: 'failed',
                    errorMessage: error.message,
                })
                .where(eq(fluxcoreVectorStoreFiles.id, fileId));

            await syncVectorStoreStats(vectorStoreId);

            updateJob(job.id, {
                status: 'failed',
                error: error.message,
                completedAt: new Date(),
            });

            throw error;
        }
    }

    /**
     * Procesa múltiples documentos en paralelo (con límite de concurrencia)
     */
    async processDocuments(
        files: Array<{
            fileId: string;
            content: Buffer | string;
            mimeType: string;
        }>,
        vectorStoreId: string,
        accountId: string,
        concurrency = 3
    ): Promise<ProcessingResult[]> {
        const results: ProcessingResult[] = [];

        // Procesar en batches de `concurrency`
        for (let i = 0; i < files.length; i += concurrency) {
            const batch = files.slice(i, i + concurrency);
            const batchResults = await Promise.allSettled(
                batch.map(file =>
                    this.processDocument(
                        file.fileId,
                        vectorStoreId,
                        accountId,
                        file.content,
                        file.mimeType
                    )
                )
            );

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
            }
        }

        return results;
    }

    /**
     * Re-procesa todos los documentos de un vector store
     * Útil cuando cambia la configuración de chunking/embedding
     */
    async reprocessVectorStore(
        vectorStoreId: string,
        _accountId: string
    ): Promise<{ processed: number; failed: number }> {
        // Obtener todos los archivos del vector store
        const files = await db
            .select()
            .from(fluxcoreVectorStoreFiles)
            .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId));

        let processed = 0;
        let failed = 0;

        for (const file of files) {
            try {
                // TODO: Obtener contenido del archivo desde storage
                // Por ahora, solo marcamos como pending
                await db
                    .update(fluxcoreVectorStoreFiles)
                    .set({ status: 'pending' })
                    .where(eq(fluxcoreVectorStoreFiles.id, file.id));

                processed++;
            } catch (error) {
                console.error(`Failed to reprocess file ${file.id}:`, error);
                failed++;
            }
        }

        return { processed, failed };
    }

    /**
     * Obtiene el estado de un job de procesamiento
     */
    getJobStatus(jobId: string): ProcessingJob | undefined {
        return processingJobs.get(jobId);
    }

    /**
     * Lista jobs de procesamiento recientes
     */
    listJobs(limit = 100): ProcessingJob[] {
        return Array.from(processingJobs.values())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
}

// Singleton export
export const documentProcessingService = new DocumentProcessingService();
