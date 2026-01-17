/**
 * RAG Configuration Routes
 * 
 * API endpoints para gestionar configuración RAG por vector store.
 * 
 * Endpoints:
 * - GET /fluxcore/rag-config - Obtener configuración
 * - PUT /fluxcore/rag-config - Guardar configuración
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { ragConfigService } from '../services/rag-config.service';

export const ragConfigRoutes = new Elysia({ prefix: '/fluxcore/rag-config' })
    .use(authMiddleware)

    // GET /fluxcore/rag-config
    .get(
        '/',
        async ({ user, query, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const { vectorStoreId, accountId } = query;

            if (!vectorStoreId || !accountId) {
                set.status = 400;
                return { success: false, message: 'vectorStoreId and accountId are required' };
            }

            try {
                const config = await ragConfigService.getEffectiveConfig(vectorStoreId, accountId);

                // Transformar a formato UI
                return {
                    success: true,
                    data: {
                        chunking: {
                            enabled: true,
                            strategy: config.chunking.strategy,
                            sizeTokens: config.chunking.sizeTokens,
                            overlapTokens: config.chunking.overlapTokens,
                        },
                        embedding: {
                            enabled: true,
                            provider: config.embedding.provider,
                            model: config.embedding.model,
                        },
                        retrieval: {
                            enabled: true,
                            topK: config.retrieval.topK,
                            minScore: config.retrieval.minScore,
                            maxTokens: config.retrieval.maxTokens,
                        },
                    },
                };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            query: t.Object({
                vectorStoreId: t.String(),
                accountId: t.String(),
            }),
            detail: {
                tags: ['FluxCore RAG'],
                summary: 'Get RAG configuration for vector store',
            },
        }
    )

    // PUT /fluxcore/rag-config
    .put(
        '/',
        async ({ user, body, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const { vectorStoreId, accountId, chunking, embedding, retrieval } = body;

            try {
                await ragConfigService.saveConfig({
                    vectorStoreId,
                    accountId,
                    chunking: chunking ? {
                        strategy: chunking.strategy,
                        sizeTokens: chunking.sizeTokens,
                        overlapTokens: chunking.overlapTokens,
                        minSize: 50,
                        separators: ['\n\n', '\n', '. ', ' '],
                    } : undefined,
                    embedding: embedding ? {
                        provider: embedding.provider,
                        model: embedding.model,
                        dimensions: embedding.provider === 'openai' ? 1536 : 1024,
                        batchSize: 100,
                    } : undefined,
                    retrieval: retrieval ? {
                        topK: retrieval.topK,
                        minScore: retrieval.minScore,
                        maxTokens: retrieval.maxTokens,
                        rerankEnabled: false,
                        hybridSearchEnabled: false,
                    } : undefined,
                });

                return { success: true, message: 'Configuration saved' };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            body: t.Object({
                vectorStoreId: t.String(),
                accountId: t.String(),
                chunking: t.Optional(t.Object({
                    enabled: t.Boolean(),
                    strategy: t.String(),
                    sizeTokens: t.Number(),
                    overlapTokens: t.Number(),
                })),
                embedding: t.Optional(t.Object({
                    enabled: t.Boolean(),
                    provider: t.String(),
                    model: t.String(),
                })),
                retrieval: t.Optional(t.Object({
                    enabled: t.Boolean(),
                    topK: t.Number(),
                    minScore: t.Number(),
                    maxTokens: t.Number(),
                })),
            }),
            detail: {
                tags: ['FluxCore RAG'],
                summary: 'Save RAG configuration for vector store',
            },
        }
    );
