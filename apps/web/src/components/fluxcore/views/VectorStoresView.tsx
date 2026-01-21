/**
 * Vector Stores View - Biblioteca de Bases de Conocimiento
 * 
 * Los Vector Stores son FUENTES DE CONOCIMIENTO INDEXADO desacopladas del asistente.
 * Un Vector Store puede ser compartido entre cuentas y servir como "fuente única de verdad".
 * El Vector Store NO PERTENECE al asistente - el asistente lo REFERENCIA.
 * 
 * Características:
 * - Compartible entre cuentas
 * - Consume múltiples files
 * - Accedido por referencia
 */

import { useState, useEffect, useRef } from 'react';
import {
  Database,
  Plus,
  Pencil,
  Share2,
  RotateCcw,
  Copy,
} from 'lucide-react';
import { Button, Badge, DoubleConfirmationDeleteButton } from '../../ui';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { RAGConfigSection } from '../components/RAGConfigSection';
import { VectorStoreFilesSection } from '../components/VectorStoreFilesSection';
import { useAuthStore } from '../../../store/authStore';
import { OpenAIIcon } from '../../../lib/icon-library';

interface VectorStoreFile {
  id: string;
  name: string;
  updatedAt: string;
  lastModifiedBy?: string;
}

interface VectorStore {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'expired';
  backend?: 'local' | 'openai';
  externalId?: string;
  updatedAt: string;
  lastModifiedBy?: string;
  sizeBytes: number;
  fileCount: number;
  expirationPolicy: string;
  expiresAt?: string;
  files?: VectorStoreFile[];
  usedByAssistants?: { id: string; name: string }[];
}

interface VectorStoresViewProps {
  accountId: string;
  onOpenTab?: (tabId: string, title: string, data: any) => void;
  vectorStoreId?: string;
}

export function VectorStoresView({ accountId, onOpenTab, vectorStoreId }: VectorStoresViewProps) {
  const { token } = useAuthStore();
  const [stores, setStores] = useState<VectorStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<VectorStore | null>(null);
  const autoSelectedStoreIdRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showBackendModal, setShowBackendModal] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (accountId && token) loadStores();
  }, [accountId, token]);

  const loadStores = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch(`/api/fluxcore/vector-stores?accountId=${accountId}`, { headers });
      const data = await response.json();
      if (data.success) {
        setStores(data.data || []);
      }
    } catch (error) {
      console.error('Error loading vector stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreById = async (id: string) => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch(`/api/fluxcore/vector-stores/${id}?accountId=${accountId}`, { headers });
      const data = await response.json();
      if (data.success && data.data) {
        setSelectedStore(data.data);
      }
    } catch (error) {
      console.error('Error loading vector store:', error);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    if (!selectedStore?.id) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/fluxcore/vector-stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          name: selectedStore.name,
          description: selectedStore.description ?? undefined,
          status: selectedStore.status,
          expirationPolicy: selectedStore.expirationPolicy,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Error saving vector store:', text);
        setSaveError('Error al guardar cambios');
        return;
      }

      await loadStores();
    } catch (e) {
      console.error('Error saving vector store', e);
      setSaveError('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNew = () => {
    setShowBackendModal(true);
  };

  const handleCreateVectorStoreWithBackend = async (backend: 'local' | 'openai') => {
    setShowBackendModal(false);
    if (!token) {
      console.error('Cannot create vector store: missing auth token');
      return;
    }

    try {
      const res = await fetch('/api/fluxcore/vector-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          name: backend === 'openai' ? 'Nuevo vector store OpenAI' : 'Nuevo vector store',
          status: 'draft',
          backend,
          expirationPolicy: 'never',
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Error creating vector store:', res.status, text);
        return;
      }

      const created = await res.json();
      if (created.success && created.data) {
        await loadStores();
        if (onOpenTab) {
          onOpenTab(created.data.id, created.data.name, {
            type: 'vectorStore',
            vectorStoreId: created.data.id,
          });
        } else {
          setSelectedStore(created.data);
        }
      }
    } catch (e) {
      console.error('Error creating vector store', e);
    }
  };

  const handleSelectStore = (store: VectorStore) => {
    if (onOpenTab) {
      onOpenTab(store.id, store.name, {
        type: 'vectorStore',
        vectorStoreId: store.id,
      });
      return;
    }

    setSelectedStore(store);
  };

  const deleteStoreById = async (id: string) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/fluxcore/vector-stores/${id}?accountId=${accountId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setStores((prev) => prev.filter((s) => s.id !== id));
        setSelectedStore((prev) => (prev?.id === id ? null : prev));
        setSaveError(null);
        return;
      }

      const data = await response.json().catch(() => null);
      const msg = typeof data?.message === 'string' ? data.message : 'No se pudo eliminar el vector store';
      setSaveError(msg);
    } catch (error) {
      console.error('Error deleting vector store:', error);
      setSaveError('Error de conexión');
    }
  };

  const handleDeleteStore = async () => {
    if (!selectedStore) return;
    await deleteStoreById(selectedStore.id);
  };

  useEffect(() => {
    if (!vectorStoreId) return;
    if (!token) return;
    if (selectedStore?.id === vectorStoreId) return;
    if (autoSelectedStoreIdRef.current === vectorStoreId) return;

    const fromList = stores.find((s) => s.id === vectorStoreId);
    autoSelectedStoreIdRef.current = vectorStoreId;
    if (fromList) {
      setSelectedStore(fromList);
    }
    void loadStoreById(vectorStoreId);
  }, [vectorStoreId, stores, selectedStore?.id, token]);

  useEffect(() => {
    if (!onOpenTab) return;
    if (vectorStoreId) return;
    if (!selectedStore) return;
    setSelectedStore(null);
  }, [onOpenTab, selectedStore, vectorStoreId]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Activo</Badge>;
      case 'expired':
        return <Badge variant="error">Expirado</Badge>;
      default:
        return <Badge variant="info">Borrador</Badge>;
    }
  };

  const copyConfigToClipboard = async (store: VectorStore) => {
    const config = {
      vectorStore: {
        id: store.id,
        name: store.name,
        description: store.description,
        status: store.status,
        expirationPolicy: store.expirationPolicy,
        expiresAt: store.expiresAt,
        sizeBytes: store.sizeBytes,
        fileCount: store.fileCount,
        updatedAt: store.updatedAt,
      },
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  // Vista de detalle
  if (selectedStore) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b border-subtle flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {!vectorStoreId && (
              <button
                onClick={() => setSelectedStore(null)}
                className="text-muted hover:text-primary flex-shrink-0"
              >
                ← Volver
              </button>
            )}
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded border border-transparent hover:border-[var(--text-primary)] focus-within:border-[var(--text-primary)] transition-colors bg-transparent">
              <button
                type="button"
                onClick={() => nameInputRef.current?.focus()}
                className="p-1 text-muted hover:text-primary transition-colors flex-shrink-0"
                aria-label="Editar nombre del vector store"
              >
                <Pencil size={16} />
              </button>
              <input
                ref={nameInputRef}
                type="text"
                className="text-lg font-semibold text-primary bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
                value={selectedStore.name}
                onChange={(e) => setSelectedStore({ ...selectedStore, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                onBlur={(e) => {
                  const nextName = e.target.value.trim();
                  if (nextName && nextName !== selectedStore.name) {
                    setSelectedStore({ ...selectedStore, name: nextName });
                  }
                }}
                placeholder="Nombre del vector store"
                aria-label="Nombre del vector store"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSaving && <span className="text-xs text-muted">Guardando...</span>}
            {saveError && <span className="text-xs text-red-500">{saveError}</span>}
            <Button size="sm" onClick={handleSave}>Guardar</Button>
          </div>
        </div>

        {/* Content - área scrolleable */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* ID */}
            <div className="text-sm">
              <span className="text-muted">ID: </span>
              <span className="text-secondary font-mono">{selectedStore.id}</span>
            </div>

            {/* Detalles */}
            <CollapsibleSection title="Detalles" defaultExpanded showToggle={false}>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-secondary">Uso estimado</span>
                  <span className="text-primary">
                    {selectedStore.backend === 'openai'
                      ? `$${((selectedStore.sizeBytes / (1024 * 1024 * 1024)) * 0.10).toFixed(5)} / día (OpenAI)`
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Tamaño</span>
                  <span className="text-primary">{formatSize(selectedStore.sizeBytes)}</span>
                </div>
              </div>
            </CollapsibleSection>

            {/* Configuración */}
            <CollapsibleSection title="Configuración" defaultExpanded>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Política de expiración</span>
                  <select
                    className="bg-elevated border border-default rounded px-3 py-1.5 text-sm text-primary"
                    value={selectedStore.expirationPolicy}
                    onChange={(e) => setSelectedStore({ ...selectedStore, expirationPolicy: e.target.value })}
                  >
                    <option value="never">Nunca</option>
                    <option value="days_after_creation">Días después de crear</option>
                    <option value="days_after_last_use">Días después de último uso</option>
                  </select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Expiración</span>
                  <span className="text-primary">
                    {selectedStore.expiresAt ? formatDate(selectedStore.expiresAt) : 'Nunca'}
                  </span>
                </div>
              </div>
            </CollapsibleSection>

            {/* Archivos adjuntos */}
            <CollapsibleSection title="Archivos adjuntos" defaultExpanded>
              <VectorStoreFilesSection
                vectorStoreId={selectedStore.id}
                accountId={accountId}
                onFileCountChange={(count) => setSelectedStore({ ...selectedStore, fileCount: count })}
              />
            </CollapsibleSection>

            {/* Configuración RAG - SOLO para Local */}
            {selectedStore.backend !== 'openai' && (
              <RAGConfigSection
                vectorStoreId={selectedStore.id}
                accountId={accountId}
              />
            )}
          </div>
        </div>

        {/* Footer fijo con botón copiar JSON y eliminar */}
        <div className="px-6 py-3 border-t border-subtle flex items-center justify-between">
          <button
            onClick={() => copyConfigToClipboard(selectedStore)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary hover:text-primary hover:bg-elevated rounded transition-colors"
            title="Copiar configuración como JSON"
          >
            <Copy size={16} />
            <span>Copiar JSON</span>
          </button>
          <DoubleConfirmationDeleteButton
            onConfirm={handleDeleteStore}
            size={16}
          />
        </div>
      </div>
    );
  }

  // Vista de lista
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Base de conocimiento</h2>
        <Button size="sm" onClick={handleCreateNew}>
          <Plus size={16} className="mr-1" />
          Nuevo vector store
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted">
            Cargando bases de conocimiento...
          </div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Database size={48} className="text-muted mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">
              No hay bases de conocimiento
            </h3>
            <p className="text-secondary mb-4">
              Crea un vector store para almacenar conocimiento para tus asistentes
            </p>
            <Button onClick={handleCreateNew}>
              <Plus size={16} className="mr-1" />
              Crear vector store
            </Button>
          </div>
        ) : (
          <div className="bg-surface rounded-lg border border-subtle">
            <table className="w-full">
              <thead>
                <tr className="border-b border-subtle">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Nombre de vector</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden md:table-cell">Asistente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Última modificación</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Tamaño</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Expira</th>
                  <th className="px-4 py-3 sticky right-0 bg-surface"></th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr
                    key={store.id}
                    className="group border-b border-subtle last:border-b-0 hover:bg-hover cursor-pointer"
                    onClick={() => handleSelectStore(store)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Database size={16} className="text-accent flex-shrink-0 min-w-[16px] min-h-[16px]" />
                          {store.backend === 'openai' && (
                            <span className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-medium" title="Vector Store OpenAI">
                              <OpenAIIcon size={14} className="text-accent" />
                              OpenAI
                            </span>
                          )}
                          <span className="font-medium text-primary truncate">{store.name}</span>
                        </div>

                        <div className="flex items-center gap-1 md:hidden">
                          <button
                            className="p-1 hover:bg-elevated rounded"
                            title="Compartir"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Share2 size={16} className="text-muted" />
                          </button>
                          <button
                            className="p-1 hover:bg-elevated rounded"
                            title="Recargar"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <RotateCcw size={16} className="text-muted" />
                          </button>

                          <DoubleConfirmationDeleteButton
                            onConfirm={() => deleteStoreById(store.id)}
                            size={16}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary hidden md:table-cell">-</td>
                    <td className="px-4 py-3">{getStatusBadge(store.status)}</td>
                    <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                      {formatDate(store.updatedAt)}
                      {store.lastModifiedBy && ` ${store.lastModifiedBy}`}
                    </td>
                    <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                      {formatSize(store.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                      {store.expiresAt ? formatDate(store.expiresAt) : 'Nunca'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell sticky right-0 bg-surface group-hover:bg-hover">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1 hover:bg-elevated rounded"
                          title="Compartir"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Share2 size={16} className="text-muted flex-shrink-0" />
                        </button>
                        <button
                          className="p-1 hover:bg-elevated rounded"
                          title="Recargar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <RotateCcw size={16} className="text-muted flex-shrink-0" />
                        </button>

                        <DoubleConfirmationDeleteButton
                          onConfirm={() => deleteStoreById(store.id)}
                          size={16}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de selección de backend */}
      {showBackendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBackendModal(false)}>
          <div className="bg-surface border border-subtle rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-primary mb-4">Selecciona el tipo de vector store</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleCreateVectorStoreWithBackend('local')}
                className="w-full p-4 bg-hover border border-subtle rounded-lg hover:bg-active transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Database size={24} className="text-accent" />
                  <div>
                    <div className="font-medium text-primary">Vector Store Local</div>
                    <div className="text-sm text-secondary">Almacenado en tu infraestructura FluxCore</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleCreateVectorStoreWithBackend('openai')}
                className="w-full p-4 bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Database size={24} className="text-accent" />
                  <div>
                    <div className="font-medium text-primary flex items-center gap-2">
                      Vector Store OpenAI
                      <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded">Externo</span>
                    </div>
                    <div className="text-sm text-secondary">Sincronizado con la plataforma OpenAI</div>
                  </div>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowBackendModal(false)}
              className="mt-4 w-full px-4 py-2 text-sm text-muted hover:text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VectorStoresView;
