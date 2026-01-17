/**
 * OpenAIAssistantConfigView.tsx
 * 
 * Vista de configuración EXCLUSIVA para asistentes OpenAI.
 * Este componente NO comparte lógica con AssistantsView (local).
 * Todo lo que aparece aquí es específico de OpenAI.
 */

import { useState, useEffect } from 'react';
import { 
  Atom, Bot, Save, Trash2, Plus, X, Loader2, 
  Database, ExternalLink, Expand
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { usePanelStore } from '../../../store/panelStore';

// ════════════════════════════════════════════════════════════════════════════
// Types - Específicos de OpenAI
// ════════════════════════════════════════════════════════════════════════════

// Límites oficiales de OpenAI según documentación
const MAX_DESCRIPTION_LENGTH = 512;      // description del asistente
const MAX_INSTRUCTIONS_LENGTH = 256000;  // instructions del sistema

interface OpenAIAssistant {
  id: string;
  name: string;
  description: string | null;
  externalId: string | null; // ID en OpenAI
  modelConfig: {
    provider: string;
    model: string;
    temperature?: number;
    topP?: number;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface OpenAIVectorStore {
  id: string;
  name: string;
  externalId: string | null;
  fileCount: number;
  status: string;
}

interface OpenAIAssistantConfigViewProps {
  assistantId: string;
  accountId: string;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════════

export function OpenAIAssistantConfigView({
  assistantId,
  accountId,
  onClose,
  onSave,
  onDelete,
}: OpenAIAssistantConfigViewProps) {
  const { token } = useAuthStore();
  const { openTab, focusContainer, activateTab, updateTabContext } = usePanelStore();
  const layout = usePanelStore((state) => state.layout);
  const apiBase = `/api/fluxcore`;
  
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
  const [saving, setSaving] = useState(false);
  const [assistant, setAssistant] = useState<OpenAIAssistant | null>(null);
  const [vectorStores, setVectorStores] = useState<OpenAIVectorStore[]>([]);
  const [selectedVectorStoreIds, setSelectedVectorStoreIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');      // 512 chars max
  const [instructions, setInstructions] = useState('');    // 256K chars max
  const [model, setModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1);
  const [responseFormat, setResponseFormat] = useState<'text' | 'json'>('text');
  const [instructionsLocked, setInstructionsLocked] = useState(false);
  const [instructionsEditorLocation, setInstructionsEditorLocation] = useState<{ containerId: string; tabId: string } | null>(null);
  const instructionsEditorTabId = `openai-instructions-editor-${assistantId}`;

  // OpenAI Models disponibles
  const OPENAI_MODELS = [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Load data
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadAssistant();
    loadOpenAIVectorStores();
  }, [assistantId]);

  const loadAssistant = async () => {
    try {
      setLoading(true);
      const response = await request(`/assistants/${assistantId}?accountId=${accountId}`);
      if (response.success && response.data) {
        const data = response.data;
        setAssistant(data);
        setName(data.name);
        setDescription(data.description?.slice(0, MAX_DESCRIPTION_LENGTH) || '');
        // Instructions se carga desde el asistente (puede venir de OpenAI)
        setInstructions(data.instructions?.slice(0, MAX_INSTRUCTIONS_LENGTH) || '');
        setModel(data.modelConfig?.model || 'gpt-4o');
        setTemperature(data.modelConfig?.temperature || 0.7);
        setSelectedVectorStoreIds(data.vectorStoreIds || []);
        setTopP(typeof data.modelConfig?.topP === 'number' ? data.modelConfig.topP : 1);
        setResponseFormat((data.modelConfig?.responseFormat as 'text' | 'json') || 'text');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

    useEffect(() => {
    let foundLocation: { containerId: string; tabId: string } | null = null;
    for (const container of layout.containers) {
      const tab = container.tabs.find((t) => t.context?.editorKey === instructionsEditorTabId);
      if (tab) {
        foundLocation = { containerId: container.id, tabId: tab.id };
        break;
      }
    }

    setInstructionsLocked(Boolean(foundLocation));

    if (!foundLocation) {
      if (instructionsEditorLocation !== null) {
        setInstructionsEditorLocation(null);
      }
      return;
    }

    if (
      !instructionsEditorLocation ||
      instructionsEditorLocation.containerId !== foundLocation.containerId ||
      instructionsEditorLocation.tabId !== foundLocation.tabId
    ) {
      setInstructionsEditorLocation(foundLocation);
    }
  }, [layout, instructionsEditorLocation, instructionsEditorTabId]);

  useEffect(() => {
    if (!instructionsEditorLocation) return;

    const container = layout.containers.find((c) => c.id === instructionsEditorLocation.containerId);
    const tab = container?.tabs.find((t) => t.id === instructionsEditorLocation.tabId);
    const currentContent = typeof tab?.context?.content === 'string' ? tab.context.content : '';

    if (currentContent === instructions) return;

    updateTabContext(instructionsEditorLocation.containerId, instructionsEditorLocation.tabId, {
      content: instructions,
    });
  }, [instructions, instructionsEditorLocation, layout, updateTabContext]);

  const focusInstructionsEditorTab = () => {
    if (instructionsEditorLocation) {
      focusContainer(instructionsEditorLocation.containerId);
      activateTab(instructionsEditorLocation.containerId, instructionsEditorLocation.tabId);
      return;
    }

    // Buscar tab existente con el ID estable por si la sesión recargó la vista
    const { layout } = usePanelStore.getState();
    for (const container of layout.containers) {
      const tab = container.tabs.find((t) => t.context?.editorKey === instructionsEditorTabId);
      if (tab) {
        focusContainer(container.id);
        activateTab(container.id, tab.id);
        setInstructionsEditorLocation({ containerId: container.id, tabId: tab.id });
        return;
      }
    }
  };

  const openInstructionsEditor = () => {
    const result = openTab('editor', {
      type: 'openai-assistant-editor',
      title: `Instrucciones · ${name || 'Asistente'}`,
      icon: 'Bot',
      closable: true,
      context: {
        assistantId,
        assistantName: name || 'Asistente',
        externalId: assistant?.externalId || '',
        accountId,
        content: instructions,
        maxLength: MAX_INSTRUCTIONS_LENGTH,
        placeholder: 'Escribe instrucciones detalladas para el asistente...',
        editorKey: instructionsEditorTabId,
        onChange: (content: string) => {
          setInstructions(content.slice(0, MAX_INSTRUCTIONS_LENGTH));
        },
        onSave: async (content: string) => {
          setInstructions(content.slice(0, MAX_INSTRUCTIONS_LENGTH));
          // Auto-save: guardar en backend y sincronizar con OpenAI
          try {
            await request(`/assistants/${assistantId}`, {
              method: 'PUT',
              body: JSON.stringify({
                accountId,
                instructions: content.slice(0, MAX_INSTRUCTIONS_LENGTH),
              }),
            });
          } catch (err: any) {
            console.error('[OpenAIAssistantConfigView] Error auto-saving instructions:', err);
            throw err;
          }
        },
        onClose: () => {
          setInstructionsLocked(false);
          setInstructionsEditorLocation(null);
        },
      },
    });

    if (result.containerId && result.tabId) {
      setInstructionsLocked(true);
      updateTabContext(result.containerId, result.tabId, { editorKey: instructionsEditorTabId });
      setInstructionsEditorLocation({ containerId: result.containerId, tabId: result.tabId });
    }
  };

  const loadOpenAIVectorStores = async () => {
    try {
      // Solo cargar vector stores con backend='openai'
      const response = await request(`/vector-stores?accountId=${accountId}&backend=openai`);
      if (response.success && response.data) {
        setVectorStores(response.data);
      }
    } catch (err: any) {
      console.error('Error loading OpenAI vector stores:', err);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Actions
  // ──────────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const sanitizedDescription = description.slice(0, MAX_DESCRIPTION_LENGTH);

      await request(`/assistants/${assistantId}`, {
        method: 'PUT',
        body: JSON.stringify({
          accountId,
          name,
          description: sanitizedDescription,
          instructions: instructions.slice(0, MAX_INSTRUCTIONS_LENGTH), // 256K chars
          modelConfig: {
            provider: 'openai',
            model,
            temperature,
            topP,
            responseFormat,
          },
          vectorStoreIds: selectedVectorStoreIds,
        }),
      });

      onSave?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este asistente? Esta acción también lo eliminará de OpenAI.')) return;
    
    try {
      await request(`/assistants/${assistantId}?accountId=${accountId}`, {
        method: 'DELETE',
      });
      onDelete?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateVectorStore = async () => {
    const storeName = prompt('Nombre del Vector Store en OpenAI:');
    if (!storeName) return;

    try {
      const response = await request('/vector-stores', {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          name: storeName,
          backend: 'openai',
        }),
      });

      if (response.success && response.data) {
        await loadOpenAIVectorStores();
        // Auto-seleccionar el nuevo vector store
        setSelectedVectorStoreIds([...selectedVectorStoreIds, response.data.id]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleVectorStore = (vsId: string) => {
    if (selectedVectorStoreIds.includes(vsId)) {
      setSelectedVectorStoreIds(selectedVectorStoreIds.filter(id => id !== vsId));
    } else {
      setSelectedVectorStoreIds([...selectedVectorStoreIds, vsId]);
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
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-elevated">
            <Atom className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary">Asistente OpenAI</h2>
            <p className="text-xs text-muted">
              {assistant?.externalId ? `ID: ${assistant.externalId}` : 'Configuración'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-elevated rounded-lg text-muted hover:text-primary"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Información básica */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-secondary flex items-center gap-2">
            <Bot size={16} />
            Información del Asistente
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-elevated border border-subtle rounded-lg text-primary text-sm focus:outline-none focus:border-accent"
                placeholder="Nombre del asistente"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 text-xs text-muted">
                <label>Descripción breve</label>
                <span>{description.length}/{MAX_DESCRIPTION_LENGTH}</span>
              </div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                className="w-full px-3 py-2 bg-elevated border border-subtle rounded-lg text-primary text-sm focus:outline-none focus:border-accent"
                placeholder="Descripción corta del asistente"
              />
              <p className="text-xs text-muted mt-1">
                Visible en la lista de asistentes (máx. 512 caracteres).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 text-xs text-muted">
                <label className="flex items-center gap-2">Instrucciones del sistema
                  <button
                    type="button"
                    onClick={openInstructionsEditor}
                    className="text-secondary hover:text-primary transition-colors"
                    title="Editar en editor expandido"
                  >
                    <Expand size={14} />
                  </button>
                </label>
                <span>{instructions.length.toLocaleString()}/{MAX_INSTRUCTIONS_LENGTH.toLocaleString()}</span>
              </div>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value.slice(0, MAX_INSTRUCTIONS_LENGTH))}
                rows={8}
                readOnly={instructionsLocked}
                onClick={(e) => {
                  if (instructionsLocked) {
                    e.preventDefault();
                    e.stopPropagation();
                    focusInstructionsEditorTab();
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-y transition-colors ${instructionsLocked ? 'bg-elevated/60 border-dashed border-subtle text-muted cursor-pointer' : 'bg-elevated border-subtle text-primary focus:border-accent'}`}
                placeholder="Instrucciones detalladas para el asistente (system prompt)..."
              />
              <p className="text-xs text-muted mt-1">
                Estas son las instrucciones del sistema enviadas a OpenAI (máx. 256,000 caracteres).
              </p>
              {instructionsLocked && (
                <div className="text-xs text-warning mt-1 flex items-center gap-2">
                  <span>Editor expandido activo.</span>
                  <button
                    type="button"
                    onClick={focusInstructionsEditorTab}
                    className="text-warning underline hover:text-warning/80 transition-colors"
                  >
                    Ir al editor
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Modelo */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-secondary">Modelo OpenAI</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">Modelo</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-elevated border border-subtle rounded-lg text-primary text-sm focus:outline-none focus:border-accent"
              >
                {OPENAI_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">
                Temperatura: {temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </section>

        {/* Vector Stores OpenAI */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-secondary flex items-center gap-2">
              <Database size={16} />
              Vector Stores (OpenAI)
            </h3>
            <button
              onClick={handleCreateVectorStore}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20"
            >
              <Plus size={14} />
              Crear en OpenAI
            </button>
          </div>

          {vectorStores.length === 0 ? (
            <div className="p-4 bg-elevated rounded-lg text-center">
              <Database className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">No hay Vector Stores en OpenAI</p>
              <p className="text-xs text-muted mt-1">
                Crea uno para habilitar búsqueda de conocimiento
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {vectorStores.map((vs) => (
                <div
                  key={vs.id}
                  onClick={() => toggleVectorStore(vs.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedVectorStoreIds.includes(vs.id)
                      ? 'border-accent bg-accent/10'
                      : 'border-subtle bg-elevated hover:border-default'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-muted" />
                      <span className="text-sm text-primary">{vs.name}</span>
                      {vs.externalId && (
                        <span className="text-xs text-muted">
                          ({vs.externalId.slice(0, 12)}...)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{vs.fileCount} archivos</span>
                      {selectedVectorStoreIds.includes(vs.id) && (
                        <div className="w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Link a OpenAI Dashboard */}
        {assistant?.externalId && (
          <section className="pt-4 border-t border-subtle">
            <a
              href={`https://platform.openai.com/assistants/${assistant.externalId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <ExternalLink size={14} />
              Ver en OpenAI Dashboard
            </a>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-subtle flex items-center justify-between">
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
        >
          <Trash2 size={16} />
          Eliminar
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar en OpenAI
        </button>
      </div>
    </div>
  );
}
