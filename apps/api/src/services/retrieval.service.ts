/**
 * Retrieval Service - Búsqueda Semántica y Construcción de Contexto
 * 
 * Implementa la búsqueda en vector stores para RAG:
 * 1. Query embedding
 * 2. Búsqueda vectorial (similarity search)
 * 3. Re-ranking (opcional)
 * 4. Construcción de contexto
 * 
 * RAG-007: Retrieval Service
 */

import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';
import { embeddingService } from './embedding.service';
import { ragConfigService } from './rag-config.service';
import { permissionService } from './permission.service';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export interface RetrievedChunk {
    id: string;
    content: string;
    fileId: string;
    vectorStoreId: string;
    chunkIndex: number;
    similarity: number;
    tokenCount: number;
    metadata?: {
        pageNumber?: number;
        sectionTitle?: string;
        documentTitle?: string;
        documentAuthor?: string;
    };
}

export interface RetrievalResult {
    chunks: RetrievedChunk[];
    totalTokens: number;
    query: string;
    vectorStoreIds: string[];
    searchTimeMs: number;
}

export interface RetrievalOptions {
    topK?: number;
    minScore?: number;
    maxTokens?: number;
    rerank?: boolean;
    hybridSearch?: boolean;
}

export interface RAGContext {
    context: string;
    sources: Array<{
        content: string;
        source: string;
        similarity: number;
    }>;
    totalTokens: number;
    chunksUsed: number;
}

// ════════════════════════════════════════════════════════════════════════════
// Main Retrieval Service
// ════════════════════════════════════════════════════════════════════════════

export class RetrievalService {
    /**
     * Busca chunks relevantes para una query en uno o más vector stores
     */
    async search(
        query: string,
        vectorStoreIds: string[],
        accountId: string,
        options?: RetrievalOptions
    ): Promise<RetrievalResult> {
        const startTime = Date.now();

        // 1. Validar acceso a todos los vector stores
        const accessibleVectorStores: string[] = [];
        for (const vsId of vectorStoreIds) {
            const access = await permissionService.checkAccess(accountId, 'vector_store', vsId, 'read');
            if (access.hasAccess) {
                accessibleVectorStores.push(vsId);
            }
        }

        if (accessibleVectorStores.length === 0) {
            console.log('[retrieval] ❌ Sin acceso a vector stores:', vectorStoreIds);
            return {
                chunks: [],
                totalTokens: 0,
                query,
                vectorStoreIds,
                searchTimeMs: Date.now() - startTime,
            };
        }
        console.log('[retrieval] ✓ Vector stores accesibles:', accessibleVectorStores.length);

        // 2. Obtener configuración (usando el primer VS como referencia)
        const config = await ragConfigService.getEffectiveConfig(accessibleVectorStores[0], accountId);

        const topK = options?.topK ?? config.retrieval.topK;
        const minScore = options?.minScore ?? config.retrieval.minScore;
        const maxTokens = options?.maxTokens ?? config.retrieval.maxTokens;

        // 3. Generar embedding de la query
        console.log('[retrieval] Generando embedding con config:', {
            provider: config.embedding.provider,
            model: config.embedding.model,
        });

        let queryEmbedding;
        try {
            queryEmbedding = await embeddingService.embedWithConfig(query, {
                provider: config.embedding.provider,
                model: config.embedding.model,
                dimensions: config.embedding.dimensions,
                endpointUrl: config.embedding.endpointUrl,
            });
            console.log('[retrieval] ✓ Embedding generado, dimensiones:', queryEmbedding.embedding?.length || 0);
        } catch (embError: any) {
            console.error('[retrieval] ❌ Error generando embedding:', embError.message);
            return {
                chunks: [],
                totalTokens: 0,
                query,
                vectorStoreIds,
                searchTimeMs: Date.now() - startTime,
            };
        }

        // 4. Buscar chunks similares usando pgvector
        console.log('[retrieval] Buscando chunks con minScore:', minScore, 'topK:', topK);
        const chunks = await this.vectorSearch(
            queryEmbedding.embedding,
            accessibleVectorStores,
            accountId,
            topK * 2, // Traer más para filtrar después
            minScore
        );
        console.log('[retrieval] Chunks encontrados:', chunks.length);

        // 5. Filtrar por tokens máximos
        let totalTokens = 0;
        const filteredChunks: RetrievedChunk[] = [];

        for (const chunk of chunks) {
            if (totalTokens + chunk.tokenCount <= maxTokens) {
                filteredChunks.push(chunk);
                totalTokens += chunk.tokenCount;
            }
            if (filteredChunks.length >= topK) break;
        }

        // 6. Re-ranking opcional
        // TODO: Implementar re-ranking con Cohere o cross-encoder

        return {
            chunks: filteredChunks,
            totalTokens,
            query,
            vectorStoreIds: accessibleVectorStores,
            searchTimeMs: Date.now() - startTime,
        };
    }

    /**
     * Construye contexto RAG para inyectar en el prompt
     */
    async buildContext(
        query: string,
        vectorStoreIds: string[],
        accountId: string,
        options?: RetrievalOptions
    ): Promise<RAGContext> {
        const result = await this.search(query, vectorStoreIds, accountId, options);

        if (result.chunks.length === 0) {
            return {
                context: '',
                sources: [],
                totalTokens: 0,
                chunksUsed: 0,
            };
        }

        // Construir contexto con formato estructurado
        const contextParts: string[] = [];
        const sources: RAGContext['sources'] = [];

        for (const chunk of result.chunks) {
            // Formato del chunk con metadata
            let chunkContext = '';

            if (chunk.metadata?.documentTitle) {
                chunkContext += `[Documento: ${chunk.metadata.documentTitle}]\n`;
            }
            if (chunk.metadata?.sectionTitle) {
                chunkContext += `[Sección: ${chunk.metadata.sectionTitle}]\n`;
            }
            if (chunk.metadata?.pageNumber) {
                chunkContext += `[Página: ${chunk.metadata.pageNumber}]\n`;
            }

            chunkContext += chunk.content;
            contextParts.push(chunkContext);

            sources.push({
                content: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '...' : ''),
                source: chunk.metadata?.documentTitle || `Chunk ${chunk.chunkIndex}`,
                similarity: chunk.similarity,
            });
        }

        const context = `
=== CONTEXTO DE BASE DE CONOCIMIENTO ===

${contextParts.join('\n\n---\n\n')}

=== FIN DEL CONTEXTO ===
`.trim();

        return {
            context,
            sources,
            totalTokens: result.totalTokens,
            chunksUsed: result.chunks.length,
        };
    }

    /**
     * Búsqueda vectorial usando pgvector
     */
    private async vectorSearch(
        queryEmbedding: number[],
        vectorStoreIds: string[],
        accountId: string,
        limit: number,
        minScore: number
    ): Promise<RetrievedChunk[]> {
        // Si no hay embeddings en el query, retornar vacío
        if (!queryEmbedding || queryEmbedding.length === 0) {
            return [];
        }

        try {
            // Construir query SQL para pgvector
            const embeddingStr = `[${queryEmbedding.join(',')}]`;
            const vsIdsStr = vectorStoreIds.map(id => `'${id}'`).join(',');

            const result = await db.execute(sql`
      SELECT 
        c.id,
        c.content,
        c.file_id as "fileId",
        c.vector_store_id as "vectorStoreId",
        c.chunk_index as "chunkIndex",
        c.token_count as "tokenCount",
        c.page_number as "pageNumber",
        c.section_title as "sectionTitle",
        c.metadata,
        1 - (c.embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) as similarity
      FROM fluxcore_document_chunks c
      WHERE c.account_id = ${accountId}::uuid
        AND c.vector_store_id = ANY(ARRAY[${sql.raw(vsIdsStr)}]::uuid[])
        AND c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) >= ${minScore}
      ORDER BY c.embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}
      LIMIT ${limit}
    `);

            // db.execute retorna un array directamente en Drizzle
            const rows = Array.isArray(result) ? result : [];

            return rows.map((row: any) => ({
                id: row.id,
                content: row.content,
                fileId: row.fileId,
                vectorStoreId: row.vectorStoreId,
                chunkIndex: row.chunkIndex,
                similarity: parseFloat(row.similarity),
                tokenCount: row.tokenCount || 0,
                metadata: {
                    pageNumber: row.pageNumber,
                    sectionTitle: row.sectionTitle,
                    ...(row.metadata || {}),
                },
            }));
        } catch (error) {
            console.error('Vector search error:', error);
            return [];
        }
    }

    /**
     * Búsqueda híbrida (vectorial + keyword)
     * TODO: Implementar con ts_vector de PostgreSQL
     */
    async hybridSearch(
        query: string,
        vectorStoreIds: string[],
        accountId: string,
        _keywordWeight = 0.3
    ): Promise<RetrievalResult> {
        // Por ahora, solo hacer búsqueda vectorial
        // TODO: Combinar con búsqueda full-text de PostgreSQL
        return this.search(query, vectorStoreIds, accountId);
    }

    /**
     * Busca en todos los vector stores accesibles de una cuenta
     */
    async searchAllAccessible(
        query: string,
        accountId: string,
        options?: RetrievalOptions
    ): Promise<RetrievalResult> {
        // Obtener todos los vector stores accesibles
        const accessible = await permissionService.listAccessibleAssets({
            accountId,
            assetType: 'vector_store',
        });

        const vectorStoreIds = accessible.map(a => a.assetId);

        if (vectorStoreIds.length === 0) {
            return {
                chunks: [],
                totalTokens: 0,
                query,
                vectorStoreIds: [],
                searchTimeMs: 0,
            };
        }

        return this.search(query, vectorStoreIds, accountId, options);
    }
}

// Singleton export
export const retrievalService = new RetrievalService();
