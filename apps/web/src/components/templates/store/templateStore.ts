/**
 * Template Store
 * 
 * Store de Zustand para gestionar el estado de plantillas.
 * Permite compartir estado entre TemplateManager y TemplateEditor.
 */

import { create } from 'zustand';
import { api } from '../../../services/api';
import type { Template, CreateTemplateInput, UpdateTemplateInput, TemplateFilters, TemplateSort } from '../types';

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
  updateTemplate: (accountId: string, id: string, data: UpdateTemplateInput) => Promise<Template>;
  deleteTemplate: (accountId: string, id: string) => Promise<void>;
  duplicateTemplate: (id: string, accountId: string) => Promise<Template>;
  linkAsset: (accountId: string, templateId: string, assetId: string, slot?: string) => Promise<void>;
  unlinkAsset: (accountId: string, templateId: string, assetId: string, slot?: string) => Promise<void>;

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

    if (!accountId) {
      set({ error: 'Cuenta no válida', isLoading: false });
      return;
    }

    try {
      const response = await api.listTemplates(accountId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Error al cargar plantillas');
      }

      set({ templates: response.data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar plantillas',
        isLoading: false,
      });
    }
  },

  // Create template
  createTemplate: async (accountId, data) => {
    set({ isCreating: true, error: null });

    try {
      const response = await api.createTemplate(accountId, data);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Error al crear plantilla');
      }

      const newTemplate = response.data;
      set((state) => ({
        templates: [newTemplate, ...state.templates],
        isCreating: false,
      }));

      return newTemplate;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al crear plantilla');
      set({ error: error.message, isCreating: false });
      throw error;
    }
  },

  // Update template
  updateTemplate: async (accountId, id, data) => {
    set({ isUpdating: true, error: null });

    try {
      const response = await api.updateTemplate(accountId, id, data);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Error al actualizar plantilla');
      }

      const updatedTemplate = response.data;
      set((state) => ({
        templates: state.templates.map((t) => (t.id === id ? updatedTemplate : t)),
      }));

      return updatedTemplate;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al actualizar plantilla');
      set({ error: error.message });
      throw error;
    } finally {
      set({ isUpdating: false });
    }
  },

  // Delete template
  deleteTemplate: async (accountId, id) => {
    set({ isDeleting: true, error: null });

    try {
      const response = await api.deleteTemplate(accountId, id);
      if (!response.success) {
        throw new Error(response.error || 'Error al eliminar plantilla');
      }

      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al eliminar plantilla');
      set({ error: error.message });
      throw error;
    } finally {
      set({ isDeleting: false });
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

  // Link asset
  linkAsset: async (accountId, templateId, assetId, slot = 'default') => {
    set({ error: null });

    try {
      const response = await api.linkTemplateAsset(accountId, templateId, assetId, slot);
      if (!response.success) {
        throw new Error(response.error || 'Error al vincular archivo');
      }

      const templateResponse = await api.getTemplate(accountId, templateId);
      if (!templateResponse.success || !templateResponse.data) {
        await get().fetchTemplates(accountId);
        return;
      }

      const refreshedTemplate = templateResponse.data;
      set((state) => ({
        templates: state.templates.map((t) => (t.id === templateId ? refreshedTemplate : t)),
      }));

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al vincular archivo');
      set({ error: error.message });
      throw error;
    }
  },

  // Unlink asset
  unlinkAsset: async (accountId, templateId, assetId, slot = 'default') => {
    try {
      const response = await api.unlinkTemplateAsset(accountId, templateId, assetId, slot);
      if (!response.success) throw new Error(response.error || 'Error al desvincular archivo');

      const templateResponse = await api.getTemplate(accountId, templateId);
      if (!templateResponse.success || !templateResponse.data) {
        await get().fetchTemplates(accountId);
        return;
      }

      const refreshedTemplate = templateResponse.data;
      set((state) => ({
        templates: state.templates.map(t => (t.id === templateId ? refreshedTemplate : t)),
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al desvincular archivo');
      set({ error: error.message });
      throw error;
    }
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
