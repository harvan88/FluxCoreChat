/**
 * FluxCore: RAG Configurations Schema
 * 
 * Configuración granular de chunking, embedding y retrieval por Vector Store.
 * Permite personalizar cómo se procesan y buscan los documentos.
 * 
 * RAG-003: Configuración Granular de RAG
 */

import { pgTable, uuid, varchar, timestamp, text, integer, boolean, numeric, jsonb, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { fluxcoreVectorStores } from './fluxcore-vector-stores';

/**
 * Estrategias de chunking disponibles
 */
export type ChunkingStrategy =
    | 'fixed'      // Tamaño fijo de tokens
    | 'recursive'  // Divide por separadores jerárquicos (default)
    | 'semantic'   // Agrupa por similitud semántica
    | 'sentence'   // Por oraciones completas
    | 'paragraph'  // Por párrafos
    | 'page'       // Por páginas (para PDFs)
    | 'custom';    // Regex personalizado

/**
 * Proveedores de embeddings soportados
 */
export type EmbeddingProvider =
    | 'openai'    // OpenAI API
    | 'cohere'    // Cohere API
    | 'google'    // Google Vertex AI
    | 'azure'     // Azure OpenAI
    | 'local'     // Modelo local (sentence-transformers)
    | 'custom';   // Endpoint HTTP personalizado

/**
 * Proveedores de re-ranking soportados
 */
export type RerankProvider =
    | 'cohere'        // Cohere Rerank
    | 'cross-encoder' // Cross-encoder local
    | 'custom';       // Endpoint personalizado

/**
 * Tabla de configuraciones RAG
 */
export const fluxcoreRagConfigurations = pgTable('fluxcore_rag_configurations', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Scope: Vector Store específico o cuenta (default)
    vectorStoreId: uuid('vector_store_id')
        .references(() => fluxcoreVectorStores.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
        .references(() => accounts.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 100 }),
    isDefault: boolean('is_default').default(false),

    // ═══════════════════════════════════════════════════════════════════════════
    // CHUNKING CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    chunkingStrategy: varchar('chunking_strategy', { length: 50 })
        .notNull()
        .default('recursive')
        .$type<ChunkingStrategy>(),

    chunkSizeTokens: integer('chunk_size_tokens').default(512),
    chunkOverlapTokens: integer('chunk_overlap_tokens').default(50),
    chunkSeparators: jsonb('chunk_separators').$type<string[]>().default(['\n\n', '\n', '. ', ' ']),
    chunkCustomRegex: text('chunk_custom_regex'),

    minChunkSize: integer('min_chunk_size').default(50),
    maxChunkSize: integer('max_chunk_size').default(2000),

    // ═══════════════════════════════════════════════════════════════════════════
    // EMBEDDING CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    embeddingProvider: varchar('embedding_provider', { length: 50 })
        .notNull()
        .default('openai')
        .$type<EmbeddingProvider>(),

    embeddingModel: varchar('embedding_model', { length: 100 }).default('text-embedding-3-small'),
    embeddingDimensions: integer('embedding_dimensions').default(1536),
    embeddingBatchSize: integer('embedding_batch_size').default(100),

    // Para proveedores custom
    embeddingEndpointUrl: text('embedding_endpoint_url'),
    embeddingApiKeyRef: varchar('embedding_api_key_ref', { length: 255 }),

    // ═══════════════════════════════════════════════════════════════════════════
    // RETRIEVAL CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    retrievalTopK: integer('retrieval_top_k').default(10),
    retrievalMinScore: numeric('retrieval_min_score', { precision: 4, scale: 3 }).default('0.700'),
    retrievalMaxTokens: integer('retrieval_max_tokens').default(2000),

    // Búsqueda híbrida
    hybridSearchEnabled: boolean('hybrid_search_enabled').default(false),
    hybridKeywordWeight: numeric('hybrid_keyword_weight', { precision: 3, scale: 2 }).default('0.30'),

    // Re-ranking
    rerankEnabled: boolean('rerank_enabled').default(false),
    rerankProvider: varchar('rerank_provider', { length: 50 }).$type<RerankProvider>(),
    rerankModel: varchar('rerank_model', { length: 100 }),
    rerankTopN: integer('rerank_top_n').default(5),

    // ═══════════════════════════════════════════════════════════════════════════
    // PROCESSING CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    supportedMimeTypes: jsonb('supported_mime_types').$type<string[]>().default([
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]),

    ocrEnabled: boolean('ocr_enabled').default(false),
    ocrLanguage: varchar('ocr_language', { length: 10 }).default('spa'),

    extractMetadata: boolean('extract_metadata').default(true),
    metadataFields: jsonb('metadata_fields').$type<string[]>().default([
        'title', 'author', 'created_date', 'page_count'
    ]),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    vectorStoreIdx: index('idx_rag_config_vs_drizzle').on(table.vectorStoreId),
    accountIdx: index('idx_rag_config_account_drizzle').on(table.accountId),
}));

export type FluxcoreRagConfiguration = typeof fluxcoreRagConfigurations.$inferSelect;
export type NewFluxcoreRagConfiguration = typeof fluxcoreRagConfigurations.$inferInsert;

/**
 * Interface para configuración de chunking
 */
export interface ChunkingConfig {
    strategy: ChunkingStrategy;
    sizeTokens: number;
    overlapTokens: number;
    separators: string[];
    customRegex?: string;
    minSize: number;
    maxSize: number;
}

/**
 * Interface para configuración de embeddings
 */
export interface EmbeddingConfig {
    provider: EmbeddingProvider;
    model: string;
    dimensions: number;
    batchSize: number;
    endpointUrl?: string;
    apiKeyRef?: string;
}

/**
 * Interface para configuración de retrieval
 */
export interface RetrievalConfig {
    topK: number;
    minScore: number;
    maxTokens: number;
    hybridSearch: {
        enabled: boolean;
        keywordWeight: number;
    };
    rerank: {
        enabled: boolean;
        provider?: RerankProvider;
        model?: string;
        topN: number;
    };
}

/**
 * Interface para configuración de procesamiento
 */
export interface ProcessingConfig {
    supportedMimeTypes: string[];
    ocr: {
        enabled: boolean;
        language: string;
    };
    metadata: {
        extract: boolean;
        fields: string[];
    };
}

/**
 * Interface completa de configuración RAG
 */
export interface RAGConfig {
    id: string;
    name?: string;
    vectorStoreId?: string;
    accountId?: string;
    isDefault: boolean;

    chunking: ChunkingConfig;
    embedding: EmbeddingConfig;
    retrieval: RetrievalConfig;
    processing: ProcessingConfig;
}

/**
 * Convierte un registro de DB a RAGConfig
 */
export function toRAGConfig(record: FluxcoreRagConfiguration): RAGConfig {
    return {
        id: record.id,
        name: record.name || undefined,
        vectorStoreId: record.vectorStoreId || undefined,
        accountId: record.accountId || undefined,
        isDefault: record.isDefault || false,

        chunking: {
            strategy: record.chunkingStrategy as ChunkingStrategy,
            sizeTokens: record.chunkSizeTokens || 512,
            overlapTokens: record.chunkOverlapTokens || 50,
            separators: record.chunkSeparators || ['\n\n', '\n', '. ', ' '],
            customRegex: record.chunkCustomRegex || undefined,
            minSize: record.minChunkSize || 50,
            maxSize: record.maxChunkSize || 2000,
        },

        embedding: {
            provider: record.embeddingProvider as EmbeddingProvider,
            model: record.embeddingModel || 'text-embedding-3-small',
            dimensions: record.embeddingDimensions || 1536,
            batchSize: record.embeddingBatchSize || 100,
            endpointUrl: record.embeddingEndpointUrl || undefined,
            apiKeyRef: record.embeddingApiKeyRef || undefined,
        },

        retrieval: {
            topK: record.retrievalTopK || 10,
            minScore: parseFloat(record.retrievalMinScore || '0.3'),
            maxTokens: record.retrievalMaxTokens || 2000,
            hybridSearch: {
                enabled: record.hybridSearchEnabled || false,
                keywordWeight: parseFloat(record.hybridKeywordWeight || '0.3'),
            },
            rerank: {
                enabled: record.rerankEnabled || false,
                provider: record.rerankProvider as RerankProvider | undefined,
                model: record.rerankModel || undefined,
                topN: record.rerankTopN || 5,
            },
        },

        processing: {
            supportedMimeTypes: record.supportedMimeTypes || [],
            ocr: {
                enabled: record.ocrEnabled || false,
                language: record.ocrLanguage || 'spa',
            },
            metadata: {
                extract: record.extractMetadata || true,
                fields: record.metadataFields || [],
            },
        },
    };
}

/**
 * Configuración por defecto del sistema
 */
export const DEFAULT_RAG_CONFIG: Omit<RAGConfig, 'id'> = {
    isDefault: true,
    chunking: {
        strategy: 'recursive',
        sizeTokens: 512,
        overlapTokens: 50,
        separators: ['\n\n', '\n', '. ', ' '],
        minSize: 50,
        maxSize: 2000,
    },
    embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        batchSize: 100,
    },
    retrieval: {
        topK: 10,
        minScore: 0.3,
        maxTokens: 2000,
        hybridSearch: {
            enabled: false,
            keywordWeight: 0.3,
        },
        rerank: {
            enabled: false,
            topN: 5,
        },
    },
    processing: {
        supportedMimeTypes: [
            'application/pdf',
            'text/plain',
            'text/markdown',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        ocr: {
            enabled: false,
            language: 'spa',
        },
        metadata: {
            extract: true,
            fields: ['title', 'author', 'created_date', 'page_count'],
        },
    },
};
