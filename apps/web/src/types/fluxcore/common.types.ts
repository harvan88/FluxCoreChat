/**
 * FluxCore Common Types
 * 
 * Tipos compartidos entre todos los módulos de FluxCore.
 * Este archivo centraliza tipos que antes estaban duplicados
 * en múltiples vistas.
 */

// ============================================================================
// Status Types
// ============================================================================

/** Estados posibles de un asistente */
export type AssistantStatus = 'draft' | 'active' | 'disabled';

/** Estados posibles de una instrucción */
export type InstructionStatus = 'draft' | 'active' | 'disabled';

/** Estados posibles de un vector store */
export type VectorStoreStatus = 'draft' | 'active' | 'expired' | 'in_progress' | 'completed';

/** Estados posibles de archivos en vector store */
export type FileProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ============================================================================
// Runtime & Backend Types
// ============================================================================

/** Runtime del asistente */
export type AssistantRuntime = 'local' | 'openai';

/** Backend del vector store */
export type VectorStoreBackend = 'local' | 'openai';

// ============================================================================
// Visibility Types (para futuro marketplace)
// ============================================================================

/** Niveles de visibilidad de activos */
export type AssetVisibility = 'private' | 'shared' | 'public' | 'marketplace';

// ============================================================================
// API Response Types
// ============================================================================

/** Respuesta estándar de API */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

/** Respuesta paginada de API */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

// ============================================================================
// Common Entity Fields
// ============================================================================

/** Campos base de auditoría que tienen todas las entidades */
export interface AuditFields {
    createdAt?: string;
    updatedAt: string;
    lastModifiedBy?: string;
}

/** Campos base de tamaño/métricas */
export interface SizeFields {
    sizeBytes: number;
}

// ============================================================================
// Model Configuration Types
// ============================================================================

/** Proveedores de IA soportados */
export type AIProvider = 'openai' | 'groq' | 'anthropic';

/** Configuración del modelo de IA */
export interface ModelConfig {
    provider: AIProvider;
    model: string;
    temperature: number;
    topP: number;
    responseFormat?: string;
}

/** Configuración de timing de respuestas */
export interface TimingConfig {
    responseDelaySeconds: number;
    smartDelay: boolean;
}

// ============================================================================
// RAG Configuration Types
// ============================================================================

/** Estrategias de chunking disponibles */
export type ChunkingStrategy = 'fixed' | 'recursive' | 'sentence' | 'paragraph';

/** Proveedores de embeddings disponibles */
export type EmbeddingProvider = 'openai' | 'cohere' | 'local';

/** Configuración de chunking */
export interface ChunkingConfig {
    enabled: boolean;
    strategy: ChunkingStrategy;
    sizeTokens: number;
    overlapTokens: number;
}

/** Configuración de embeddings */
export interface EmbeddingConfig {
    enabled: boolean;
    provider: EmbeddingProvider;
    model: string;
}

/** Configuración de retrieval */
export interface RetrievalConfig {
    enabled: boolean;
    topK: number;
    minScore: number;
    maxTokens: number;
}

/** Configuración RAG completa */
export interface RAGConfig {
    chunking: ChunkingConfig;
    embedding: EmbeddingConfig;
    retrieval: RetrievalConfig;
}

// ============================================================================
// Expiration Policy Types
// ============================================================================

/** Políticas de expiración para vector stores */
export type ExpirationPolicy = 'never' | 'days_after_creation' | 'days_after_last_use';
