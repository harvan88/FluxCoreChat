/**
 * Chunking Service - Múltiples Estrategias de Chunking
 * 
 * Implementa diferentes estrategias para dividir documentos en chunks:
 * - Fixed: Tamaño fijo de tokens
 * - Recursive: Separadores jerárquicos (default)
 * - Sentence: Por oraciones
 * - Paragraph: Por párrafos
 * - Custom: Regex personalizado
 * 
 * RAG-003/004: Configuración Granular de RAG
 */

import { ragConfigService } from './rag-config.service';
import type { ChunkingConfig } from '@fluxcore/db';

// ════════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ════════════════════════════════════════════════════════════════════════════

export interface Chunk {
    content: string;
    index: number;
    startChar: number;
    endChar: number;
    tokenCount: number;
    metadata?: {
        pageNumber?: number;
        sectionTitle?: string;
    };
}

export interface ChunkingResult {
    chunks: Chunk[];
    totalTokens: number;
    strategy: string;
}

/**
 * Interface para estrategias de chunking
 */
export interface IChunkingStrategy {
    readonly name: string;
    chunk(text: string, config: ChunkingConfig): Chunk[];
}

// ════════════════════════════════════════════════════════════════════════════
// Token Counter (simple approximation)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Aproximación simple de conteo de tokens
 * En producción, usar tiktoken o similar
 */
function countTokens(text: string): number {
    // Aproximación: ~4 caracteres por token para español/inglés
    return Math.ceil(text.length / 4);
}

// ════════════════════════════════════════════════════════════════════════════
// Fixed Size Chunking Strategy
// ════════════════════════════════════════════════════════════════════════════

export class FixedChunkingStrategy implements IChunkingStrategy {
    readonly name = 'fixed';

    chunk(text: string, config: ChunkingConfig): Chunk[] {
        const chunks: Chunk[] = [];
        const targetSize = config.sizeTokens * 4; // Convert tokens to chars
        const overlap = config.overlapTokens * 4;

        let index = 0;
        let position = 0;

        while (position < text.length) {
            const endPosition = Math.min(position + targetSize, text.length);
            const content = text.slice(position, endPosition);

            chunks.push({
                content: content.trim(),
                index,
                startChar: position,
                endChar: endPosition,
                tokenCount: countTokens(content),
            });

            position = endPosition - overlap;
            if (position >= text.length - overlap) break;
            index++;
        }

        return chunks.filter(c => c.content.length > 0);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Recursive Chunking Strategy (LangChain-style)
// ════════════════════════════════════════════════════════════════════════════

export class RecursiveChunkingStrategy implements IChunkingStrategy {
    readonly name = 'recursive';

    chunk(text: string, config: ChunkingConfig): Chunk[] {
        const separators = config.separators || ['\n\n', '\n', '. ', ' '];
        const targetSize = config.sizeTokens * 4;

        const rawChunks = this.splitRecursively(text, separators, targetSize);

        // Aplicar overlap y crear chunks finales
        const chunks: Chunk[] = [];
        let currentPosition = 0;

        for (let i = 0; i < rawChunks.length; i++) {
            const content = rawChunks[i];
            const startChar = text.indexOf(content, currentPosition);
            const endChar = startChar + content.length;

            chunks.push({
                content: content.trim(),
                index: i,
                startChar,
                endChar,
                tokenCount: countTokens(content),
            });

            currentPosition = endChar;
        }

        return chunks.filter(c => c.content.length > 0 && c.tokenCount >= (config.minSize || 10));
    }

    private splitRecursively(text: string, separators: string[], maxSize: number): string[] {
        if (text.length <= maxSize) {
            return [text];
        }

        // Intentar dividir con cada separador en orden
        for (const separator of separators) {
            const parts = text.split(separator);

            if (parts.length > 1) {
                const result: string[] = [];
                let current = '';

                for (const part of parts) {
                    const withSeparator = current ? current + separator + part : part;

                    if (withSeparator.length <= maxSize) {
                        current = withSeparator;
                    } else {
                        if (current) {
                            result.push(current);
                        }
                        // Si la parte individual es muy grande, dividir recursivamente
                        if (part.length > maxSize) {
                            const subParts = this.splitRecursively(part, separators.slice(separators.indexOf(separator) + 1), maxSize);
                            result.push(...subParts);
                            current = '';
                        } else {
                            current = part;
                        }
                    }
                }

                if (current) {
                    result.push(current);
                }

                return result;
            }
        }

        // Si ningún separador funcionó, dividir por tamaño fijo
        const result: string[] = [];
        for (let i = 0; i < text.length; i += maxSize) {
            result.push(text.slice(i, i + maxSize));
        }
        return result;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Sentence Chunking Strategy
// ════════════════════════════════════════════════════════════════════════════

export class SentenceChunkingStrategy implements IChunkingStrategy {
    readonly name = 'sentence';

    // Regex para detectar fin de oración
    private sentenceEndRegex = /[.!?]+[\s]+|[.!?]+$/g;

    chunk(text: string, config: ChunkingConfig): Chunk[] {
        const sentences = this.splitIntoSentences(text);
        const targetSize = config.sizeTokens * 4;

        const chunks: Chunk[] = [];
        let currentChunk = '';
        let currentStart = 0;
        let index = 0;
        let position = 0;

        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > targetSize && currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk.trim(),
                    index,
                    startChar: currentStart,
                    endChar: position,
                    tokenCount: countTokens(currentChunk),
                });
                index++;
                currentChunk = sentence;
                currentStart = position;
            } else {
                currentChunk += sentence;
            }
            position += sentence.length;
        }

        // Añadir último chunk
        if (currentChunk.trim().length > 0) {
            chunks.push({
                content: currentChunk.trim(),
                index,
                startChar: currentStart,
                endChar: text.length,
                tokenCount: countTokens(currentChunk),
            });
        }

        return chunks.filter(c => c.tokenCount >= (config.minSize || 10));
    }

    private splitIntoSentences(text: string): string[] {
        const sentences: string[] = [];
        let lastIndex = 0;

        const matches = text.matchAll(this.sentenceEndRegex);

        for (const match of matches) {
            if (match.index !== undefined) {
                const endIndex = match.index + match[0].length;
                sentences.push(text.slice(lastIndex, endIndex));
                lastIndex = endIndex;
            }
        }

        // Añadir texto restante
        if (lastIndex < text.length) {
            sentences.push(text.slice(lastIndex));
        }

        return sentences;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Paragraph Chunking Strategy
// ════════════════════════════════════════════════════════════════════════════

export class ParagraphChunkingStrategy implements IChunkingStrategy {
    readonly name = 'paragraph';

    chunk(text: string, config: ChunkingConfig): Chunk[] {
        const paragraphs = text.split(/\n\n+/);
        const targetSize = config.sizeTokens * 4;

        const chunks: Chunk[] = [];
        let currentChunk = '';
        let currentStart = 0;
        let index = 0;
        let position = 0;

        for (const paragraph of paragraphs) {
            const paragraphWithBreak = paragraph + '\n\n';

            if (currentChunk.length + paragraphWithBreak.length > targetSize && currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk.trim(),
                    index,
                    startChar: currentStart,
                    endChar: position,
                    tokenCount: countTokens(currentChunk),
                });
                index++;
                currentChunk = paragraphWithBreak;
                currentStart = position;
            } else {
                currentChunk += paragraphWithBreak;
            }
            position = text.indexOf(paragraph, position) + paragraph.length;
        }

        // Añadir último chunk
        if (currentChunk.trim().length > 0) {
            chunks.push({
                content: currentChunk.trim(),
                index,
                startChar: currentStart,
                endChar: text.length,
                tokenCount: countTokens(currentChunk),
            });
        }

        return chunks.filter(c => c.tokenCount >= (config.minSize || 10));
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Custom Regex Chunking Strategy
// ════════════════════════════════════════════════════════════════════════════

export class CustomChunkingStrategy implements IChunkingStrategy {
    readonly name = 'custom';

    chunk(text: string, config: ChunkingConfig): Chunk[] {
        if (!config.customRegex) {
            throw new Error('Custom regex not provided');
        }

        const regex = new RegExp(config.customRegex, 'g');
        const parts = text.split(regex);

        return parts
            .map((content, index) => ({
                content: content.trim(),
                index,
                startChar: 0, // Would need more complex logic to track positions
                endChar: 0,
                tokenCount: countTokens(content),
            }))
            .filter(c => c.content.length > 0 && c.tokenCount >= (config.minSize || 10));
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Strategy Registry
// ════════════════════════════════════════════════════════════════════════════

const strategies: Record<string, IChunkingStrategy> = {
    fixed: new FixedChunkingStrategy(),
    recursive: new RecursiveChunkingStrategy(),
    sentence: new SentenceChunkingStrategy(),
    paragraph: new ParagraphChunkingStrategy(),
    custom: new CustomChunkingStrategy(),
};

export function getChunkingStrategy(name: string): IChunkingStrategy {
    const strategy = strategies[name];
    if (!strategy) {
        console.warn(`Unknown chunking strategy: ${name}, falling back to recursive`);
        return strategies.recursive;
    }
    return strategy;
}

// ════════════════════════════════════════════════════════════════════════════
// Main Chunking Service
// ════════════════════════════════════════════════════════════════════════════

export class ChunkingService {
    /**
     * Divide un texto en chunks usando la configuración del Vector Store
     */
    async chunkText(
        text: string,
        vectorStoreId: string,
        accountId: string
    ): Promise<ChunkingResult> {
        const config = await ragConfigService.getEffectiveConfig(vectorStoreId, accountId);
        return this.chunkWithConfig(text, config.chunking);
    }

    /**
     * Divide un texto en chunks usando configuración específica
     */
    chunkWithConfig(text: string, config: ChunkingConfig): ChunkingResult {
        const strategy = getChunkingStrategy(config.strategy);
        const chunks = strategy.chunk(text, config);

        // Filtrar chunks fuera de límites
        const filtered = chunks.filter(chunk => {
            const tokens = chunk.tokenCount;
            return tokens >= (config.minSize || 0) && tokens <= (config.maxSize || Infinity);
        });

        return {
            chunks: filtered,
            totalTokens: filtered.reduce((sum, c) => sum + c.tokenCount, 0),
            strategy: config.strategy,
        };
    }

    /**
     * Divide múltiples textos en chunks
     */
    async chunkTexts(
        texts: string[],
        vectorStoreId: string,
        accountId: string
    ): Promise<ChunkingResult[]> {
        return Promise.all(
            texts.map(text => this.chunkText(text, vectorStoreId, accountId))
        );
    }
}

// Singleton export
export const chunkingService = new ChunkingService();
