/**
 * LocalVectorStoresView - Vista de Bases de Conocimiento FluxCore (Local)
 * 
 * Maneja EXCLUSIVAMENTE vector stores con backend='local'.
 * NO debe contener ninguna lógica relacionada con OpenAI.
 * 
 * Separado de OpenAIVectorStoresView para garantizar aislamiento de flujos.
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

interface LocalVectorStoresViewProps {
    accountId: string;
    onOpenTab?: (tabId: string, title: string, data: any) => void;
    onClose?: () => void;
    vectorStoreId?: string;
}

export function LocalVectorStoresView({ accountId, onOpenTab, onClose, vectorStoreId }: LocalVectorStoresViewProps) {
    const { token } = useAuthStore();
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

    // Filtrar solo stores locales
    const localStores = useMemo(() =>
        vectorStores.filter(s => s.backend === 'local' || !s.backend),
        [vectorStores]
    );

    // Manejo de Selección
    const selectionOptions = useMemo(() => ({
        entities: localStores,
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
                if (data.success && (data.data.backend === 'local' || !data.data.backend)) {
                    return data.data;
                }
                return null;
            } catch (err) {
                console.error('[LocalVectorStoresView] Error loadById:', err);
                return null;
            }
        }
    }), [localStores, vectorStoreId, token, accountId]);

    const { selectEntity, isLoading: isSelectionLoading } = useEntitySelection<VectorStore>(selectionOptions);

    // Handlers
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

    const handleCreate = async () => {
        const created = await createVectorStore({
            accountId,
            name: 'Nueva base de conocimiento',
            status: 'draft' as any,
            backend: 'local' as any,
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

    // Efecto de Limpieza
    useEffect(() => {
        if (!vectorStoreId && onOpenTab && localSelectedStore) {
            setLocalSelectedStore(null);
        }
    }, [vectorStoreId, onOpenTab, localSelectedStore]);

    // Renderizado
    if (isSelectionLoading || (vectorStoreId && !localSelectedStore)) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted">Cargando base de conocimiento local...</p>
                </div>
            </div>
        );
    }

    if (localSelectedStore) {
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

    return (
        <div className="h-full flex flex-col">
            <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary">Base de conocimiento (Local)</h2>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-inverse shadow-sm transition-colors hover:bg-accent/90"
                >
                    <Database size={16} />
                    Nuevo vector store
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <VectorStoreList
                    stores={localStores}
                    loading={loading}
                    onCreate={handleCreate}
                    onSelect={handleSelect}
                    onDelete={deleteVectorStore}
                />
            </div>
        </div>
    );
}

export default LocalVectorStoresView;
