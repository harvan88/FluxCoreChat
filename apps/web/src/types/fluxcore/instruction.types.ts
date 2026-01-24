/**
 * FluxCore Instruction Types
 * 
 * Tipos centralizados para el módulo de Instrucciones del Sistema.
 * Extraído de InstructionsView.tsx
 */

import type { InstructionStatus, AuditFields, SizeFields } from './common.types';

// ============================================================================
// Instruction Entity
// ============================================================================

/** Instrucción del sistema (system prompt) */
export interface Instruction extends AuditFields, SizeFields {
    id: string;
    name: string;
    description?: string;
    content: string;
    status: InstructionStatus;

    // Métricas de contenido
    tokensEstimated: number;
    wordCount: number;
    lineCount: number;

    // Relaciones
    usedByAssistants?: string[];

    // Flags especiales
    isManaged?: boolean;  // true si es gestionada automáticamente (ej: desde perfil)
}

/** Datos para crear una instrucción */
export interface InstructionCreate {
    accountId: string;
    name: string;
    content: string;
    description?: string;
    status?: InstructionStatus;
}

/** Datos para actualizar una instrucción */
export interface InstructionUpdate {
    accountId: string;
    name?: string;
    content?: string;
    description?: string;
    status?: InstructionStatus;
}

// ============================================================================
// Content Stats (para métricas en tiempo real)
// ============================================================================

/** Estadísticas de contenido */
export interface ContentStats {
    lines: number;
    words: number;
    tokens: number;
    chars: number;
}

// ============================================================================
// View Props Types
// ============================================================================

/** Props para vista de instrucciones */
export interface InstructionsViewProps {
    accountId: string;
    onOpenTab?: (tabId: string, title: string, data: unknown) => void;
    instructionId?: string;
}

// ============================================================================
// Editor Types
// ============================================================================

/** Modos de visualización del editor */
export type EditorViewMode = 'code' | 'preview';

/** Estado del portapapeles */
export type ClipboardStatus = 'idle' | 'copied' | 'error';
