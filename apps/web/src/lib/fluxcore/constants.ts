/**
 * FluxCore Constants
 * 
 * Constantes compartidas entre módulos de FluxCore.
 * Centraliza valores que estaban hardcodeados en múltiples archivos.
 */

import type { AIProvider } from '../../types/fluxcore';

// ============================================================================
// Provider & Model Configuration
// ============================================================================

/**
 * Modelos disponibles por proveedor
 */
export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini'],
    groq: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile'],
    anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
};

/**
 * Nombres legibles de proveedores
 */
export const PROVIDER_NAMES: Record<AIProvider, string> = {
    openai: 'OpenAI',
    groq: 'Groq',
    anthropic: 'Anthropic',
};

/**
 * Modelo por defecto al crear asistente
 */
export const DEFAULT_MODEL_CONFIG = {
    provider: 'openai' as AIProvider,
    model: 'gpt-4o',
    temperature: 0.7,
    topP: 1.0,
    responseFormat: 'text',
};

/**
 * Configuración de timing por defecto
 */
export const DEFAULT_TIMING_CONFIG = {
    responseDelaySeconds: 2,
    smartDelay: true,
};

// ============================================================================
// Content Limits
// ============================================================================

/**
 * Límite de caracteres para instrucciones del sistema
 */
export const MAX_INSTRUCTION_CHARS = 35000;

/**
 * Límites de OpenAI según documentación oficial
 */
export const OPENAI_LIMITS = {
    /** Límite de descripción de asistente */
    MAX_DESCRIPTION_LENGTH: 512,
    /** Límite de instrucciones del sistema */
    MAX_INSTRUCTIONS_LENGTH: 256000,
};

/**
 * Límite de bio en perfil
 */
export const MAX_BIO_CHARS = 150;

/**
 * Límite de contexto privado
 */
export const MAX_PRIVATE_CONTEXT_CHARS = 5000;

// ============================================================================
// File Types
// ============================================================================

/**
 * Extensiones de archivo aceptadas para vector stores
 */
export const ACCEPTED_FILE_EXTENSIONS = [
    '.txt',
    '.md',
    '.pdf',
    '.docx',
    '.doc',
    '.csv',
    '.json',
    '.html',
    '.xml',
];

/**
 * Tipos MIME aceptados y sus extensiones
 */
export const MIME_TYPE_MAP: Record<string, string> = {
    'text/plain': '.txt',
    'text/markdown': '.md',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'text/csv': '.csv',
    'application/json': '.json',
    'text/html': '.html',
    'application/xml': '.xml',
    'text/xml': '.xml',
};

// ============================================================================
// RAG Defaults
// ============================================================================

/**
 * Configuración RAG por defecto
 */
export const DEFAULT_RAG_CONFIG = {
    chunking: {
        enabled: true,
        strategy: 'recursive' as const,
        sizeTokens: 500,
        overlapTokens: 50,
    },
    embedding: {
        enabled: true,
        provider: 'openai' as const,
        model: 'text-embedding-3-small',
    },
    retrieval: {
        enabled: true,
        topK: 5,
        minScore: 0.7,
        maxTokens: 2000,
    },
};

/**
 * Proveedores de embedding disponibles
 */
export const EMBEDDING_PROVIDERS = [
    { value: 'openai', label: 'OpenAI', models: ['text-embedding-3-small', 'text-embedding-3-large'] },
    { value: 'cohere', label: 'Cohere', models: ['embed-english-v3.0', 'embed-multilingual-v3.0'] },
    { value: 'local', label: 'Local', models: ['all-MiniLM-L6-v2'] },
];

// ============================================================================
// Expiration Policies
// ============================================================================

/**
 * Políticas de expiración disponibles
 */
export const EXPIRATION_POLICIES = [
    { value: 'never', label: 'Nunca' },
    { value: 'days_after_creation', label: 'Días después de crear' },
    { value: 'days_after_last_use', label: 'Días después de último uso' },
] as const;

// ============================================================================
// UI Constants
// ============================================================================

/**
 * Delay de auto-save en ms
 */
export const AUTOSAVE_DELAY_MS = 500;

/**
 * Duración de notificación de copiado en ms
 */
export const COPY_NOTIFICATION_DURATION_MS = 2000;

/**
 * Colores de status badges
 */
export const STATUS_COLORS = {
    draft: 'info',
    active: 'success',
    disabled: 'warning',
    expired: 'error',
} as const;
