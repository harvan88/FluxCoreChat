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
     * Busca chunks relevantes para una query en uno o más vector stores.
     * Soporta búsqueda multi-término si la query contiene comas.
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
            return {
                chunks: [],
                totalTokens: 0,
                query,
                vectorStoreIds,
                searchTimeMs: Date.now() - startTime,
            };
        }

        // 2. Fragmentar query por comas para búsqueda multi-término (Sujeto, Entidad1, Entidad2)
        const queryTerms = query.split(',').map(q => q.trim()).filter(q => q.length > 0);
        if (queryTerms.length === 0) queryTerms.push(query);

        // 3. Obtener configuraciones de los vector stores (agrupar para optimizar)
        const vsConfigs = new Map<string, any>();
        const groups = new Map<string, { config: any, ids: string[] }>();
        
        for (const vsId of accessibleVectorStores) {
            const config = await ragConfigService.getEffectiveConfig(vsId, accountId);
            const configKey = `${config.embedding.provider}:${config.embedding.model}:${config.embedding.dimensions}`;
            
            if (!groups.has(configKey)) {
                groups.set(configKey, { config, ids: [] });
            }
            groups.get(configKey)!.ids.push(vsId);
        }

        const groupConfigs = Array.from(groups.values());
        const baseConfig = groupConfigs[0].config;
        const topK = options?.topK ?? baseConfig.retrieval.topK;
        const minScore = options?.minScore ?? baseConfig.retrieval.minScore;
        const maxTokens = options?.maxTokens ?? baseConfig.retrieval.maxTokens;

        const allChunksMap = new Map<string, RetrievedChunk>();

        // 4. Ejecutar búsquedas para cada término y cada configuración
        const searchTasks: Promise<void>[] = [];

        for (const term of queryTerms) {
            for (const group of groupConfigs) {
                const { config, ids } = group;
                
                searchTasks.push((async () => {
                    try {
                        // Generar embedding específico para este término y esta dimensión
                        const queryEmbeddingData = await embeddingService.embedWithConfig(term, {
                            provider: config.embedding.provider,
                            model: config.embedding.model,
                            dimensions: config.embedding.dimensions,
                            endpointUrl: config.embedding.endpointUrl,
                        });

                        // Buscar en este grupo para este término
                        const chunks = await this.vectorSearch(
                            term,
                            queryEmbeddingData.embedding,
                            ids,
                            accountId,
                            topK, 
                            minScore
                        );

                        // Agregar a mapa global para deduplicación (preferir mayor similitud)
                        for (const chunk of chunks) {
                            const existing = allChunksMap.get(chunk.id);
                            if (!existing || chunk.similarity > existing.similarity) {
                                allChunksMap.set(chunk.id, chunk);
                            }
                        }
                    } catch (error: any) {
                        console.error(`[retrieval] ❌ Error buscando "${term}" en grupo ${config.embedding.provider}:`, error.message);
                    }
                })());
            }
        }

        await Promise.all(searchTasks);

        // 5. Ordenar todos los resultados únicos por relevancia
        const allChunks = Array.from(allChunksMap.values());
        allChunks.sort((a, b) => b.similarity - a.similarity);

        // 6. Filtrar por tokens máximos y topK
        let totalTokens = 0;
        const filteredChunks: RetrievedChunk[] = [];

        for (const chunk of allChunks) {
            if (totalTokens + chunk.tokenCount <= maxTokens) {
                filteredChunks.push(chunk);
                totalTokens += chunk.tokenCount;
            }
            if (filteredChunks.length >= topK) break;
        }

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
        query: string,
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
            const embeddingStr = `[${queryEmbedding.join(',')}]`;
            const vsIdsStr = vectorStoreIds.map(id => `'${id}'`).join(',');
            
            // Extraer el sustantivo puro del usuario limpiándolo para evitar SQL injection crashes (BM25 fallback)
            const sanitizedKeyword = query.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]/g, '').trim();
            const keywordPattern = sanitizedKeyword.length > 2 ? `%${sanitizedKeyword}%` : 'NO_MATCH_XYZ';

            const result = await db.execute(sql`
      SELECT * FROM (
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
          CASE
              WHEN vector_dims(c.embedding) = ${queryEmbedding.length}
              THEN 1 - (c.embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)})
              WHEN c.content ILIKE ${keywordPattern} THEN 0.5
              ELSE 0.0
          END as similarity,
          vector_dims(c.embedding) = ${queryEmbedding.length} as dims_match
        FROM fluxcore_document_chunks c
        WHERE c.account_id = ${accountId}::uuid
          AND c.vector_store_id = ANY(ARRAY[${sql.raw(vsIdsStr)}]::uuid[])
          AND c.embedding IS NOT NULL
          AND vector_dims(c.embedding) = ${queryEmbedding.length}
      ) scored
      WHERE scored.similarity >= ${minScore}
      ORDER BY scored.similarity DESC
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
