/**
 * Template Types
 * 
 * Tipos TypeScript para el sistema de plantillas de mensajes.
 */

// ============================================================================
// Tipos Base
// ============================================================================

export interface Template {
  id: string;
  accountId: string;
  name: string;
  content: string;
  category?: string;
  variables: TemplateVariable[];
  tags: string[];
  assets?: TemplateAsset[];
  isActive: boolean;
  authorizeForAI: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'contact' | 'custom';
  label?: string;
  defaultValue?: string;
  required: boolean;
  placeholder?: string;
}

export interface TemplateAsset {
  assetId: string;
  slot: string;
  version: number;
  linkedAt: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: string;
}

// ============================================================================
// Input Types (para crear/actualizar)
// ============================================================================

export interface CreateTemplateInput {
  name: string;
  content: string;
  category?: string;
  variables?: TemplateVariable[];
  tags?: string[];
  authorizeForAI?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  content?: string;
  category?: string;
  variables?: TemplateVariable[];
  tags?: string[];
  isActive?: boolean;
  authorizeForAI?: boolean;
}

// ============================================================================
// Categorías predefinidas
// ============================================================================

export const TEMPLATE_CATEGORIES = [
  { value: 'greeting', label: 'Saludos' },
  { value: 'followup', label: 'Seguimiento' },
  { value: 'closing', label: 'Despedida' },
  { value: 'promotion', label: 'Promoción' },
  { value: 'reminder', label: 'Recordatorio' },
  { value: 'support', label: 'Soporte' },
  { value: 'other', label: 'Otro' },
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number]['value'];

// ============================================================================
// Tipos de Variable
// ============================================================================

export const VARIABLE_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'contact', label: 'Contacto' },
  { value: 'custom', label: 'Personalizado' },
] as const;

// ============================================================================
// Filtros y Ordenamiento
// ============================================================================

export interface TemplateFilters {
  search?: string;
  category?: string;
  isActive?: boolean;
  authorizeForAI?: boolean;
  tags?: string[];
}

export type TemplateSortField = 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
export type SortDirection = 'asc' | 'desc';

export interface TemplateSort {
  field: TemplateSortField;
  direction: SortDirection;
}
