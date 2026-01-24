/**
 * FluxCore Tool Types
 * 
 * Tipos centralizados para el módulo de Herramientas.
 * Extraído de ToolsView.tsx y estructuras de AssistantsView.tsx
 */

import type { AuditFields } from './common.types';

// ============================================================================
// Tool Definition Types
// ============================================================================

/** Tipos de herramientas disponibles */
export type ToolType = 'mcp' | 'http' | 'internal' | 'system' | 'unknown';

/** Estado de una herramienta */
export type ToolStatus = 'active' | 'inactive' | 'deprecated';

/** Definición de herramienta (template) */
export interface ToolDefinition extends AuditFields {
    id: string;
    name: string;
    description?: string;
    type: ToolType;
    status: ToolStatus;
    version?: string;

    // Schema (OpenAPI o JSON Schema)
    schema?: {
        id: string;
        schemaJson: Record<string, unknown>;
        version: string;
        strict: boolean;
    };

    // Configuración por defecto
    defaultConfig?: Record<string, unknown>;

    // Categoría para UI
    category?: string;
    icon?: string;
}

// ============================================================================
// Tool Connection Types
// ============================================================================

/** Conexión de herramienta a una cuenta */
export interface ToolConnection extends AuditFields {
    id: string;
    toolDefinitionId: string;
    accountId: string;
    config?: Record<string, unknown>;
    enabled: boolean;
}

/** Herramienta conectada (join de definition + connection) */
export interface Tool {
    id: string;  // ID de la conexión
    name: string;  // Nombre de la definición
    type: ToolType;
    enabled?: boolean;
    config?: Record<string, unknown>;
}

// ============================================================================
// Assistant-Tool Relationship
// ============================================================================

/** Herramienta asignada a un asistente */
export interface AssistantTool {
    assistantId: string;
    toolId: string;
    configJson?: Record<string, unknown>;
    enabled: boolean;
}

// ============================================================================
// View Props Types
// ============================================================================

/** Props para vista de herramientas */
export interface ToolsViewProps {
    accountId: string;
    onOpenTab?: (tabId: string, title: string, data: unknown) => void;
    toolId?: string;
}

// ============================================================================
// Tool Categories (para UI)
// ============================================================================

/** Categorías de herramientas */
export const TOOL_CATEGORIES = {
    system: 'Sistema',
    integrations: 'Integraciones',
    custom: 'Personalizadas',
    marketplace: 'Marketplace',
} as const;

export type ToolCategory = keyof typeof TOOL_CATEGORIES;
