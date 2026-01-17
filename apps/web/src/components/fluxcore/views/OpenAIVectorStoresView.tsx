/**
 * OpenAIVectorStoresView.tsx
 * 
 * Vista de Vector Stores EXCLUSIVA para OpenAI.
 * Este componente NO comparte lógica con VectorStoresView (local).
 * Todo lo que aparece aquí es específico de OpenAI.
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Atom, Database, Plus, Trash2, Upload, FileText,
  Loader2, RefreshCw, ExternalLink, File, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

// ════════════════════════════════════════════════════════════════════════════
// Types - Específicos de OpenAI
// ════════════════════════════════════════════════════════════════════════════

interface OpenAIVectorStore {
  id: string;
  name: string;
  description: string | null;
  externalId: string | null;
  fileCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface OpenAIFile {
  id: string;
  name: string;
  sizeBytes: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  externalId: string | null;
  createdAt: string;
}

interface OpenAIVectorStoresViewProps {
  accountId: string;
  vectorStoreId?: string; // Para auto-seleccionar un vector store específico
}

// ════════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════════

export function OpenAIVectorStoresView({ accountId, vectorStoreId }: OpenAIVectorStoresViewProps) {
  const { token } = useAuthStore();
  const apiBase = '/api/fluxcore';

  // Helper para requests
  const request = async (path: string, options: RequestInit = {}) => {
    if (!token) throw new Error('Falta token de autenticación');
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };

    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error || `Error ${response.status}`);
    }
    return data;
  };
  
  // State
  const [loading, setLoading] = useState(true);
  const [vectorStores, setVectorStores] = useState<OpenAIVectorStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<OpenAIVectorStore | null>(null);
  const [files, setFiles] = useState<OpenAIFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Load data
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadVectorStores();
  }, [accountId]);

  // Auto-seleccionar vector store si se pasa el prop
  useEffect(() => {
    if (vectorStoreId && vectorStores.length > 0 && !selectedStore) {
      const found = vectorStores.find(vs => vs.id === vectorStoreId);
      if (found) setSelectedStore(found);
    }
  }, [vectorStoreId, vectorStores, selectedStore]);

  useEffect(() => {
    if (selectedStore) {
      loadFiles(selectedStore.id);
    }
  }, [selectedStore?.id]);

  const loadVectorStores = async () => {
    try {
      setLoading(true);
      // Solo cargar vector stores con backend='openai'
      const response = await request(`/vector-stores?accountId=${accountId}&backend=openai`);
      if (response.success && response.data) {
        setVectorStores(response.data);
        // Si hay uno seleccionado, actualizar sus datos
        if (selectedStore) {
          const updated = response.data.find((vs: OpenAIVectorStore) => vs.id === selectedStore.id);
          if (updated) setSelectedStore(updated);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (vsId: string) => {
    try {
      setFilesLoading(true);
      const response = await request(`/vector-stores/${vsId}/files?accountId=${accountId}`);
      if (response.success && response.data) {
        setFiles(response.data);
      }
    } catch (err: any) {
      console.error('Error loading files:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Actions
  // ──────────────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const name = prompt('Nombre del Vector Store en OpenAI:');
    if (!name) return;

    try {
      const response = await request('/vector-stores', {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          name,
          backend: 'openai', // SIEMPRE OpenAI - este componente no conoce "local"
        }),
      });

      if (response.success && response.data) {
        await loadVectorStores();
        setSelectedStore(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (vsId: string) => {
    if (!confirm('¿Eliminar este Vector Store? Los archivos también se eliminarán de OpenAI.')) return;

    try {
      await request(`/vector-stores/${vsId}?accountId=${accountId}`, { method: 'DELETE' });
      if (selectedStore?.id === vsId) {
        setSelectedStore(null);
        setFiles([]);
      }
      await loadVectorStores();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStore) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('accountId', accountId);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/fluxcore/vector-stores/${selectedStore.id}/files/upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Error uploading file');
      }

      await loadFiles(selectedStore.id);
      await loadVectorStores();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!selectedStore) return;
    if (!confirm('¿Eliminar este archivo de OpenAI?')) return;

    try {
      await request(
        `/vector-stores/${selectedStore.id}/files/${fileId}?accountId=${accountId}`,
        { method: 'DELETE' }
      );
      await loadFiles(selectedStore.id);
      await loadVectorStores();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const refreshFileStatus = async () => {
    if (selectedStore) {
      await loadFiles(selectedStore.id);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} className="text-green-400" />;
      case 'processing':
        return <Clock size={14} className="text-yellow-400 animate-pulse" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-400" />;
      default:
        return <Clock size={14} className="text-muted" />;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Lista de Vector Stores */}
      <div className="w-80 border-r border-subtle flex flex-col">
        <div className="p-4 border-b border-subtle">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Atom className="w-5 h-5 text-accent" />
              <h2 className="font-semibold text-primary">Vector Stores</h2>
            </div>
            <button
              onClick={handleCreate}
              className="p-1.5 hover:bg-elevated rounded-lg text-muted hover:text-primary"
              title="Crear Vector Store en OpenAI"
            >
              <Plus size={18} />
            </button>
          </div>
          <p className="text-xs text-muted">Almacenamiento de conocimiento en OpenAI</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {vectorStores.length === 0 ? (
            <div className="p-6 text-center">
              <Database className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted mb-2">Sin Vector Stores</p>
              <button
                onClick={handleCreate}
                className="text-sm text-accent hover:underline"
              >
                Crear uno en OpenAI
              </button>
            </div>
          ) : (
            vectorStores.map((vs) => (
              <div
                key={vs.id}
                onClick={() => setSelectedStore(vs)}
                className={`p-3 border-b border-subtle cursor-pointer transition-colors ${
                  selectedStore?.id === vs.id
                    ? 'bg-elevated border-l-2 border-l-accent'
                    : 'hover:bg-elevated/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-muted" />
                    <span className="text-sm text-primary font-medium">{vs.name}</span>
                  </div>
                  <Atom className="w-4 h-4 text-accent" />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                  <span>{vs.fileCount} archivos</span>
                  {vs.externalId && (
                    <span className="truncate max-w-[100px]" title={vs.externalId}>
                      {vs.externalId.slice(0, 10)}...
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detalle del Vector Store seleccionado */}
      <div className="flex-1 flex flex-col">
        {!selectedStore ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Database className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted">Selecciona un Vector Store</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary">{selectedStore.name}</h3>
                  <p className="text-xs text-muted">
                    {selectedStore.externalId ? (
                      <a
                        href={`https://platform.openai.com/storage/vector_stores/${selectedStore.externalId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-accent"
                      >
                        <ExternalLink size={10} />
                        {selectedStore.externalId}
                      </a>
                    ) : (
                      'Sincronizando con OpenAI...'
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(selectedStore.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Archivos */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-secondary flex items-center gap-2">
                  <FileText size={16} />
                  Archivos ({files.length})
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshFileStatus}
                    className="p-1.5 hover:bg-elevated rounded text-muted hover:text-primary"
                    title="Refrescar estado"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.md,.pdf,.docx,.csv,.json"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Subir a OpenAI
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {filesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8">
                  <File className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted">Sin archivos</p>
                  <p className="text-xs text-muted mt-1">
                    Sube archivos para que OpenAI los procese
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-elevated rounded-lg group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-muted" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-primary">{file.name}</span>
                            {getStatusIcon(file.status)}
                          </div>
                          <div className="text-xs text-muted flex items-center gap-2">
                            <span>{formatSize(file.sizeBytes)}</span>
                            {file.externalId && (
                              <span className="truncate max-w-[150px]" title={file.externalId}>
                                {file.externalId.slice(0, 15)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded text-red-400"
                        title="Eliminar de OpenAI"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
