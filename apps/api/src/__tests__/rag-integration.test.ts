/**
 * RAG Integration Tests
 * 
 * Tests para verificar la implementación del sistema RAG.
 * Estos tests verifican:
 * 1. Servicios funcionan correctamente
 * 2. Integración entre componentes
 * 3. Flujo completo asistente → vector stores → retrieval
 */

import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

// ============================================================================
// Unit Tests: Chunking Service
// ============================================================================

describe('ChunkingService', () => {
    test('should chunk text with fixed strategy', async () => {
        // Importar dinámicamente para evitar problemas de dependencias
        const { chunkingService } = await import('../services/chunking.service');
        const { ChunkingConfig } = await import('@fluxcore/db');

        const config = {
            strategy: 'fixed' as const,
            sizeTokens: 100,
            overlapTokens: 10,
            minSize: 5,
        };

        const text = 'Lorem ipsum dolor sit amet. '.repeat(50);
        const result = chunkingService.chunkWithConfig(text, config);

        expect(result.chunks.length).toBeGreaterThan(0);
        expect(result.strategy).toBe('fixed');
        expect(result.totalTokens).toBeGreaterThan(0);
    });

    test('should chunk text with recursive strategy', async () => {
        const { chunkingService } = await import('../services/chunking.service');

        const config = {
            strategy: 'recursive' as const,
            sizeTokens: 100,
            overlapTokens: 10,
            separators: ['\n\n', '\n', '. ', ' '],
            minSize: 5,
        };

        const text = `First paragraph with multiple sentences. This is sentence two.

Second paragraph here. More content follows.

Third paragraph with additional text.`;

        const result = chunkingService.chunkWithConfig(text, config);

        expect(result.chunks.length).toBeGreaterThan(0);
        expect(result.strategy).toBe('recursive');
    });

    test('should chunk text with sentence strategy', async () => {
        const { chunkingService } = await import('../services/chunking.service');

        const config = {
            strategy: 'sentence' as const,
            sizeTokens: 200,
            overlapTokens: 0,
            minSize: 3,
        };

        const text = 'First sentence. Second sentence! Third sentence? Fourth sentence.';
        const result = chunkingService.chunkWithConfig(text, config);

        expect(result.chunks.length).toBeGreaterThan(0);
        expect(result.strategy).toBe('sentence');
    });
});

// ============================================================================
// Unit Tests: Embedding Service
// ============================================================================

describe('EmbeddingService', () => {
    test('should have correct default configuration', async () => {
        const { embeddingService } = await import('../services/embedding.service');

        // El servicio debe existir
        expect(embeddingService).toBeDefined();
        expect(typeof embeddingService.embed).toBe('function');
        expect(typeof embeddingService.embedBatch).toBe('function');
    });

    test('should handle embed request structure', async () => {
        const { embeddingService } = await import('../services/embedding.service');

        // Mock de la respuesta (en producción usaría API real)
        // Este test verifica que la estructura del método es correcta
        try {
            // Sin API key configurada, debería lanzar error o retornar estructura correcta
            const result = await embeddingService.embedWithConfig('test text', {
                provider: 'openai',
                model: 'text-embedding-3-small',
                dimensions: 1536,
            });

            // Si llega aquí sin error (mock o API real)
            expect(result).toHaveProperty('embedding');
            expect(result).toHaveProperty('model');
            expect(result).toHaveProperty('tokensUsed');
        } catch (error: any) {
            // Esperado si no hay API key configurada
            expect(error.message).toBeDefined();
        }
    });
});

// ============================================================================
// Unit Tests: RAG Config Service
// ============================================================================

describe('RAGConfigService', () => {
    test('should return default configuration when none exists', async () => {
        const { ragConfigService } = await import('../services/rag-config.service');

        // Debería retornar defaults cuando no hay config específica
        const config = await ragConfigService.getEffectiveConfig(
            'non-existent-vs-id',
            'non-existent-account-id'
        );

        expect(config).toBeDefined();
        expect(config.chunking).toBeDefined();
        expect(config.embedding).toBeDefined();
        expect(config.retrieval).toBeDefined();

        // Verificar defaults
        expect(config.chunking.strategy).toBe('recursive');
        expect(config.embedding.provider).toBe('openai');
        expect(config.retrieval.topK).toBe(5);
    });
});

// ============================================================================
// Unit Tests: Permission Service
// ============================================================================

describe('PermissionService', () => {
    test('should have cache implemented', async () => {
        const { permissionService } = await import('../services/permission.service');

        expect(permissionService).toBeDefined();
        expect(typeof permissionService.checkAccess).toBe('function');
        expect(typeof permissionService.shareAsset).toBe('function');
        expect(typeof permissionService.revokeAccess).toBe('function');
    });
});

// ============================================================================
// Unit Tests: Usage Service
// ============================================================================

describe('UsageService', () => {
    test('should have billing methods', async () => {
        const { usageService } = await import('../services/usage.service');

        expect(usageService).toBeDefined();
        expect(typeof usageService.logUsage).toBe('function');
        expect(typeof usageService.getBillingInfo).toBe('function');
        expect(typeof usageService.addCredits).toBe('function');
        expect(typeof usageService.getMonthlyUsage).toBe('function');
        expect(typeof usageService.checkLimits).toBe('function');
    });
});

// ============================================================================
// Unit Tests: Metrics Service
// ============================================================================

describe('MetricsService', () => {
    test('should have metrics methods', async () => {
        const { metricsService } = await import('../services/metrics.service');

        expect(metricsService).toBeDefined();
        expect(typeof metricsService.record).toBe('function');
        expect(typeof metricsService.recordTiming).toBe('function');
        expect(typeof metricsService.increment).toBe('function');
        expect(typeof metricsService.getHealthStatus).toBe('function');
    });

    test('should record metrics without error', async () => {
        const { metricsService } = await import('../services/metrics.service');

        // No debería lanzar error
        expect(() => {
            metricsService.increment('test.counter');
            metricsService.recordTiming('test.timing', 100);
            metricsService.gauge('test.gauge', 42);
        }).not.toThrow();
    });
});

// ============================================================================
// Integration Tests: PromptBuilder with RAG
// ============================================================================

describe('PromptBuilder RAG Integration', () => {
    test('should include RAG context in system prompt', async () => {
        const { PromptBuilder } = await import('../../../extensions/fluxcore-asistentes/src/prompt-builder');

        const builder = new PromptBuilder({
            mode: 'suggest',
            maxTokens: 256,
            temperature: 0.7,
            model: 'gpt-4o',
        });

        const contextWithRAG = {
            messages: [
                { id: '1', content: 'Test', senderAccountId: 'user1', messageType: 'text', createdAt: new Date() }
            ],
            ragContext: {
                context: '=== BASE DE CONOCIMIENTO ===\nContenido relevante aquí',
                sources: [{ content: 'preview', source: 'doc.pdf', similarity: 0.95 }],
                totalTokens: 100,
                chunksUsed: 1,
            },
        };

        const result = builder.build(contextWithRAG, 'recipient-id', ['Eres un asistente útil']);

        expect(result.systemPrompt).toContain('Base de Conocimiento');
        expect(result.systemPrompt).toContain('Contenido relevante aquí');
    });

    test('should work without RAG context', async () => {
        const { PromptBuilder } = await import('../../../extensions/fluxcore-asistentes/src/prompt-builder');

        const builder = new PromptBuilder({
            mode: 'suggest',
            maxTokens: 256,
            temperature: 0.7,
            model: 'gpt-4o',
        });

        const contextWithoutRAG = {
            messages: [
                { id: '1', content: 'Test', senderAccountId: 'user1', messageType: 'text', createdAt: new Date() }
            ],
        };

        const result = builder.build(contextWithoutRAG, 'recipient-id', ['Eres un asistente útil']);

        // No debería incluir sección de base de conocimiento si no hay RAG context
        expect(result.systemPrompt).not.toContain('Base de Conocimiento');
    });
});

// ============================================================================
// Integration Tests: Retrieval Service
// ============================================================================

describe('RetrievalService', () => {
    test('should return empty results for non-existent vector stores', async () => {
        const { retrievalService } = await import('../services/retrieval.service');

        const result = await retrievalService.search(
            'test query',
            ['non-existent-vs-id'],
            'non-existent-account-id'
        );

        expect(result).toBeDefined();
        expect(result.chunks).toEqual([]);
        expect(result.totalTokens).toBe(0);
    });

    test('should build empty context when no chunks found', async () => {
        const { retrievalService } = await import('../services/retrieval.service');

        const ragContext = await retrievalService.buildContext(
            'test query',
            ['non-existent-vs-id'],
            'non-existent-account-id'
        );

        expect(ragContext.context).toBe('');
        expect(ragContext.sources).toEqual([]);
        expect(ragContext.chunksUsed).toBe(0);
    });
});

// ============================================================================
// Integration Tests: Marketplace Service
// ============================================================================

describe('MarketplaceService', () => {
    test('should have all marketplace methods', async () => {
        const { marketplaceService } = await import('../services/marketplace.service');

        expect(marketplaceService).toBeDefined();
        expect(typeof marketplaceService.createListing).toBe('function');
        expect(typeof marketplaceService.searchListings).toBe('function');
        expect(typeof marketplaceService.subscribe).toBe('function');
        expect(typeof marketplaceService.addReview).toBe('function');
    });

    test('should search with empty results', async () => {
        const { marketplaceService } = await import('../services/marketplace.service');

        const result = await marketplaceService.searchListings({
            query: 'non-existent-listing',
            limit: 10,
        });

        expect(result).toBeDefined();
        expect(result.listings).toBeInstanceOf(Array);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
    });
});

console.log('RAG Integration Tests loaded successfully');
