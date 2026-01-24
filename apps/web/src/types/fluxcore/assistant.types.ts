/**
 * FluxCore Assistant Types
 * 
 * Tipos centralizados para el módulo de Asistentes.
 * Extraído de AssistantsView.tsx y OpenAIAssistantConfigView.tsx
 */

import type {
    AssistantStatus,
    AssistantRuntime,
    ModelConfig,
    TimingConfig,
    AuditFields,
    SizeFields,
} from './common.types';

// ============================================================================
// Base Assistant Types
// ============================================================================

/** Asistente FluxCore (modelo unificado local/OpenAI) */
export interface Assistant extends AuditFields, SizeFields {
    id: string;
    name: string;
    description?: string;
    status: AssistantStatus;
    runtime?: AssistantRuntime;
    externalId?: string;  // ID en OpenAI cuando runtime='openai'

    // Referencias a otros activos (composición)
    instructionIds?: string[];
    vectorStoreIds?: string[];
    toolIds?: string[];

    // Configuración del modelo
    modelConfig: ModelConfig;

    // Configuración de timing
    timingConfig: TimingConfig;

    // Métricas
    tokensUsed: number;
}

/** Datos para crear un asistente */
export interface AssistantCreate {
    accountId: string;
    name: string;
    description?: string;
    status?: AssistantStatus;
    runtime?: AssistantRuntime;
    instructionIds?: string[];
    vectorStoreIds?: string[];
    toolIds?: string[];
    modelConfig?: Partial<ModelConfig>;
    timingConfig?: Partial<TimingConfig>;
}

/** Datos para actualizar un asistente */
export interface AssistantUpdate {
    accountId: string;
    name?: string;
    description?: string;
    status?: AssistantStatus;
    instructionIds?: string[];
    vectorStoreIds?: string[];
    toolIds?: string[];
    modelConfig?: Partial<ModelConfig>;
    timingConfig?: Partial<TimingConfig>;
}

// ============================================================================
// OpenAI-Specific Types
// ============================================================================

/** Asistente específico de OpenAI (con campos adicionales de la API) */
export interface OpenAIAssistant {
    id: string;
    name: string;
    description: string | null;
    externalId: string | null;
    modelConfig: ModelConfig;
    status: string;
    createdAt: string;
    updatedAt: string;

    // Campos específicos de OpenAI
    instructions?: string;
    tools?: OpenAITool[];
    fileIds?: string[];
    metadata?: Record<string, string>;
}

/** Herramienta de OpenAI */
export interface OpenAITool {
    type: 'code_interpreter' | 'file_search' | 'function';
    function?: {
        name: string;
        description?: string;
        parameters?: Record<string, unknown>;
    };
}

// ============================================================================
// Reference Types (usados en selección)
// ============================================================================

/** Referencia simplificada a instrucción (para selectores) */
export interface InstructionRef {
    id: string;
    name: string;
}

/** Referencia simplificada a vector store (para selectores) */
export interface VectorStoreRef {
    id: string;
    name: string;
    backend?: 'local' | 'openai';
    externalId?: string;
}

/** Referencia simplificada a tool (para selectores) */
export interface ToolRef {
    id: string;
    name: string;
    type: string;
}

// ============================================================================
// View Props Types
// ============================================================================

/** Props para vista de asistentes */
export interface AssistantsViewProps {
    accountId: string;
    onOpenTab?: (tabId: string, title: string, data: unknown) => void;
    assistantId?: string;
}

/** Props para configuración de asistente OpenAI */
export interface OpenAIAssistantConfigViewProps {
    assistantId: string;
    accountId: string;
    onClose: () => void;
    onSave?: () => void;
    onDelete?: () => void;
}
