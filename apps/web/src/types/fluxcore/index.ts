/**
 * FluxCore Types - Barrel Export
 * 
 * Exporta todos los tipos de FluxCore desde un único punto de entrada.
 * 
 * Uso:
 * import type { Assistant, Instruction, VectorStore } from '@/types/fluxcore';
 * import { TOOL_CATEGORIES } from '@/types/fluxcore';
 */

// ============================================================================
// Common Types
// ============================================================================
export type {
    // Status
    AssistantStatus,
    InstructionStatus,
    VectorStoreStatus,
    FileProcessingStatus,

    // Runtime & Backend
    AssistantRuntime,
    VectorStoreBackend,

    // Visibility
    AssetVisibility,

    // API
    ApiResponse,
    PaginatedResponse,

    // Common Fields
    AuditFields,
    SizeFields,

    // Model Config
    AIProvider,
    ModelConfig,
    TimingConfig,

    // RAG Config
    ChunkingStrategy,
    EmbeddingProvider,
    ChunkingConfig,
    EmbeddingConfig,
    RetrievalConfig,
    RAGConfig,

    // Expiration
    ExpirationPolicy,
} from './common.types';

// ============================================================================
// Assistant Types
// ============================================================================
export type {
    Assistant,
    AssistantCreate,
    AssistantUpdate,
    OpenAIAssistant,
    OpenAITool,
    InstructionRef,
    VectorStoreRef,
    ToolRef,
    AssistantsViewProps,
    OpenAIAssistantConfigViewProps,
} from './assistant.types';

// ============================================================================
// Instruction Types
// ============================================================================
export type {
    Instruction,
    InstructionCreate,
    InstructionUpdate,
    ContentStats,
    InstructionsViewProps,
    EditorViewMode,
    ClipboardStatus,
} from './instruction.types';

// ============================================================================
// Vector Store Types
// ============================================================================
export type {
    VectorStore,
    VectorStoreCreate,
    VectorStoreUpdate,
    VectorStoreFile,
    FileUploadData,
    OpenAIVectorStore,
    OpenAIFile,
    SearchResult,
    VectorStoresViewProps,
    OpenAIVectorStoresViewProps,
    VectorStoreFilesSectionProps,
    RAGConfigSectionProps,
} from './vectorStore.types';

// ============================================================================
// Tool Types
// ============================================================================
export type {
    ToolType,
    ToolStatus,
    ToolDefinition,
    ToolConnection,
    Tool,
    AssistantTool,
    ToolsViewProps,
    ToolCategory,
} from './tool.types';

// Re-export constants
export { TOOL_CATEGORIES } from './tool.types';
