/**
 * RAGConfigService - Servicio de configuración RAG
 * 
 * Gestiona las configuraciones de chunking, embedding y retrieval
 * para Vector Stores a nivel de cuenta o asset específico.
 * 
 * RAG-003: Configuración Granular de RAG
 */

import { db } from '@fluxcore/db';
import {
    fluxcoreRagConfigurations,
    type NewFluxcoreRagConfiguration,
    type RAGConfig,
    toRAGConfig,
    DEFAULT_RAG_CONFIG,
} from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

export class RAGConfigService {
    /**
     * Obtiene la configuración efectiva para un Vector Store
     * Prioridad: VS específico > Account default > System default
     */
    async getEffectiveConfig(vectorStoreId: string, accountId: string): Promise<RAGConfig> {
        // 1. Intentar config específica del VS
        const vsConfig = await db
            .select()
            .from(fluxcoreRagConfigurations)
            .where(eq(fluxcoreRagConfigurations.vectorStoreId, vectorStoreId))
            .limit(1);

        if (vsConfig.length > 0) {
            return toRAGConfig(vsConfig[0]);
        }

        // 2. Intentar config default de la cuenta
        const accountConfig = await db
            .select()
            .from(fluxcoreRagConfigurations)
            .where(and(
                eq(fluxcoreRagConfigurations.accountId, accountId),
                eq(fluxcoreRagConfigurations.isDefault, true)
            ))
            .limit(1);

        if (accountConfig.length > 0) {
            return toRAGConfig(accountConfig[0]);
        }

        // 3. Retornar config por defecto del sistema
        return {
            id: 'system-default',
            ...DEFAULT_RAG_CONFIG,
        } as RAGConfig;
    }

    /**
     * Obtiene configuración por ID
     */
    async getById(configId: string): Promise<RAGConfig | null> {
        const result = await db
            .select()
            .from(fluxcoreRagConfigurations)
            .where(eq(fluxcoreRagConfigurations.id, configId))
            .limit(1);

        return result.length > 0 ? toRAGConfig(result[0]) : null;
    }

    /**
     * Obtiene configuración de un Vector Store específico
     */
    async getByVectorStore(vectorStoreId: string): Promise<RAGConfig | null> {
        const result = await db
            .select()
            .from(fluxcoreRagConfigurations)
            .where(eq(fluxcoreRagConfigurations.vectorStoreId, vectorStoreId))
            .limit(1);

        return result.length > 0 ? toRAGConfig(result[0]) : null;
    }

    /**
     * Lista todas las configuraciones de una cuenta
     */
    async listByAccount(accountId: string): Promise<RAGConfig[]> {
        const results = await db
            .select()
            .from(fluxcoreRagConfigurations)
            .where(eq(fluxcoreRagConfigurations.accountId, accountId));

        return results.map(toRAGConfig);
    }

    /**
     * Crea una nueva configuración
     */
    async create(config: Partial<RAGConfig> & { vectorStoreId?: string; accountId?: string }): Promise<RAGConfig> {
        const newConfig: NewFluxcoreRagConfiguration = {
            vectorStoreId: config.vectorStoreId,
            accountId: config.accountId,
            name: config.name,
            isDefault: config.isDefault || false,

            // Chunking
            chunkingStrategy: config.chunking?.strategy || 'recursive',
            chunkSizeTokens: config.chunking?.sizeTokens || 512,
            chunkOverlapTokens: config.chunking?.overlapTokens || 50,
            chunkSeparators: config.chunking?.separators || ['\n\n', '\n', '. ', ' '],
            chunkCustomRegex: config.chunking?.customRegex,
            minChunkSize: config.chunking?.minSize || 50,
            maxChunkSize: config.chunking?.maxSize || 2000,

            // Embedding
            embeddingProvider: config.embedding?.provider || 'openai',
            embeddingModel: config.embedding?.model || 'text-embedding-3-small',
            embeddingDimensions: config.embedding?.dimensions || 1536,
            embeddingBatchSize: config.embedding?.batchSize || 100,
            embeddingEndpointUrl: config.embedding?.endpointUrl,
            embeddingApiKeyRef: config.embedding?.apiKeyRef,

            // Retrieval
            retrievalTopK: config.retrieval?.topK || 10,
            retrievalMinScore: String(Math.max(0.05, Math.min(0.7, config.retrieval?.minScore || 0.3))),
            retrievalMaxTokens: config.retrieval?.maxTokens || 2000,
            hybridSearchEnabled: config.retrieval?.hybridSearch?.enabled || false,
            hybridKeywordWeight: String(config.retrieval?.hybridSearch?.keywordWeight || 0.3),
            rerankEnabled: config.retrieval?.rerank?.enabled || false,
            rerankProvider: config.retrieval?.rerank?.provider,
            rerankModel: config.retrieval?.rerank?.model,
            rerankTopN: config.retrieval?.rerank?.topN || 5,

            // Processing
            supportedMimeTypes: config.processing?.supportedMimeTypes || DEFAULT_RAG_CONFIG.processing.supportedMimeTypes,
            ocrEnabled: config.processing?.ocr?.enabled || false,
            ocrLanguage: config.processing?.ocr?.language || 'spa',
            extractMetadata: config.processing?.metadata?.extract !== false,
            metadataFields: config.processing?.metadata?.fields || DEFAULT_RAG_CONFIG.processing.metadata.fields,
        };

        const [result] = await db
            .insert(fluxcoreRagConfigurations)
            .values(newConfig)
            .returning();

        return toRAGConfig(result);
    }

    /**
     * Actualiza una configuración existente
     */
    async update(configId: string, updates: Partial<RAGConfig>): Promise<RAGConfig> {
        const updateData: Partial<NewFluxcoreRagConfiguration> = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;

        // Chunking
        if (updates.chunking) {
            if (updates.chunking.strategy) updateData.chunkingStrategy = updates.chunking.strategy;
            if (updates.chunking.sizeTokens) updateData.chunkSizeTokens = updates.chunking.sizeTokens;
            if (updates.chunking.overlapTokens) updateData.chunkOverlapTokens = updates.chunking.overlapTokens;
            if (updates.chunking.separators) updateData.chunkSeparators = updates.chunking.separators;
            if (updates.chunking.customRegex !== undefined) updateData.chunkCustomRegex = updates.chunking.customRegex;
            if (updates.chunking.minSize) updateData.minChunkSize = updates.chunking.minSize;
            if (updates.chunking.maxSize) updateData.maxChunkSize = updates.chunking.maxSize;
        }

        // Embedding
        if (updates.embedding) {
            if (updates.embedding.provider) updateData.embeddingProvider = updates.embedding.provider;
            if (updates.embedding.model) updateData.embeddingModel = updates.embedding.model;
            if (updates.embedding.dimensions) updateData.embeddingDimensions = updates.embedding.dimensions;
            if (updates.embedding.batchSize) updateData.embeddingBatchSize = updates.embedding.batchSize;
            if (updates.embedding.endpointUrl !== undefined) updateData.embeddingEndpointUrl = updates.embedding.endpointUrl;
            if (updates.embedding.apiKeyRef !== undefined) updateData.embeddingApiKeyRef = updates.embedding.apiKeyRef;
        }

        // Retrieval
        if (updates.retrieval) {
            if (updates.retrieval.topK !== undefined) updateData.retrievalTopK = updates.retrieval.topK;
            if (updates.retrieval.minScore !== undefined) {
                const clamped = Math.max(0.05, Math.min(0.7, updates.retrieval.minScore));
                updateData.retrievalMinScore = String(clamped);
            }
            if (updates.retrieval.maxTokens !== undefined) updateData.retrievalMaxTokens = updates.retrieval.maxTokens;
            if (updates.retrieval.hybridSearch) {
                if (updates.retrieval.hybridSearch.enabled !== undefined) {
                    updateData.hybridSearchEnabled = updates.retrieval.hybridSearch.enabled;
                }
                if (updates.retrieval.hybridSearch.keywordWeight !== undefined) {
                    updateData.hybridKeywordWeight = String(updates.retrieval.hybridSearch.keywordWeight);
                }
            }
            if (updates.retrieval.rerank) {
                if (updates.retrieval.rerank.enabled !== undefined) updateData.rerankEnabled = updates.retrieval.rerank.enabled;
                if (updates.retrieval.rerank.provider !== undefined) updateData.rerankProvider = updates.retrieval.rerank.provider;
                if (updates.retrieval.rerank.model !== undefined) updateData.rerankModel = updates.retrieval.rerank.model;
                if (updates.retrieval.rerank.topN !== undefined) updateData.rerankTopN = updates.retrieval.rerank.topN;
            }
        }

        // Processing
        if (updates.processing) {
            if (updates.processing.supportedMimeTypes) {
                updateData.supportedMimeTypes = updates.processing.supportedMimeTypes;
            }
            if (updates.processing.ocr) {
                if (updates.processing.ocr.enabled !== undefined) updateData.ocrEnabled = updates.processing.ocr.enabled;
                if (updates.processing.ocr.language) updateData.ocrLanguage = updates.processing.ocr.language;
            }
            if (updates.processing.metadata) {
                if (updates.processing.metadata.extract !== undefined) {
                    updateData.extractMetadata = updates.processing.metadata.extract;
                }
                if (updates.processing.metadata.fields) updateData.metadataFields = updates.processing.metadata.fields;
            }
        }

        const [result] = await db
            .update(fluxcoreRagConfigurations)
            .set(updateData)
            .where(eq(fluxcoreRagConfigurations.id, configId))
            .returning();

        return toRAGConfig(result);
    }

    /**
     * Elimina una configuración
     */
    async delete(configId: string): Promise<boolean> {
        const result = await db
            .delete(fluxcoreRagConfigurations)
            .where(eq(fluxcoreRagConfigurations.id, configId))
            .returning();

        return result.length > 0;
    }

    /**
     * Crea o actualiza la configuración default de una cuenta
     */
    async setAccountDefault(accountId: string, config: Partial<RAGConfig>): Promise<RAGConfig> {
        // Buscar config default existente
        const existing = await db
            .select()
            .from(fluxcoreRagConfigurations)
            .where(and(
                eq(fluxcoreRagConfigurations.accountId, accountId),
                eq(fluxcoreRagConfigurations.isDefault, true)
            ))
            .limit(1);

        if (existing.length > 0) {
            return this.update(existing[0].id, config);
        }

        return this.create({
            ...config,
            accountId,
            isDefault: true,
            name: config.name || 'Account Default',
        });
    }

    /**
     * Crea o actualiza la configuración de un Vector Store
     */
    async setVectorStoreConfig(vectorStoreId: string, config: Partial<RAGConfig>): Promise<RAGConfig> {
        // Buscar config existente
        const existing = await db
            .select()
            .from(fluxcoreRagConfigurations)
            .where(eq(fluxcoreRagConfigurations.vectorStoreId, vectorStoreId))
            .limit(1);

        if (existing.length > 0) {
            return this.update(existing[0].id, config);
        }

        return this.create({
            ...config,
            vectorStoreId,
            name: config.name || 'Vector Store Config',
        });
    }

    /**
     * Guarda configuración desde la UI (método conveniente)
     */
    async saveConfig(params: {
        vectorStoreId: string;
        accountId: string;
        chunking?: {
            strategy: string;
            sizeTokens: number;
            overlapTokens: number;
            minSize?: number;
            separators?: string[];
        };
        embedding?: {
            provider: string;
            model: string;
            dimensions?: number;
            batchSize?: number;
        };
        retrieval?: {
            topK: number;
            minScore: number;
            maxTokens: number;
            rerankEnabled?: boolean;
            hybridSearchEnabled?: boolean;
        };
    }): Promise<RAGConfig> {
        const config: Partial<RAGConfig> = {};

        if (params.chunking) {
            config.chunking = {
                strategy: params.chunking.strategy as any,
                sizeTokens: params.chunking.sizeTokens,
                overlapTokens: params.chunking.overlapTokens,
                minSize: params.chunking.minSize || 50,
                maxSize: params.chunking.sizeTokens * 2 || 2000,
                separators: params.chunking.separators || ['\n\n', '\n', '. ', ' '],
            };
        }

        if (params.embedding) {
            config.embedding = {
                provider: params.embedding.provider as any,
                model: params.embedding.model,
                dimensions: params.embedding.dimensions || 1536,
                batchSize: params.embedding.batchSize || 100,
            };
        }

        if (params.retrieval) {
            config.retrieval = {
                topK: params.retrieval.topK,
                minScore: Math.max(0.05, Math.min(0.7, params.retrieval.minScore)),
                maxTokens: params.retrieval.maxTokens,
                hybridSearch: {
                    enabled: params.retrieval.hybridSearchEnabled || false,
                    keywordWeight: 0.3,
                },
                rerank: {
                    enabled: params.retrieval.rerankEnabled || false,
                    topN: 5,
                },
            };
        }

        return this.setVectorStoreConfig(params.vectorStoreId, config);
    }
}

// Singleton export
export const ragConfigService = new RAGConfigService();
