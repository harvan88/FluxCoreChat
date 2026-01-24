/**
 * Vector Stores View - Biblioteca de Bases de Conocimiento (Orquestador)
 * 
 * Implementa el patrón de arquitectura estable para evitar parpadeos y pérdida de datos.
 * Sincronizado 1:1 con la lógica original pero modularizado.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Database } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import {
  useVectorStores,
  useEntitySelection
} from '../../../hooks/fluxcore';
import type { VectorStore } from '../../../types/fluxcore';
import { VectorStoreList } from '../vectorStores/VectorStoreList';
import { VectorStoreDetail } from '../vectorStores/VectorStoreDetail';

interface VectorStoresViewProps {
  accountId: string;
  onOpenTab?: (tabId: string, title: string, data: any) => void;
  vectorStoreId?: string;
}

export function VectorStoresView({ accountId, onOpenTab, vectorStoreId }: VectorStoresViewProps) {
  const { token } = useAuthStore();
  const [showBackendModal, setShowBackendModal] = useState(false);
  const [localSelectedStore, setLocalSelectedStore] = useState<VectorStore | null>(null);
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  const {
    vectorStores,
    loading,
    error,
    isSaving,
    createVectorStore,
    updateVectorStore,
    updateLocalStore,
    deleteVectorStore,
    refresh
  } = useVectorStores(accountId);

  // 1. Manejo de Selección y URL (Sincronizado)
  const selectionOptions = useMemo(() => ({
    entities: vectorStores,
    urlId: vectorStoreId,
    onSelect: (store: VectorStore) => {
      // Solo actualizar si realmente cambió o si no tenemos nada
      setLocalSelectedStore(prev => {
        if (prev?.id === store.id) return prev;
        return store;
      });
    },
    loadById: async (id: string) => {
      if (!token) return null;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await fetch(`/api/fluxcore/vector-stores/${id}?accountId=${accountId}`, { headers });
        const data = await response.json();
        return data.success ? data.data : null;
      } catch (err) {
        console.error('[VectorStoresView] Error loadById:', err);
        return null;
      }
    }
  }), [vectorStores, vectorStoreId, token, accountId]);

  const { selectEntity } = useEntitySelection<VectorStore>(selectionOptions);

  // 2. Handlers de Acción
  const handleSelect = (store: VectorStore) => {
    if (onOpenTab) {
      // En modo Panel, abrimos pestaña y NO cambiamos el estado local de la lista
      onOpenTab(store.id, store.name, {
        type: 'vectorStore',
        vectorStoreId: store.id,
      });
    } else {
      // En modo Single Page, mostramos detalle localmente
      setLocalSelectedStore(store);
      selectEntity(store);
    }
  };

  const handleCreate = async (backend: 'local' | 'openai') => {
    setShowBackendModal(false);
    const created = await createVectorStore({
      accountId,
      name: backend === 'openai' ? 'Nueva base OpenAI' : 'Nueva base de conocimiento',
      status: 'draft' as any,
      backend: backend as any,
      expirationPolicy: 'never' as any,
    });

    if (created) {
      if (onOpenTab) {
        onOpenTab(created.id, created.name, {
          type: 'vectorStore',
          vectorStoreId: created.id,
        });
      } else {
        setLocalSelectedStore(created);
        selectEntity(created);
      }
    }
  };

  const handleUpdate = useCallback((updates: Partial<VectorStore>) => {
    // 1. Cambio local inmediato (Estabilidad)
    setLocalSelectedStore(prev => prev ? { ...prev, ...updates } : prev);

    // 2. Sincronizar optimísticamente con la lista global (si existe en la lista)
    if (localSelectedStore?.id) {
      updateLocalStore(localSelectedStore.id, updates);
    }
  }, [localSelectedStore?.id, updateLocalStore]);

  const handleManualSave = async () => {
    if (!localSelectedStore) return;

    setIsSavingGlobal(true);
    const result = await updateVectorStore(localSelectedStore.id, {
      name: localSelectedStore.name,
      description: localSelectedStore.description,
      status: localSelectedStore.status,
      expirationPolicy: localSelectedStore.expirationPolicy,
    });

    if (result) {
      // Mantener los cambios locales pero aplicar el feedback del servidor
      setLocalSelectedStore(prev => prev?.id === result.id ? { ...prev, ...result, name: prev.name } : result);
      await refresh();
    }
    setIsSavingGlobal(false);
  };

  // 3. Efecto de Limpieza (Si estamos en modo lista y desaparece la selección)
  useEffect(() => {
    if (!vectorStoreId && onOpenTab && localSelectedStore) {
      setLocalSelectedStore(null);
    }
  }, [vectorStoreId, onOpenTab, localSelectedStore]);

  // 4. Renderizado
  if (localSelectedStore) {
    return (
      <VectorStoreDetail
        store={localSelectedStore}
        accountId={accountId}
        onUpdate={handleUpdate}
        onDelete={() => deleteVectorStore(localSelectedStore.id)}
        onSave={handleManualSave}
        isSaving={isSaving || isSavingGlobal}
        saveError={error}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Base de conocimiento</h2>
        <button
          onClick={() => setShowBackendModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-inverse shadow-sm transition-colors hover:bg-accent/90"
        >
          <Database size={16} />
          Nuevo vector store
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <VectorStoreList
          stores={vectorStores}
          loading={loading}
          onCreate={() => setShowBackendModal(true)}
          onSelect={handleSelect}
          onDelete={deleteVectorStore}
        />
      </div>

      {/* Backend Selection Modal */}
      {showBackendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBackendModal(false)}>
          <div className="bg-surface border border-subtle rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-primary mb-4">Selecciona el tipo de base</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleCreate('local')}
                className="w-full p-4 bg-hover border border-subtle rounded-lg hover:bg-active transition-all text-left flex items-start gap-4"
              >
                <div className="p-2 bg-background rounded-md text-accent"><Database size={24} /></div>
                <div>
                  <div className="font-medium text-primary">Almacenamiento Local</div>
                  <p className="text-xs text-secondary mt-1">Gratis, rápido y bajo tu control total.</p>
                </div>
              </button>
              <button
                onClick={() => handleCreate('openai')}
                className="w-full p-4 bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-all text-left flex items-start gap-4"
              >
                <div className="p-2 bg-background rounded-md text-accent"><Database size={24} /></div>
                <div>
                  <div className="font-medium text-primary flex items-center gap-2">
                    OpenAI Vector Store
                    <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-bold uppercase">Cloud</span>
                  </div>
                  <p className="text-xs text-secondary mt-1">Sincronizado con OpenAI. Requiere créditos API.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VectorStoresView;
