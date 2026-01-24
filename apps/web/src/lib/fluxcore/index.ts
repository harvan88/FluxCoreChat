/**
 * FluxCore Library - Barrel Export
 * 
 * Exporta todas las utilidades de FluxCore desde un único punto de entrada.
 * 
 * Uso:
 * import { formatSize, formatDate, PROVIDER_MODELS } from '@/lib/fluxcore';
 */

// Formatters
export {
    formatSize,
    formatSizeKB,
    formatDate,
    formatDateTime,
    formatRelativeDate,
    estimateTokens,
    countWords,
    countLines,
    formatCost,
    calculateVectorStoreCostPerDay,
    truncate,
    truncateId,
} from './formatters';

// Constants
export {
    // Provider & Model
    PROVIDER_MODELS,
    PROVIDER_NAMES,
    DEFAULT_MODEL_CONFIG,
    DEFAULT_TIMING_CONFIG,

    // Content Limits
    MAX_INSTRUCTION_CHARS,
    OPENAI_LIMITS,
    MAX_BIO_CHARS,
    MAX_PRIVATE_CONTEXT_CHARS,

    // File Types
    ACCEPTED_FILE_EXTENSIONS,
    MIME_TYPE_MAP,

    // RAG
    DEFAULT_RAG_CONFIG,
    EMBEDDING_PROVIDERS,

    // Expiration
    EXPIRATION_POLICIES,

    // UI
    AUTOSAVE_DELAY_MS,
    COPY_NOTIFICATION_DURATION_MS,
    STATUS_COLORS,
} from './constants';
