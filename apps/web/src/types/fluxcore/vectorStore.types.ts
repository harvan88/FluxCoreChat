/**
 * FluxCore Vector Store Types
 * 
 * Tipos centralizados para el módulo de Base de Conocimiento.
 * Extraído de VectorStoresView.tsx y OpenAIVectorStoresView.tsx
 */

import type {
    VectorStoreStatus,
    VectorStoreBackend,
    FileProcessingStatus,
    ExpirationPolicy,
    AuditFields,
    SizeFields,
    RAGConfig,
} from './common.types';

// ============================================================================
// Vector Store Entity
// ============================================================================

/** Vector Store (base de conocimiento) */
export interface VectorStore extends AuditFields, SizeFields {
    id: string;
    name: string;
    description?: string;
    status: VectorStoreStatus;
    backend?: VectorStoreBackend;
    externalId?: string;  // ID en OpenAI cuando backend='openai'

    // Archivos
    fileCount: number;
    files?: VectorStoreFile[];

    // Expiración
    expirationPolicy: ExpirationPolicy;
    expiresAt?: string;

    // Relaciones
    usedByAssistants?: { id: string; name: string }[];
}

/** Datos para crear un vector store */
export interface VectorStoreCreate {
    accountId: string;
    name: string;
    description?: string;
    status?: VectorStoreStatus;
    backend?: VectorStoreBackend;
    expirationPolicy?: ExpirationPolicy;
}

/** Datos para actualizar un vector store */
export interface VectorStoreUpdate {
    accountId: string;
    name?: string;
    description?: string;
    status?: VectorStoreStatus;
    expirationPolicy?: ExpirationPolicy;
}

// ============================================================================
// Vector Store File Types
// ============================================================================

/** Archivo en un vector store */
export interface VectorStoreFile extends AuditFields {
    id: string;
    name: string;
    mimeType?: string;
    sizeBytes: number;
    status: FileProcessingStatus;
    errorMessage?: string;
    chunkCount?: number;
}

/** Datos para subir un archivo */
export interface FileUploadData {
    file: File;
    vectorStoreId: string;
    accountId: string;
}

// ============================================================================
// OpenAI-Specific Types
// ============================================================================

/** Vector Store específico de OpenAI */
export interface OpenAIVectorStore {
    id: string;
    name: string;
    description: string | null;
    externalId: string | null;
    fileCount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

/** Archivo en OpenAI Vector Store */
export interface OpenAIFile {
    id: string;
    name: string;
    sizeBytes: number;
    status: FileProcessingStatus;
    externalId: string | null;
    createdAt: string;
}

/** Resultado de búsqueda en vector store */
export interface SearchResult {
    fileId: string;
    filename: string;
    score: number;
    attributes: Record<string, unknown>;
    content: Array<{ type: 'text'; text: string }>;
}

// ============================================================================
// View Props Types
// ============================================================================

/** Props para vista de vector stores */
export interface VectorStoresViewProps {
    accountId: string;
    onOpenTab?: (tabId: string, title: string, data: unknown) => void;
    vectorStoreId?: string;
}

/** Props para vista de vector stores OpenAI */
export interface OpenAIVectorStoresViewProps {
    accountId: string;
    vectorStoreId?: string;
}

/** Props para sección de archivos */
export interface VectorStoreFilesSectionProps {
    vectorStoreId: string;
    accountId: string;
    onFileCountChange?: (count: number) => void;
}

/** Props para sección de configuración RAG */
export interface RAGConfigSectionProps {
    vectorStoreId: string;
    accountId: string;
    onConfigChange?: (config: RAGConfig) => void;
}
