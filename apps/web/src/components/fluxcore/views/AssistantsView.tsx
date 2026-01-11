/**
 * Assistants View - Plataforma de Composición de Asistentes IA
 * 
 * Los asistentes son COMPOSICIONES DECLARATIVAS que referencian:
 * - Instructions (sistema de instrucciones)
 * - Vector Stores (base de conocimiento)
 * - Tools (herramientas/capacidades)
 * 
 * Arquitectura: Los activos existen en bibliotecas centrales.
 * El asistente REFERENCIA estos activos, no los contiene.
 */

import { useState, useEffect, useRef } from 'react';
import { Plus, Bot, Share2, Download, RotateCcw, ChevronDown, Copy, X, SquareChevronRight, Pencil } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Button, Badge, Checkbox } from '../../ui';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { SliderInput } from '../../ui/SliderInput';

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini'],
  groq: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
};

interface Assistant {
  id: string;
  name: string;
  description?: string;
  instructionIds?: string[];
  vectorStoreIds?: string[];
  toolIds?: string[];
  status: 'draft' | 'production' | 'disabled';
  modelConfig: {
    provider: string;
    model: string;
    temperature: number;
    topP: number;
    responseFormat: string;
  };
  timingConfig: {
    responseDelaySeconds: number;
    smartDelay: boolean;
  };
  updatedAt: string;
  lastModifiedBy?: string;
  sizeBytes: number;
  tokensUsed: number;
}

interface Instruction {
  id: string;
  name: string;
}

interface VectorStore {
  id: string;
  name: string;
}

interface Tool {
  id: string;
  name: string;
  type: string;
}

interface AssistantsViewProps {
  accountId: string;
  onOpenTab?: (tabId: string, title: string, data: any) => void;
  assistantId?: string;
}

export function AssistantsView({ accountId, onOpenTab, assistantId }: AssistantsViewProps) {
  const { token } = useAuthStore();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [vectorStores, setVectorStores] = useState<VectorStore[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [enabledSections, setEnabledSections] = useState({
    initial: true,
    provider: true,
    timing: true,
    model: false
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const autoSelectedAssistantIdRef = useRef<string | null>(null);

  const buildAssistantPayload = (assistant: Assistant) => ({
    accountId,
    name: assistant.name,
    description: assistant.description ?? undefined,
    status: assistant.status,
    instructionIds: assistant.instructionIds?.slice(0, 1) ?? undefined,
    vectorStoreIds: assistant.vectorStoreIds ?? undefined,
    toolIds: assistant.toolIds ?? undefined,
    modelConfig: assistant.modelConfig,
    timingConfig: assistant.timingConfig,
  });

  const saveAssistant = async (assistant: Assistant) => {
    if (!token) return;
    if (!assistant.id) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/fluxcore/assistants/${assistant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(buildAssistantPayload(assistant)),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Error saving assistant:', text);
        setSaveError('Error al guardar cambios');
      }
    } catch (e) {
      console.error('Error saving assistant', e);
      setSaveError('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateInstruction = async () => {
    if (!token) return;
    if (!selectedAssistant) return;

    try {
      const res = await fetch('/api/fluxcore/instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          name: 'Nuevas instrucciones',
          content: '',
          status: 'draft',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Error creating instruction:', text);
        return;
      }

      const created = await res.json();
      if (created.success && created.data) {
        await loadData();
        updateAssistantState({ instructionIds: [created.data.id] }, { immediate: true });
        onOpenTab?.(created.data.id, created.data.name, {
          type: 'instruction',
          instructionId: created.data.id,
        });
      }
    } catch (e) {
      console.error('Error creating instruction', e);
    }
  };

  const handleCreateVectorStore = async () => {
    if (!token) return;
    if (!selectedAssistant) return;

    try {
      const res = await fetch('/api/fluxcore/vector-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          name: 'Nuevo vector store',
          status: 'draft',
          expirationPolicy: 'never',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Error creating vector store:', text);
        return;
      }

      const created = await res.json();
      if (created.success && created.data) {
        await loadData();
        updateAssistantState(
          { vectorStoreIds: [...(selectedAssistant.vectorStoreIds || []), created.data.id] },
          { immediate: true }
        );
        onOpenTab?.(created.data.id, created.data.name, {
          type: 'vectorStore',
          vectorStoreId: created.data.id,
        });
      }
    } catch (e) {
      console.error('Error creating vector store', e);
    }
  };

  const scheduleSave = (assistant: Assistant, immediate = false) => {
    if (!assistant.id) return;
    if (!token) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (immediate) {
      void saveAssistant(assistant);
      return;
    }

    saveTimeoutRef.current = setTimeout(() => {
      void saveAssistant(assistant);
    }, 500);
  };

  const updateAssistantState = (updates: Partial<Assistant>, opts?: { immediate?: boolean }) => {
    if (!selectedAssistant) return;
    const next = { ...selectedAssistant, ...updates };
    setSelectedAssistant(next);
    scheduleSave(next, !!opts?.immediate);
  };

  useEffect(() => {
    if (accountId && token) {
      loadData();
    }
  }, [accountId, token]);

  const loadData = async () => {
    if (!accountId || !token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [assistantsRes, instructionsRes, vectorStoresRes, connectionsRes, definitionsRes] = await Promise.all([
        fetch(`/api/fluxcore/assistants?accountId=${accountId}`, { headers }),
        fetch(`/api/fluxcore/instructions?accountId=${accountId}`, { headers }),
        fetch(`/api/fluxcore/vector-stores?accountId=${accountId}`, { headers }),
        fetch(`/api/fluxcore/tools/connections?accountId=${accountId}`, { headers }),
        fetch(`/api/fluxcore/tools/definitions`, { headers }),
      ]);
      
      const [assistantsData, instructionsData, vectorStoresData, connectionsData, definitionsData] = await Promise.all([
        assistantsRes.json(),
        instructionsRes.json(),
        vectorStoresRes.json(),
        connectionsRes.json(),
        definitionsRes.json(),
      ]);

      if (assistantsData.success) setAssistants(assistantsData.data || []);
      if (instructionsData.success) setInstructions(instructionsData.data || []);
      if (vectorStoresData.success) setVectorStores(vectorStoresData.data || []);
      
      if (connectionsData.success && definitionsData.success) {
        // Map connections to include names from definitions
        const definitions = definitionsData.data || [];
        const joinedTools = (connectionsData.data || []).map((conn: any) => {
          const def = definitions.find((d: any) => d.id === conn.toolDefinitionId);
          return {
            id: conn.id,
            name: def?.name || 'Herramienta desconocida',
            type: def?.type || 'unknown',
          };
        });
        setTools(joinedTools);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setSaveError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };


  const formatSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'production':
        return <Badge variant="success">Producción</Badge>;
      case 'disabled':
        return <Badge variant="warning">Desactivado</Badge>;
      default:
        return <Badge variant="warning">Borrador</Badge>;
    }
  };

  const handleCreateNew = async () => {
    if (!token) return;
    const newAssistantData = {
      accountId,
      name: 'Nuevo asistente',
      status: 'draft',
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        topP: 1.0,
        responseFormat: 'text',
      },
      timingConfig: {
        responseDelaySeconds: 2,
        smartDelay: true,
      },
    };

    try {
      const res = await fetch(`/api/fluxcore/assistants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newAssistantData),
      });
      
      if (res.ok) {
        const created = await res.json();
        if (created.success && created.data) {
          await loadData();
          if (onOpenTab) {
            onOpenTab(created.data.id, created.data.name, {
              type: 'assistant',
              assistantId: created.data.id,
            });
          } else {
            handleSelectAssistant(created.data);
          }
        }
      }
    } catch (e) {
      console.error('Error creating assistant', e);
    }
  };

  const handleNameSave = (newName: string) => {
    if (!selectedAssistant) return;
    if (!token) return;
    updateAssistantState({ name: newName }, { immediate: true });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Toast notification
  };

  const handleSelectAssistant = async (summary: Assistant) => {
    // Cargar composición completa desde el runtime API
    try {
      const res = await fetch(`/api/fluxcore/runtime/composition/${summary.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const composition = await res.json();
        // Mapear la composición al formato de edición
        const fullAssistant: Assistant = {
          ...summary,
          description: (summary as any).description ?? undefined,
          instructionIds: composition.instructions.slice(0, 1).map((i: any) => i.id),
          vectorStoreIds: composition.vectorStores.map((v: any) => v.id),
          toolIds: composition.tools.map((t: any) => t.connectionId ?? t.id),
        };
        setSelectedAssistant(fullAssistant);
        return;
      }
    } catch (e) {
      console.error('Error loading assistant composition', e);
    }
    
    // Fallback si falla la carga de composición
    setSelectedAssistant({
      ...summary,
      description: (summary as any).description ?? undefined,
    });
  };

  useEffect(() => {
    if (!assistantId) return;
    if (!token) return;
    if (selectedAssistant?.id === assistantId) return;
    if (autoSelectedAssistantIdRef.current === assistantId) return;

    const summary = assistants.find((a) => a.id === assistantId);
    if (!summary) return;

    autoSelectedAssistantIdRef.current = assistantId;
    void handleSelectAssistant(summary);
  }, [assistantId, assistants, selectedAssistant?.id, token]);

  useEffect(() => {
    if (!onOpenTab) return;
    if (assistantId) return;
    if (!selectedAssistant) return;
    setSelectedAssistant(null);
  }, [assistantId, onOpenTab, selectedAssistant]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  // Vista de configuración de asistente (composición de activos)
  if (selectedAssistant) {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-subtle">
          <div className="text-xs text-muted mb-1">Configuración de asistente</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded border border-transparent bg-transparent hover:border-[var(--text-primary)] focus-within:border-[var(--text-primary)] transition-colors">
            <button
              type="button"
              onClick={() => nameInputRef.current?.focus()}
              className="p-1 text-muted hover:text-primary transition-colors flex-shrink-0"
              aria-label="Editar nombre del asistente"
            >
              <Pencil size={16} />
            </button>
            <input 
              ref={nameInputRef}
              type="text"
              className="text-xl font-semibold text-primary bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
              value={selectedAssistant.name}
              onChange={(e) => setSelectedAssistant({ ...selectedAssistant, name: e.target.value })}
              onBlur={(e) => handleNameSave(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Nombre del asistente"
              aria-label="Nombre del asistente"
            />
          </div>
          {selectedAssistant.id && (
            <div 
              className="text-xs text-muted mt-1 cursor-pointer hover:text-accent flex items-center gap-1 group"
              onClick={() => copyToClipboard(selectedAssistant.id)}
              title="Click para copiar ID"
            >
              Id: {selectedAssistant.id}
              <span className="opacity-0 group-hover:opacity-100"><Copy size={12} /></span>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-6 space-y-6">
          {/* Configuración inicial - Referencias a otros activos */}
          <CollapsibleSection 
            title="Configuración inicial" 
            defaultExpanded={true} 
            showToggle={true}
            isCustomized={enabledSections.initial}
            onToggleCustomized={(enabled) => setEnabledSections(prev => ({ ...prev, initial: enabled }))}
          >
            <div className={`space-y-6 ${!enabledSections.initial ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              {/* Sistema de instrucciones (referencia a biblioteca) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-muted">Sistema de instrucciones</label>
                  <Button variant="secondary" size="sm" onClick={handleCreateInstruction}>
                    <Plus size={16} className="mr-1" />
                    Crear
                  </Button>
                </div>

                {(() => {
                  const currentId = selectedAssistant.instructionIds?.[0];
                  const current = currentId ? instructions.find((i) => i.id === currentId) : null;
                  const selectable = instructions.filter((i) => i.id !== currentId);

                  return (
                    <>
                      {currentId && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="info" className="flex items-center gap-1">
                            {current?.name || currentId}
                            <button
                              className="ml-1 hover:text-red-400"
                              onClick={() => updateAssistantState({ instructionIds: [] }, { immediate: true })}
                              aria-label="Quitar instrucción"
                            >
                              <X size={12} />
                            </button>
                          </Badge>
                        </div>
                      )}

                      {!currentId && selectable.length > 0 && (
                        <div className="relative">
                          <select
                            className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8"
                            value=""
                            onChange={(e) => {
                              const id = e.target.value;
                              if (!id) return;
                              updateAssistantState({ instructionIds: [id] }, { immediate: true });
                            }}
                          >
                            <option value="">Seleccionar instrucción...</option>
                            {selectable.map((inst) => (
                              <option key={inst.id} value={inst.id}>
                                {inst.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Base de conocimiento (referencia a vector store) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-muted">Base de conocimiento</label>
                  <Button variant="secondary" size="sm" onClick={handleCreateVectorStore}>
                    <Plus size={16} className="mr-1" />
                    Crear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(selectedAssistant.vectorStoreIds || []).map((id) => {
                    const vs = vectorStores.find(v => v.id === id);
                    return (
                      <Badge key={id} variant="info" className="flex items-center gap-1">
                        {vs?.name || id}
                        <button 
                          className="ml-1 hover:text-red-400"
                          onClick={() => updateAssistantState({
                            vectorStoreIds: selectedAssistant.vectorStoreIds?.filter(vid => vid !== id)
                          }, { immediate: true })}
                        ><X size={12} /></button>
                      </Badge>
                    );
                  })}
                </div>
                <div className="relative">
                  {(() => {
                    const used = new Set(selectedAssistant.vectorStoreIds || []);
                    const selectable = vectorStores.filter((vs) => !used.has(vs.id));
                    return (
                      <select
                        className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8"
                        value=""
                        onChange={(e) => {
                          const id = e.target.value;
                          if (id && !selectedAssistant.vectorStoreIds?.includes(id)) {
                            updateAssistantState({
                              vectorStoreIds: [...(selectedAssistant.vectorStoreIds || []), id]
                            }, { immediate: true });
                          }
                        }}
                        disabled={selectable.length === 0}
                      >
                        <option value="">{selectable.length === 0 ? 'No hay más bases disponibles' : 'Agregar base de conocimiento...'}</option>
                        {selectable.map((vs) => (
                          <option key={vs.id} value={vs.id}>
                            {vs.name}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>

              {/* Herramientas (referencias a biblioteca de tools) */}
              <div>
                <label className="block text-sm text-muted mb-1">Herramientas</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(selectedAssistant.toolIds || []).map((toolId) => {
                    const tool = tools.find(t => t.id === toolId);
                    return tool ? (
                      <Badge key={toolId} variant="info" className="flex items-center gap-1">
                        {tool.name}
                        <button 
                          className="ml-1 hover:text-red-400"
                          onClick={() => updateAssistantState({
                            toolIds: selectedAssistant.toolIds?.filter(id => id !== toolId)
                          }, { immediate: true })}
                        ><X size={12} /></button>
                      </Badge>
                    ) : null;
                  })}
                </div>
                <div className="relative">
                  {(() => {
                    const used = new Set(selectedAssistant.toolIds || []);
                    const selectable = tools.filter((t) => !used.has(t.id));
                    return (
                      <select
                        className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8"
                        value=""
                        onChange={(e) => {
                          const id = e.target.value;
                          if (id && !selectedAssistant.toolIds?.includes(id)) {
                            updateAssistantState({
                              toolIds: [...(selectedAssistant.toolIds || []), id]
                            }, { immediate: true });
                          }
                        }}
                        disabled={selectable.length === 0}
                      >
                        <option value="">{selectable.length === 0 ? 'No hay más herramientas disponibles' : 'Agregar herramienta...'}</option>
                        {selectable.map((tool) => (
                          <option key={tool.id} value={tool.id}>
                            {tool.name}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Proveedor IA */}
          <CollapsibleSection 
            title="Proveedor IA" 
            defaultExpanded={true} 
            showToggle={true}
            isCustomized={enabledSections.provider}
            onToggleCustomized={(enabled) => setEnabledSections(prev => ({ ...prev, provider: enabled }))}
          >
            <div className={`space-y-4 ${!enabledSections.provider ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              <div>
                <label className="block text-sm text-muted mb-1">Empresa proveedora</label>
                <div className="relative">
                  <select
                    className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8"
                    value={selectedAssistant.modelConfig.provider}
                    onChange={(e) => {
                      const nextProvider = e.target.value;
                      const allowedModels = PROVIDER_MODELS[nextProvider] || [];
                      const currentModel = selectedAssistant.modelConfig.model;
                      const nextModel = allowedModels.includes(currentModel)
                        ? currentModel
                        : (allowedModels[0] || currentModel);

                      updateAssistantState({
                        modelConfig: { ...selectedAssistant.modelConfig, provider: nextProvider, model: nextModel }
                      }, { immediate: true });
                    }}
                  >
                    <option value="openai">Open IA</option>
                    <option value="groq">Groq</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Modelo disponible</label>
                <div className="relative">
                  {(() => {
                    const allowed = PROVIDER_MODELS[selectedAssistant.modelConfig.provider] || [];
                    const options = allowed.length > 0 ? allowed : [selectedAssistant.modelConfig.model].filter(Boolean);
                    return (
                      <select
                        className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8"
                        value={selectedAssistant.modelConfig.model}
                        onChange={(e) => updateAssistantState({
                          modelConfig: { ...selectedAssistant.modelConfig, model: e.target.value }
                        }, { immediate: true })}
                      >
                        {options.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    );
                  })()}
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Tiempo de espera de respuesta */}
          <CollapsibleSection 
            title="Tiempo de espera de respuesta" 
            defaultExpanded={true} 
            showToggle={true}
            isCustomized={enabledSections.timing}
            onToggleCustomized={(enabled) => setEnabledSections(prev => ({ ...prev, timing: enabled }))}
          >
            <div className={`space-y-4 ${!enabledSections.timing ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              <div>
                <label className="block text-sm text-muted mb-1">Segundos de espera</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    className="w-24 bg-input border border-subtle rounded px-3 py-2 text-primary disabled:opacity-50"
                    value={selectedAssistant.timingConfig.responseDelaySeconds}
                    disabled={selectedAssistant.timingConfig.smartDelay}
                    onChange={(e) => updateAssistantState({
                      timingConfig: { ...selectedAssistant.timingConfig, responseDelaySeconds: parseInt(e.target.value) || 0 }
                    })}
                  />
                  <span className="text-muted text-sm">
                    {selectedAssistant.timingConfig.smartDelay 
                      ? 'Desactivado por Smart Delay' 
                      : 'Tiempo de espera antes de responder automáticamente'}
                  </span>
                </div>
              </div>

              <Checkbox
                label="Smart delay"
                description="Permite que el delay se ajuste según la actividad detectada en el chat"
                checked={selectedAssistant.timingConfig.smartDelay}
                onChange={(e) => {
                  const checked = e.target.checked;
                  updateAssistantState(
                    {
                      timingConfig: {
                        ...selectedAssistant.timingConfig,
                        smartDelay: checked,
                      },
                    },
                    { immediate: true }
                  );
                }}
              />
            </div>
          </CollapsibleSection>

          {/* Configuración de modelo */}
          <CollapsibleSection 
            title="Configuración de modelo" 
            defaultExpanded={false} 
            showToggle={true}
            isCustomized={enabledSections.model}
            onToggleCustomized={(enabled) => setEnabledSections(prev => ({ ...prev, model: enabled }))}
          >
            <div className={`space-y-4 ${!enabledSections.model ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              <div>
                <label className="block text-sm text-muted mb-1">Formato de respuesta</label>
                <div className="relative">
                  <select
                    className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8"
                    value={selectedAssistant.modelConfig.responseFormat}
                    onChange={(e) => updateAssistantState({
                      modelConfig: { ...selectedAssistant.modelConfig, responseFormat: e.target.value }
                    }, { immediate: true })}
                  >
                    <option value="text">Text</option>
                    <option value="json">JSON</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>

              <SliderInput
                label="Temperatura"
                value={selectedAssistant.modelConfig.temperature}
                onChange={(val) => updateAssistantState({
                  modelConfig: { ...selectedAssistant.modelConfig, temperature: val }
                })}
                min={0}
                max={2}
                step={0.01}
              />

              <SliderInput
                label="Top P"
                value={selectedAssistant.modelConfig.topP}
                onChange={(val) => updateAssistantState({
                  modelConfig: { ...selectedAssistant.modelConfig, topP: val }
                })}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          </CollapsibleSection>
        </div>

        {/* Footer con acciones */}
        <div className="px-6 py-3 border-t border-subtle flex items-center justify-between bg-background z-10">
          <div className="flex items-center gap-4">
            {!assistantId && (
              <button 
                className="text-sm text-muted hover:text-primary flex items-center gap-1"
                onClick={() => setSelectedAssistant(null)}
              >
                <RotateCcw size={14} />
                Volver
              </button>
            )}
            {isSaving && <span className="text-xs text-muted">Guardando...</span>}
            {saveError && <span className="text-xs text-red-500">{saveError}</span>}
            <button className="text-sm text-muted hover:text-primary flex items-center gap-1">
              <SquareChevronRight size={14} /> Prompt Inspector
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de lista (tabla)
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header con botón crear */}
      <div className="flex items-center justify-end px-6 py-3">
        <Button variant="secondary" size="sm" onClick={handleCreateNew}>
          <Plus size={16} className="mr-1" />
          Nuevo asistente
        </Button>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 overflow-auto px-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted">
            Cargando asistentes...
          </div>
        ) : assistants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Bot size={48} className="text-muted mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">
              No hay asistentes configurados
            </h3>
            <p className="text-secondary mb-4">
              Crea tu primer asistente para comenzar
            </p>
            <Button onClick={handleCreateNew}>
              <Plus size={16} className="mr-1" />
              Crear asistente
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-subtle text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted">Nombre</th>
                <th className="px-4 py-3 text-xs font-medium text-muted">Instrucciones</th>
                <th className="px-4 py-3 text-xs font-medium text-muted">Estado</th>
                <th className="px-4 py-3 text-xs font-medium text-muted">Última modificación</th>
                <th className="px-4 py-3 text-xs font-medium text-muted">Tamaño</th>
                <th className="px-4 py-3 text-xs font-medium text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {assistants.map((assistant) => (
                <tr
                  key={assistant.id}
                  className="border-b border-subtle hover:bg-hover cursor-pointer group"
                  onClick={() => {
                    if (onOpenTab) {
                      onOpenTab(assistant.id, assistant.name, {
                        type: 'assistant',
                        assistantId: assistant.id,
                      });
                      return;
                    }

                    void handleSelectAssistant(assistant);
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot size={16} className="text-accent" />
                      <span className="font-medium text-primary">{assistant.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted text-xs">
                      {(assistant.instructionIds || []).length > 0
                        ? ((assistant.instructionIds || []).slice(0, 1).map(id => instructions.find(i => i.id === id)?.name || 'Desconocido').join(', '))
                        : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(assistant.status)}</td>
                  <td className="px-4 py-3 text-secondary text-sm">
                    {formatDate(assistant.updatedAt)} {assistant.lastModifiedBy}
                  </td>
                  <td className="px-4 py-3 text-secondary text-sm">
                    {formatSize(assistant.sizeBytes)} - {assistant.tokensUsed || 0} tokens
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button className="p-1 hover:bg-active rounded"><Share2 size={14} /></button>
                      <button className="p-1 hover:bg-active rounded"><Download size={14} /></button>
                      <button className="p-1 hover:bg-active rounded"><RotateCcw size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AssistantsView;
