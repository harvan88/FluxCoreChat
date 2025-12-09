/**
 * FC-306: Enrichment Store
 * Store de Zustand para enrichments de mensajes
 */

import { create } from 'zustand';
import type { Enrichment, EnrichmentBatch, EnrichmentType } from '../types/enrichments';

interface EnrichmentState {
  // Map de messageId -> Enrichment[]
  enrichments: Map<string, Enrichment[]>;
  
  // Estado de carga por mensaje
  loading: Map<string, boolean>;
  
  // Errores por mensaje
  errors: Map<string, string>;
}

interface EnrichmentActions {
  // Agregar enrichments para un mensaje
  addEnrichments: (messageId: string, enrichments: Enrichment[]) => void;
  
  // Procesar batch de enrichments desde WebSocket
  processBatch: (batch: EnrichmentBatch) => void;
  
  // Obtener enrichments de un mensaje
  getEnrichments: (messageId: string) => Enrichment[];
  
  // Obtener enrichment específico por tipo
  getEnrichmentByType: (messageId: string, type: EnrichmentType) => Enrichment | undefined;
  
  // Marcar mensaje como cargando
  setLoading: (messageId: string, loading: boolean) => void;
  
  // Establecer error
  setError: (messageId: string, error: string | null) => void;
  
  // Limpiar enrichments de un mensaje
  clearEnrichments: (messageId: string) => void;
  
  // Limpiar todo
  clearAll: () => void;
}

type EnrichmentStore = EnrichmentState & EnrichmentActions;

export const useEnrichmentStore = create<EnrichmentStore>((set, get) => ({
  // Initial state
  enrichments: new Map(),
  loading: new Map(),
  errors: new Map(),

  // Actions
  addEnrichments: (messageId, newEnrichments) => {
    set((state) => {
      const updated = new Map(state.enrichments);
      const existing = updated.get(messageId) || [];
      
      // Merge, avoiding duplicates by id
      const existingIds = new Set(existing.map(e => e.id));
      const merged = [
        ...existing,
        ...newEnrichments.filter(e => !existingIds.has(e.id)),
      ];
      
      updated.set(messageId, merged);
      return { enrichments: updated };
    });
  },

  processBatch: (batch) => {
    const { addEnrichments, setLoading } = get();
    setLoading(batch.messageId, false);
    addEnrichments(batch.messageId, batch.enrichments);
  },

  getEnrichments: (messageId) => {
    return get().enrichments.get(messageId) || [];
  },

  getEnrichmentByType: (messageId, type) => {
    const enrichments = get().enrichments.get(messageId) || [];
    return enrichments.find(e => e.type === type);
  },

  setLoading: (messageId, loading) => {
    set((state) => {
      const updated = new Map(state.loading);
      if (loading) {
        updated.set(messageId, true);
      } else {
        updated.delete(messageId);
      }
      return { loading: updated };
    });
  },

  setError: (messageId, error) => {
    set((state) => {
      const updated = new Map(state.errors);
      if (error) {
        updated.set(messageId, error);
      } else {
        updated.delete(messageId);
      }
      return { errors: updated };
    });
  },

  clearEnrichments: (messageId) => {
    set((state) => {
      const enrichments = new Map(state.enrichments);
      const loading = new Map(state.loading);
      const errors = new Map(state.errors);
      
      enrichments.delete(messageId);
      loading.delete(messageId);
      errors.delete(messageId);
      
      return { enrichments, loading, errors };
    });
  },

  clearAll: () => {
    set({
      enrichments: new Map(),
      loading: new Map(),
      errors: new Map(),
    });
  },
}));

// Selector hooks
export const useMessageEnrichments = (messageId: string) => {
  return useEnrichmentStore((state) => state.enrichments.get(messageId) || []);
};

export const useMessageEnrichmentByType = (messageId: string, type: EnrichmentType) => {
  return useEnrichmentStore((state) => {
    const enrichments = state.enrichments.get(messageId) || [];
    return enrichments.find(e => e.type === type);
  });
};

export const useIsEnrichmentLoading = (messageId: string) => {
  return useEnrichmentStore((state) => state.loading.get(messageId) || false);
};
