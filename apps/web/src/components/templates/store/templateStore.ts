/**
 * Template Store
 * 
 * Store de Zustand para gestionar el estado de plantillas.
 * Permite compartir estado entre TemplateManager y TemplateEditor.
 */

import { create } from 'zustand';
import type { Template, CreateTemplateInput, UpdateTemplateInput, TemplateFilters, TemplateSort } from '../types';

// ============================================================================
// Mock Data (temporal hasta conectar con API)
// ============================================================================

const INITIAL_TEMPLATES: Template[] = [
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
    usageCount: 45,
    createdAt: '2025-01-01T09:00:00Z',
    updatedAt: '2025-01-25T11:00:00Z',
  },
];

// ============================================================================
// Store Interface
// ============================================================================

interface TemplateState {
  // Data
  templates: Template[];
  selectedTemplateId: string | null;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  
  // Filters
  filters: TemplateFilters;
  sort: TemplateSort;
  
  // Actions
  setTemplates: (templates: Template[]) => void;
  selectTemplate: (id: string | null) => void;
  setFilters: (filters: TemplateFilters) => void;
  setSort: (sort: TemplateSort) => void;
  setError: (error: string | null) => void;
  
  // CRUD
  fetchTemplates: (accountId: string) => Promise<void>;
  createTemplate: (accountId: string, data: CreateTemplateInput) => Promise<Template>;
  updateTemplate: (id: string, data: UpdateTemplateInput) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string, accountId: string) => Promise<Template>;
  
  // Getters
  getTemplateById: (id: string) => Template | undefined;
  getFilteredTemplates: () => Template[];
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useTemplateStore = create<TemplateState>((set, get) => ({
  // Initial state
  templates: [],
  selectedTemplateId: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  filters: {},
  sort: { field: 'updatedAt', direction: 'desc' },
  
  // Setters
  setTemplates: (templates) => set({ templates }),
  selectTemplate: (id) => set({ selectedTemplateId: id }),
  setFilters: (filters) => set({ filters }),
  setSort: (sort) => set({ sort }),
  setError: (error) => set({ error }),
  
  // Fetch templates
  fetchTemplates: async (accountId) => {
    set({ isLoading: true, error: null });
    
    try {
      // TODO: Reemplazar con llamada real a API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Usar mock data
      const data = INITIAL_TEMPLATES.filter(t => t.accountId === accountId || accountId);
      set({ templates: data, isLoading: false });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Error al cargar plantillas',
        isLoading: false 
      });
    }
  },
  
  // Create template
  createTemplate: async (accountId, data) => {
    set({ isCreating: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const newTemplate: Template = {
        id: `template-${Date.now()}`,
        accountId,
        name: data.name,
        content: data.content,
        category: data.category,
        variables: data.variables || [],
        tags: data.tags || [],
        isActive: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      set(state => ({ 
        templates: [newTemplate, ...state.templates],
        isCreating: false 
      }));
      
      return newTemplate;
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Error al crear plantilla',
        isCreating: false 
      });
      throw err;
    }
  },
  
  // Update template
  updateTemplate: async (id, data) => {
    set({ isUpdating: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let updatedTemplate: Template | undefined;
      
      set(state => ({
        templates: state.templates.map(t => {
          if (t.id === id) {
            updatedTemplate = {
              ...t,
              ...data,
              updatedAt: new Date().toISOString(),
            };
            return updatedTemplate;
          }
          return t;
        }),
        isUpdating: false,
      }));
      
      if (!updatedTemplate) {
        throw new Error('Plantilla no encontrada');
      }
      
      return updatedTemplate;
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Error al actualizar plantilla',
        isUpdating: false 
      });
      throw err;
    }
  },
  
  // Delete template
  deleteTemplate: async (id) => {
    set({ isDeleting: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      set(state => ({
        templates: state.templates.filter(t => t.id !== id),
        selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId,
        isDeleting: false,
      }));
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Error al eliminar plantilla',
        isDeleting: false 
      });
      throw err;
    }
  },
  
  // Duplicate template
  duplicateTemplate: async (id, accountId) => {
    const original = get().templates.find(t => t.id === id);
    if (!original) {
      throw new Error('Plantilla no encontrada');
    }
    
    return get().createTemplate(accountId, {
      name: `${original.name} (copia)`,
      content: original.content,
      category: original.category,
      variables: [...original.variables],
      tags: [...original.tags],
    });
  },
  
  // Get template by ID
  getTemplateById: (id) => {
    return get().templates.find(t => t.id === id);
  },
  
  // Get filtered and sorted templates
  getFilteredTemplates: () => {
    const { templates, filters, sort } = get();
    let result = [...templates];
    
    // Apply filters
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
    
    // Apply sort
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
  },
}));
