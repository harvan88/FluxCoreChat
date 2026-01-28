/**
 * Vector Stores View - Biblioteca de Bases de Conocimiento (Orquestador)
 * 
 * Implementa el patrón de arquitectura estable para evitar parpadeos y pérdida de datos.
 * Sincronizado 1:1 con la lógica original pero modularizado.
 * 
 * NOTA: La separación Local vs OpenAI es SOLO a nivel de código interno.
 * La UI muestra TODOS los stores en una sola lista combinada.
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
import { LocalVectorStoreDetail } from '../vectorStores/LocalVectorStoreDetail';
import { OpenAIVectorStoreDetail } from '../vectorStores/OpenAIVectorStoreDetail';

interface VectorStoresViewProps {
  accountId: string;
  onOpenTab?: (tabId: string, title: string, data: any) => void;
  onClose?: () => void;
  vectorStoreId?: string;
}

export function VectorStoresView({ accountId, onOpenTab, onClose, vectorStoreId }: VectorStoresViewProps) {
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

  const { selectEntity, isLoading: isSelectionLoading } = useEntitySelection<VectorStore>(selectionOptions);

  // 2. Handlers de Acción
  const handleSelect = (store: VectorStore) => {
    if (onOpenTab) {
      const identity = `extension:fluxcore:vectorStore:${accountId}:${store.id}`;
      onOpenTab(store.id, store.name, {
        type: 'vectorStore',
        identity,
        vectorStoreId: store.id,
      });
    } else {
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
        const identity = `extension:fluxcore:vectorStore:${accountId}:${created.id}`;
        onOpenTab(created.id, created.name, {
          type: 'vectorStore',
          identity,
          vectorStoreId: created.id,
        });
      } else {
        setLocalSelectedStore(created);
        selectEntity(created);
      }
    }
  };

  const handleUpdate = useCallback((updates: Partial<VectorStore>) => {
    setLocalSelectedStore(prev => prev ? { ...prev, ...updates } : prev);
    if (localSelectedStore?.id) {
      updateLocalStore(localSelectedStore.id, updates);
    }
  }, [localSelectedStore?.id, updateLocalStore]);

  const handleManualSave = async (updates?: Partial<VectorStore>) => {
    if (!localSelectedStore) return;

    const storeToSave = { ...localSelectedStore, ...updates };

    setIsSavingGlobal(true);
    const result = await updateVectorStore(localSelectedStore.id, {
      name: storeToSave.name,
      description: storeToSave.description,
      status: storeToSave.status,
      expirationPolicy: storeToSave.expirationPolicy,
      expirationDays: storeToSave.expirationDays,
    });

    if (result) {
      setLocalSelectedStore(prev => prev?.id === result.id ? { ...prev, ...result, name: prev.name } : result);
      await refresh();
    }
    setIsSavingGlobal(false);
  };

  // 3. Efecto de Limpieza
  useEffect(() => {
    if (!vectorStoreId && onOpenTab && localSelectedStore) {
      setLocalSelectedStore(null);
    }
  }, [vectorStoreId, onOpenTab, localSelectedStore]);

  // 4. Renderizado
  if (isSelectionLoading || (vectorStoreId && !localSelectedStore)) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Cargando base de conocimiento...</p>
        </div>
      </div>
    );
  }

  // Detalle de un store seleccionado - delega al componente correcto según backend
  if (localSelectedStore) {
    if (localSelectedStore.backend === 'openai') {
      return (
        <OpenAIVectorStoreDetail
          store={localSelectedStore}
          accountId={accountId}
          onUpdate={handleUpdate}
          onDelete={async () => {
            const success = await deleteVectorStore(localSelectedStore.id);
            if (success) {
              setLocalSelectedStore(null);
              if (onClose) onClose();
            }
          }}
          onSave={handleManualSave}
          onOpenTab={onOpenTab}
          isSaving={isSaving || isSavingGlobal}
          saveError={error}
        />
      );
    }

    return (
      <LocalVectorStoreDetail
        store={localSelectedStore}
        accountId={accountId}
        onUpdate={handleUpdate}
        onDelete={async () => {
          const success = await deleteVectorStore(localSelectedStore.id);
          if (success) {
            setLocalSelectedStore(null);
            if (onClose) onClose();
          }
        }}
        onSave={handleManualSave}
        isSaving={isSaving || isSavingGlobal}
        saveError={error}
        onOpenTab={onOpenTab}
      />
    );
  }

  // Vista de lista - muestra TODOS los stores juntos (sin separación visual)
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
