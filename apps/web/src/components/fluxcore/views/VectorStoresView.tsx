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
import { Plus, Database, Share2, RotateCcw, Upload, Pencil } from 'lucide-react';
import { Button, Badge } from '../../ui';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { useAuthStore } from '../../../store/authStore';

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
  status: 'draft' | 'production' | 'expired';
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

  const handleCreateNew = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/fluxcore/vector-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          name: 'Nuevo vector store',
          status: 'draft',
          expirationPolicy: 'never',
        }),
      });

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
    if (onOpenTab && !vectorStoreId) {
      onOpenTab(store.id, store.name, { type: 'vectorStore', vectorStoreId: store.id });
      return;
    }
    setSelectedStore(store);
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
      case 'production':
        return <Badge variant="success">Producción</Badge>;
      case 'expired':
        return <Badge variant="error">Expirado</Badge>;
      default:
        return <Badge variant="info">Borrador</Badge>;
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

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl space-y-4">
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
                    0 KB hours so far this month · $0.1 / GB per day
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
              <div className="space-y-3">
                <div className="text-sm text-muted">
                  {selectedStore.fileCount} archivo(s)
                </div>
                <Button size="sm" variant="secondary">
                  <Upload size={14} className="mr-1" />
                  Agregar archivo
                </Button>
              </div>
            </CollapsibleSection>
          </div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Asistente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Última modificación</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Tamaño</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Expira</th>
                  <th className="px-4 py-3"></th>
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
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-accent" />
                        <span className="font-medium text-primary">{store.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary">-</td>
                    <td className="px-4 py-3">{getStatusBadge(store.status)}</td>
                    <td className="px-4 py-3 text-secondary text-sm">
                      {formatDate(store.updatedAt)}
                      {store.lastModifiedBy && ` ${store.lastModifiedBy}`}
                    </td>
                    <td className="px-4 py-3 text-secondary text-sm">
                      {formatSize(store.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-secondary text-sm">
                      {store.expiresAt ? formatDate(store.expiresAt) : 'Nunca'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button className="p-1 hover:bg-elevated rounded" title="Compartir">
                          <Share2 size={16} className="text-muted" />
                        </button>
                        <button className="p-1 hover:bg-elevated rounded" title="Recargar">
                          <RotateCcw size={16} className="text-muted" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default VectorStoresView;
