/**
 * Embedding Service - Multi-Provider Embeddings
 * 
 * Soporta múltiples proveedores de embeddings con fallback automático.
 * Implementa interface común para OpenAI, Cohere, Google, Local, y Custom.
 * 
 * RAG-004: Multi-Provider Embeddings
 */

import { ragConfigService } from './rag-config.service';

// ════════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ════════════════════════════════════════════════════════════════════════════

export interface EmbeddingResult {
    embedding: number[];
    tokenCount: number;
    model: string;
    provider: string;
}

export interface BatchEmbeddingResult {
    embeddings: number[][];
    tokenCounts: number[];
    model: string;
    provider: string;
    totalTokens: number;
}

export interface EmbeddingProviderConfig {
    provider: string;
    model: string;
    dimensions: number;
    apiKey?: string;
    endpointUrl?: string;
    batchSize?: number;
}

interface OpenAIEmbeddingsResponse {
    data: Array<{ embedding: number[]; index: number }>;
    usage?: { total_tokens?: number };
}

interface CohereEmbedResponse {
    embeddings: number[][];
    meta?: { billed_units?: { input_tokens?: number } };
}

interface CustomEmbeddingsResponse {
    embeddings: number[][];
    tokenCounts?: number[];
    totalTokens?: number;
}

/**
 * Interface común para todos los proveedores de embeddings
 */
export interface IEmbeddingProvider {
    readonly name: string;
    readonly supportedModels: string[];

    /**
     * Genera embedding para un solo texto
     */
    embed(text: string, config: EmbeddingProviderConfig): Promise<EmbeddingResult>;

    /**
     * Genera embeddings para múltiples textos (batch)
     */
    embedBatch(texts: string[], config: EmbeddingProviderConfig): Promise<BatchEmbeddingResult>;

    /**
     * Verifica si el proveedor está disponible
     */
    isAvailable(config: EmbeddingProviderConfig): Promise<boolean>;
}

// ════════════════════════════════════════════════════════════════════════════
// OpenAI Embedding Provider
// ════════════════════════════════════════════════════════════════════════════

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
    readonly name = 'openai';
    readonly supportedModels = [
        'text-embedding-3-small',
        'text-embedding-3-large',
        'text-embedding-ada-002',
    ];

    async embed(text: string, config: EmbeddingProviderConfig): Promise<EmbeddingResult> {
        const result = await this.embedBatch([text], config);
        return {
            embedding: result.embeddings[0],
            tokenCount: result.tokenCounts[0],
            model: result.model,
            provider: this.name,
        };
    }

    async embedBatch(texts: string[], config: EmbeddingProviderConfig): Promise<BatchEmbeddingResult> {
        const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: config.model || 'text-embedding-3-small',
                input: texts,
                dimensions: config.dimensions,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${error}`);
        }

        const data = (await response.json()) as OpenAIEmbeddingsResponse;

        // Ordenar por index para mantener orden original
        const sorted = data.data.sort((a, b) => a.index - b.index);

        return {
            embeddings: sorted.map((item) => item.embedding),
            tokenCounts: texts.map(() => 0), // OpenAI no retorna token count por item
            model: config.model || 'text-embedding-3-small',
            provider: this.name,
            totalTokens: data.usage?.total_tokens || 0,
        };
    }

    async isAvailable(config: EmbeddingProviderConfig): Promise<boolean> {
        const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        return !!apiKey;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Cohere Embedding Provider
// ════════════════════════════════════════════════════════════════════════════

export class CohereEmbeddingProvider implements IEmbeddingProvider {
    readonly name = 'cohere';
    readonly supportedModels = [
        'embed-english-v3.0',
        'embed-multilingual-v3.0',
        'embed-english-light-v3.0',
        'embed-multilingual-light-v3.0',
    ];

    async embed(text: string, config: EmbeddingProviderConfig): Promise<EmbeddingResult> {
        const result = await this.embedBatch([text], config);
        return {
            embedding: result.embeddings[0],
            tokenCount: result.tokenCounts[0],
            model: result.model,
            provider: this.name,
        };
    }

    async embedBatch(texts: string[], config: EmbeddingProviderConfig): Promise<BatchEmbeddingResult> {
        const apiKey = config.apiKey || process.env.COHERE_API_KEY;
        if (!apiKey) {
            throw new Error('Cohere API key not configured');
        }

        const response = await fetch('https://api.cohere.ai/v1/embed', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: config.model || 'embed-english-v3.0',
                texts: texts,
                input_type: 'search_document',
                truncate: 'END',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Cohere API error: ${error}`);
        }

        const data = (await response.json()) as CohereEmbedResponse;

        return {
            embeddings: data.embeddings,
            tokenCounts: texts.map(() => 0),
            model: config.model || 'embed-english-v3.0',
            provider: this.name,
            totalTokens: data.meta?.billed_units?.input_tokens || 0,
        };
    }

    async isAvailable(config: EmbeddingProviderConfig): Promise<boolean> {
        const apiKey = config.apiKey || process.env.COHERE_API_KEY;
        return !!apiKey;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Custom HTTP Embedding Provider
// ════════════════════════════════════════════════════════════════════════════

export class CustomEmbeddingProvider implements IEmbeddingProvider {
    readonly name = 'custom';
    readonly supportedModels: string[] = [];

    async embed(text: string, config: EmbeddingProviderConfig): Promise<EmbeddingResult> {
        const result = await this.embedBatch([text], config);
        return {
            embedding: result.embeddings[0],
            tokenCount: result.tokenCounts[0],
            model: result.model,
            provider: this.name,
        };
    }

    async embedBatch(texts: string[], config: EmbeddingProviderConfig): Promise<BatchEmbeddingResult> {
        if (!config.endpointUrl) {
            throw new Error('Custom embedding endpoint URL not configured');
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const response = await fetch(config.endpointUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                texts: texts,
                model: config.model,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Custom embedding API error: ${error}`);
        }

        const data = (await response.json()) as CustomEmbeddingsResponse;

        // Expect response format: { embeddings: number[][], tokenCounts?: number[] }
        return {
            embeddings: data.embeddings,
            tokenCounts: data.tokenCounts || texts.map(() => 0),
            model: config.model || 'custom',
            provider: this.name,
            totalTokens: data.totalTokens || 0,
        };
    }

    async isAvailable(config: EmbeddingProviderConfig): Promise<boolean> {
        return !!config.endpointUrl;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Embedding Provider Factory
// ════════════════════════════════════════════════════════════════════════════

const providers: Record<string, IEmbeddingProvider> = {
    openai: new OpenAIEmbeddingProvider(),
    cohere: new CohereEmbeddingProvider(),
    custom: new CustomEmbeddingProvider(),
};

/**
 * Obtiene un proveedor de embeddings por nombre
 */
export function getEmbeddingProvider(providerName: string): IEmbeddingProvider {
    const provider = providers[providerName];
    if (!provider) {
        throw new Error(`Unknown embedding provider: ${providerName}`);
    }
    return provider;
}

/**
 * Registra un nuevo proveedor de embeddings
 */
export function registerEmbeddingProvider(name: string, provider: IEmbeddingProvider): void {
    providers[name] = provider;
}

// ════════════════════════════════════════════════════════════════════════════
// Main Embedding Service
// ════════════════════════════════════════════════════════════════════════════

export class EmbeddingService {
    private fallbackOrder = ['openai', 'cohere', 'custom'];

    /**
     * Genera embedding para un texto usando la configuración del Vector Store
     */
    async embed(
        text: string,
        vectorStoreId: string,
        accountId: string
    ): Promise<EmbeddingResult> {
        const config = await ragConfigService.getEffectiveConfig(vectorStoreId, accountId);
        return this.embedWithConfig(text, {
            provider: config.embedding.provider,
            model: config.embedding.model,
            dimensions: config.embedding.dimensions,
            endpointUrl: config.embedding.endpointUrl,
        });
    }

    /**
     * Genera embeddings en batch usando la configuración del Vector Store
     */
    async embedBatch(
        texts: string[],
        vectorStoreId: string,
        accountId: string
    ): Promise<BatchEmbeddingResult> {
        const config = await ragConfigService.getEffectiveConfig(vectorStoreId, accountId);
        const batchSize = config.embedding.batchSize;

        // Dividir en batches si hay demasiados textos
        if (texts.length > batchSize) {
            const allEmbeddings: number[][] = [];
            const allTokenCounts: number[] = [];
            let totalTokens = 0;

            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const result = await this.embedBatchWithConfig(batch, {
                    provider: config.embedding.provider,
                    model: config.embedding.model,
                    dimensions: config.embedding.dimensions,
                    endpointUrl: config.embedding.endpointUrl,
                });
                allEmbeddings.push(...result.embeddings);
                allTokenCounts.push(...result.tokenCounts);
                totalTokens += result.totalTokens;
            }

            return {
                embeddings: allEmbeddings,
                tokenCounts: allTokenCounts,
                model: config.embedding.model,
                provider: config.embedding.provider,
                totalTokens,
            };
        }

        return this.embedBatchWithConfig(texts, {
            provider: config.embedding.provider,
            model: config.embedding.model,
            dimensions: config.embedding.dimensions,
            endpointUrl: config.embedding.endpointUrl,
        });
    }

    /**
     * Genera embedding con configuración específica y fallback
     */
    async embedWithConfig(
        text: string,
        config: EmbeddingProviderConfig
    ): Promise<EmbeddingResult> {
        const providersToTry = [config.provider, ...this.fallbackOrder.filter(p => p !== config.provider)];

        let lastError: Error | null = null;

        for (const providerName of providersToTry) {
            try {
                const provider = getEmbeddingProvider(providerName);

                if (await provider.isAvailable(config)) {
                    return await provider.embed(text, config);
                }
            } catch (error) {
                console.warn(`Embedding provider ${providerName} failed:`, error);
                lastError = error as Error;
            }
        }

        throw lastError || new Error('No embedding provider available');
    }

    /**
     * Genera embeddings en batch con configuración específica y fallback
     */
    async embedBatchWithConfig(
        texts: string[],
        config: EmbeddingProviderConfig
    ): Promise<BatchEmbeddingResult> {
        const providersToTry = [config.provider, ...this.fallbackOrder.filter(p => p !== config.provider)];

        let lastError: Error | null = null;

        for (const providerName of providersToTry) {
            try {
                const provider = getEmbeddingProvider(providerName);

                if (await provider.isAvailable(config)) {
                    return await provider.embedBatch(texts, config);
                }
            } catch (error) {
                console.warn(`Embedding provider ${providerName} failed:`, error);
                lastError = error as Error;
            }
        }

        throw lastError || new Error('No embedding provider available');
    }

    /**
     * Calcula similitud coseno entre dos embeddings
     */
    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Embeddings must have same dimensions');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

// Singleton export
export const embeddingService = new EmbeddingService();
