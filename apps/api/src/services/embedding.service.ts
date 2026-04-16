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
// Sovereign Embedding Provider (Transformers.js In-Memory) & Ollama Fallback
// ════════════════════════════════════════════════════════════════════════════

/**
 * Gestor Singleton del Pipeline de Transformers.js
 * Para no cargar el modelo múltiples veces.
 */
class TransformerPipelineManager {
    static instances: Record<string, any> = {};
    static loadingMap: Record<string, boolean> = {};

    static async getInstance(modelName: string) {
        if (this.instances[modelName]) return this.instances[modelName];
        
        while (this.loadingMap[modelName]) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.instances[modelName]) return this.instances[modelName];

        this.loadingMap[modelName] = true;
        try {
            // Importación dinámica para no bloquear el inicio del servidor
            const { pipeline, env } = await import('@xenova/transformers');
            
            // Configurar para usar recursos locales si es posible, o descargar y cachear
            env.allowRemoteModels = true; 
            
            console.log(`[Sovereign RAG] Cargando modelo en memoria: ${modelName}...`);
            this.instances[modelName] = await pipeline('feature-extraction', modelName, {
                quantized: true, // Usa versión optimizada
            });
            console.log(`[Sovereign RAG] Modelo cargado exitosamente.`);
            
            return this.instances[modelName];
        } catch (error) {
            console.error(`[Sovereign RAG] Error cargando Transformers.js (${modelName}):`, error);
            throw error;
        } finally {
            this.loadingMap[modelName] = false;
        }
    }
}

export class LocalEmbeddingProvider implements IEmbeddingProvider {
    readonly name = 'local';
    // Soportamos el modelo por defecto en inglés y el nuevo multilingüe para español
    readonly supportedModels = ['paraphrase-multilingual-MiniLM-L12-v2', 'all-MiniLM-L6-v2'];

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
        // 1. Si el usuario definió un Endpoint URL EXPLÍCITO, usamos el driver externo
        if (config.endpointUrl) {
            return this.embedWithOllama(texts, config);
        }

        // 2. MODO SOBERANO ABSOLUTO (Transformers.js In-Memory)
        try {
            const requestedModel = config.model || 'all-MiniLM-L6-v2';
            // Transformers.js requiere el prefijo Xenova/ para descargar de HuggingFace
            const hfModelName = requestedModel.startsWith('Xenova/') ? requestedModel : `Xenova/${requestedModel}`;
            
            const pipe = await TransformerPipelineManager.getInstance(hfModelName);
            
            // Generar embeddings puros
            const output = await pipe(texts, { pooling: 'mean', normalize: true });
            const embeddingsTensor = output.tolist();
            
            // ARQUITECTURA ROBUSTA (v8.4):
            // Retornamos las dimensiones REALES del modelo. 
            // Para que esto funcione, la columna en DB debe ser 'vector' (sin dimensión fija).
            const realDim = embeddingsTensor[0]?.length || 0;
            console.log(`[Sovereign RAG] Generando vectores nativos: dim=${realDim} | mo=${config.model}`);
            
            return {
                embeddings: embeddingsTensor,
                tokenCounts: texts.map(t => Math.ceil(t.length / 4)),
                model: `local-${config.model || 'mini-lm'}`,
                provider: 'sovereign-local',
                totalTokens: Math.ceil(texts.join(' ').length / 4),
            };
            
        } catch (err: any) {
            console.warn(`[Sovereign RAG] Fallo en motor in-memory, intentando Ollama fallback... Error: ${err.message}`);
            return this.embedWithOllama(texts, config);
        }
    }

    private async embedWithOllama(texts: string[], config: EmbeddingProviderConfig): Promise<BatchEmbeddingResult> {
        const endpoint = config.endpointUrl || process.env.LOCAL_EMBEDDING_URL || 'http://localhost:11434/api/embeddings';
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.model || 'all-minilm', // Nota: ollama usa all-minilm
                    prompt: texts[0], // Algunos locales de ollama api vieja solo aceptan uno
                }),
            });

            if (!response.ok) {
                throw new Error(`Servicio local en ${endpoint} respondió con error ${response.status}.`);
            }

            const data = await response.json();
            const embedding = data.embedding || data.embeddings?.[0];
            
            if (!embedding) throw new Error('Respuesta inválida del servicio local');

            return {
                embeddings: [embedding],
                tokenCounts: [Math.ceil(texts[0].length / 4)],
                model: config.model || 'all-minilm',
                provider: 'ollama-local',
                totalTokens: Math.ceil(texts[0].length / 4),
            };
        } catch (err: any) {
            throw new Error(`Sovereign RAG Fallback failed: Asegúrate de tener Ollama corriendo en ${endpoint} con el modelo all-minilm. Ocurrió un error: ${err.message}`);
        }
    }

    async isAvailable(config: EmbeddingProviderConfig): Promise<boolean> {
        return true; 
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Embedding Provider Factory
// ════════════════════════════════════════════════════════════════════════════

const providers: Record<string, IEmbeddingProvider> = {
    openai: new OpenAIEmbeddingProvider(),
    cohere: new CohereEmbeddingProvider(),
    local: new LocalEmbeddingProvider(),
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
     * Genera embedding con configuración específica y fallback inteligente
     */
    async embedWithConfig(
        text: string,
        config: EmbeddingProviderConfig
    ): Promise<EmbeddingResult> {
        // Determinismo de Proveedor (v8.3): Si el usuario elige algo específico, no saltar a otros proveedores
        // que causarán errores de "Model Not Found" o "Insufficient Quota".
        const isDefaultProvider = config.provider === 'openai' || !config.provider;
        const providersToTry = isDefaultProvider 
            ? [config.provider || 'openai', ...this.fallbackOrder.filter(p => p !== config.provider)]
            : [config.provider];

        let lastError: Error | null = null;

        for (const providerName of providersToTry) {
            try {
                const provider = getEmbeddingProvider(providerName);

                if (await provider.isAvailable(config)) {
                    // Si el proveedor es diferente al original, ajustamos el modelo al default del proveedor
                    const effectiveConfig = provider.name !== config.provider
                        ? { ...config, model: provider.supportedModels[0] }
                        : config;

                    return await provider.embed(text, effectiveConfig);
                }
            } catch (error) {
                console.warn(`Embedding provider ${providerName} failed:`, error);
                lastError = error as Error;
                
                // Si el proveedor fue solicitado explícitamente y falló, no seguimos intentando fallbacks
                if (!isDefaultProvider) break;
            }
        }

        throw lastError || new Error(`No embedding provider available for: ${config.provider}`);
    }

    /**
     * Genera embeddings en batch con configuración específica y fallback inteligente
     */
    async embedBatchWithConfig(
        texts: string[],
        config: EmbeddingProviderConfig
    ): Promise<BatchEmbeddingResult> {
        const isDefaultProvider = config.provider === 'openai' || !config.provider;
        const providersToTry = isDefaultProvider 
            ? [config.provider || 'openai', ...this.fallbackOrder.filter(p => p !== config.provider)]
            : [config.provider];

        let lastError: Error | null = null;

        for (const providerName of providersToTry) {
            try {
                const provider = getEmbeddingProvider(providerName);

                if (await provider.isAvailable(config)) {
                    // Ajuste de modelo para fallbacks
                    const effectiveConfig = provider.name !== config.provider
                        ? { ...config, model: provider.supportedModels[0] }
                        : config;

                    return await provider.embedBatch(texts, effectiveConfig);
                }
            } catch (error) {
                console.warn(`Embedding provider ${providerName} failed:`, error);
                lastError = error as Error;
                if (!isDefaultProvider) break;
            }
        }

        throw lastError || new Error(`No embedding provider available for: ${config.provider}`);
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
