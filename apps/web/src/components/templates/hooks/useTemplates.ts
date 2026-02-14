/**
 * useTemplates Hook
 * 
 * Hook para gestionar plantillas de mensajes.
 * Maneja CRUD, filtrado y estado de carga.
 */

import { useState, useCallback, useEffect } from 'react';
import type { 
  Template, 
  CreateTemplateInput, 
  UpdateTemplateInput,
  TemplateFilters,
  TemplateSort 
} from '../types';

// ============================================================================
// Tipos del Hook
// ============================================================================

interface UseTemplatesOptions {
  accountId: string;
  initialFilters?: TemplateFilters;
  initialSort?: TemplateSort;
}

interface UseTemplatesReturn {
  // Data
  templates: Template[];
  filteredTemplates: Template[];
  selectedTemplate: Template | null;
  
  // Estado
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: Error | null;
  
  // Filtros
  filters: TemplateFilters;
  setFilters: (filters: TemplateFilters) => void;
  sort: TemplateSort;
  setSort: (sort: TemplateSort) => void;
  
  // Selección
  selectTemplate: (template: Template | null) => void;
  
  // CRUD
  createTemplate: (data: CreateTemplateInput) => Promise<Template>;
  updateTemplate: (id: string, data: UpdateTemplateInput) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<Template>;
  
  // Utilidades
  refetch: () => Promise<void>;
  getTemplateById: (id: string) => Template | undefined;
}

// ============================================================================
// Mock Data (temporal hasta conectar con API)
// ============================================================================

const MOCK_TEMPLATES: Template[] = [
  {
    id: '1',
    accountId: 'acc-1',
    name: 'Bienvenida',
    content: 'Hola {{nombre}}, ¡bienvenido/a a nuestro servicio! ¿En qué podemos ayudarte hoy?',
    category: 'greeting',
    variables: [
      { name: 'nombre', type: 'text', label: 'Nombre del cliente', required: true }
    ],
    tags: ['saludo', 'inicio'],
    isActive: true,
    authorizeForAI: false,
    aiUsageInstructions: null,
    usageCount: 150,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-20T15:30:00Z',
  },
  {
    id: '2',
    accountId: 'acc-1',
    name: 'Seguimiento de pedido',
    content: 'Hola {{nombre}}, tu pedido #{{numero_pedido}} está en camino. Llegará aproximadamente el {{fecha_entrega}}.',
    category: 'followup',
    variables: [
      { name: 'nombre', type: 'text', label: 'Nombre', required: true },
      { name: 'numero_pedido', type: 'text', label: 'Número de pedido', required: true },
      { name: 'fecha_entrega', type: 'date', label: 'Fecha de entrega', required: true },
    ],
    tags: ['pedido', 'seguimiento'],
    isActive: true,
    authorizeForAI: false,
    aiUsageInstructions: null,
    usageCount: 89,
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: '2025-01-18T12:00:00Z',
  },
  {
    id: '3',
    accountId: 'acc-1',
    name: 'Despedida',
    content: '¡Gracias por contactarnos, {{nombre}}! Si tienes más preguntas, no dudes en escribirnos. ¡Que tengas un excelente día!',
    category: 'closing',
    variables: [
      { name: 'nombre', type: 'text', label: 'Nombre', required: false }
    ],
    tags: ['despedida', 'cierre'],
    isActive: true,
    authorizeForAI: false,
    aiUsageInstructions: null,
    usageCount: 200,
    createdAt: '2025-01-05T14:00:00Z',
    updatedAt: '2025-01-05T14:00:00Z',
  },
  {
    id: '4',
    accountId: 'acc-1',
    name: 'Promoción especial',
    content: '🎉 ¡Hola {{nombre}}! Tenemos una oferta especial para ti: {{descuento}}% de descuento en {{producto}}. Válido hasta {{fecha_limite}}.',
    category: 'promotion',
    variables: [
      { name: 'nombre', type: 'text', label: 'Nombre', required: true },
      { name: 'descuento', type: 'number', label: 'Porcentaje de descuento', required: true },
      { name: 'producto', type: 'text', label: 'Producto', required: true },
      { name: 'fecha_limite', type: 'date', label: 'Fecha límite', required: true },
    ],
    tags: ['promoción', 'oferta', 'descuento'],
    isActive: false,
    authorizeForAI: false,
    aiUsageInstructions: null,
    usageCount: 45,
    createdAt: '2025-01-01T09:00:00Z',
    updatedAt: '2025-01-25T11:00:00Z',
  },
];

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTemplates(options: UseTemplatesOptions): UseTemplatesReturn {
  const { accountId, initialFilters = {}, initialSort = { field: 'updatedAt', direction: 'desc' } } = options;
  
  // Estado
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Filtros y ordenamiento
  const [filters, setFilters] = useState<TemplateFilters>(initialFilters);
  const [sort, setSort] = useState<TemplateSort>(initialSort);
  
  // Cargar templates
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Reemplazar con llamada real a API
      // const response = await fetch(`/api/accounts/${accountId}/templates`);
      // const data = await response.json();
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Usar mock data filtrada por accountId
      const data = MOCK_TEMPLATES.filter(t => t.accountId === accountId || accountId === 'acc-1');
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar plantillas'));
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);
  
  // Cargar al montar
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);
  
  // Filtrar y ordenar templates
  const filteredTemplates = useCallback(() => {
    let result = [...templates];
    
    // Aplicar filtros
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.content.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.category) {
      result = result.filter(t => t.category === filters.category);
    }
    
    if (filters.isActive !== undefined) {
      result = result.filter(t => t.isActive === filters.isActive);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(t => 
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }
    
    // Aplicar ordenamiento
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'usageCount':
          comparison = a.usageCount - b.usageCount;
          break;
      }
      
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [templates, filters, sort])();
  
  // CRUD Operations
  const createTemplate = useCallback(async (data: CreateTemplateInput): Promise<Template> => {
    setIsCreating(true);
    setError(null);
    
    try {
      // TODO: Reemplazar con llamada real a API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newTemplate: Template = {
        id: `temp-${Date.now()}`,
        accountId,
        name: data.name,
        content: data.content,
        category: data.category,
        variables: data.variables || [],
        tags: data.tags || [],
        isActive: true,
        authorizeForAI: data.authorizeForAI ?? false,
        aiUsageInstructions: data.aiUsageInstructions ?? null,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setTemplates(prev => [newTemplate, ...prev]);
      return newTemplate;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al crear plantilla');
      setError(error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [accountId]);
  
  const updateTemplate = useCallback(async (id: string, data: UpdateTemplateInput): Promise<Template> => {
    setIsUpdating(true);
    setError(null);
    
    try {
      // TODO: Reemplazar con llamada real a API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let updatedTemplate: Template | null = null;
      
      setTemplates(prev => prev.map(t => {
        if (t.id === id) {
          updatedTemplate = {
            ...t,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          return updatedTemplate;
        }
        return t;
      }));
      
      if (!updatedTemplate) {
        throw new Error('Plantilla no encontrada');
      }
      
      return updatedTemplate;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al actualizar plantilla');
      setError(error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, []);
  
  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    
    try {
      // TODO: Reemplazar con llamada real a API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setTemplates(prev => prev.filter(t => t.id !== id));
      
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al eliminar plantilla');
      setError(error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [selectedTemplate]);
  
  const duplicateTemplate = useCallback(async (id: string): Promise<Template> => {
    const original = templates.find(t => t.id === id);
    if (!original) {
      throw new Error('Plantilla no encontrada');
    }
    
    return createTemplate({
      name: `${original.name} (copia)`,
      content: original.content,
      category: original.category,
      variables: [...original.variables],
      tags: [...original.tags],
    });
  }, [templates, createTemplate]);
  
  // Utilidades
  const getTemplateById = useCallback((id: string) => {
    return templates.find(t => t.id === id);
  }, [templates]);
  
  return {
    templates,
    filteredTemplates,
    selectedTemplate,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    filters,
    setFilters,
    sort,
    setSort,
    selectTemplate: setSelectedTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    refetch: fetchTemplates,
    getTemplateById,
  };
}
