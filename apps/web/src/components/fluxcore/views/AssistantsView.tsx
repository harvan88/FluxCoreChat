import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  useAssistants,
  useInstructions,
  useVectorStores,
  useTools,
  useEntitySelection,
  useClipboard
} from '../../../hooks/fluxcore';
import {
  AssistantList,
  AssistantDetail,
  RuntimeSelectorModal
} from '../assistants';
import type { Assistant, AssistantsViewProps } from '../../../types/fluxcore';

/**
 * AssistantsView - Orquestador con lógica original de guardado restaurada.
 */
export function AssistantsView({
  accountId,
  onOpenTab,
  assistantId
}: AssistantsViewProps) {
  // 1. Hooks de negocio (Data & CRUD)
  const {
    assistants,
    loading: loadingAssistants,
    error: assistantError,
    isSaving: isBackendSaving,
    createAssistant,
    updateAssistant,
    updateLocalAssistant,
    deleteAssistant,
    activateAssistant,
    getActiveConfig,
    refresh,
    setError
  } = useAssistants(accountId);

  const { instructions } = useInstructions(accountId);
  const { vectorStores } = useVectorStores(accountId);
  const { tools } = useTools(accountId);
  const { copy } = useClipboard();

  // 2. Estado de UI local
  const [showRuntimeModal, setShowRuntimeModal] = useState(false);
  const [activateConfirmId, setActivateConfirmId] = useState<string | null>(null);
  const [detailActivateConfirm, setDetailActivateConfirm] = useState(false);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const [localSelectedAssistant, setLocalSelectedAssistant] = useState<Assistant | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 3. Manejo de selección y navegación (Sincronizado con reactive list)
  const selectionOptions = useMemo(() => ({
    entities: assistants,
    urlId: assistantId,
    onSelect: (assistant: Assistant) => {
      // SOLO actualizamos el estado local si el asistente es distinto al actual o es una selección inicial
      setLocalSelectedAssistant(prev => {
        if (prev?.id === assistant.id) return prev;
        return assistant;
      });

      if (assistant.runtime === 'openai' && onOpenTab) {
        onOpenTab(assistant.id, assistant.name, {
          type: 'openai-assistant',
          assistantId: assistant.id,
          runtime: 'openai',
        });
      }
    }
  }), [assistants, assistantId, onOpenTab]);

  const { selectEntity, clearSelection } = useEntitySelection<Assistant>(selectionOptions);

  // Filtrado estricto de campos para el backend (Evita error 'Unexpected property')
  const buildAssistantPayload = useCallback((assistant: Assistant) => ({
    accountId,
    name: assistant.name,
    description: assistant.description ?? undefined,
    status: assistant.status,
    instructionIds: assistant.instructionIds?.slice(0, 1) ?? undefined,
    vectorStoreIds: assistant.vectorStoreIds ?? undefined,
    toolIds: assistant.toolIds ?? undefined,
    modelConfig: assistant.modelConfig,
    timingConfig: assistant.timingConfig,
  }), [accountId]);

  // 4. Handlers de acción
  const handleSelect = useCallback((assistant: Assistant) => {
    setLocalSelectedAssistant(assistant);
    if (onOpenTab) {
      onOpenTab(assistant.id, assistant.name, {
        type: 'assistant',
        assistantId: assistant.id,
      });
    } else {
      selectEntity(assistant);
    }
  }, [onOpenTab, selectEntity]);

  // 4. Lógica de Guardado Original EXACTA (Restaurada de original.tsx)
  const scheduleSave = useCallback((assistant: Assistant, immediate = false) => {
    if (!assistant.id) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const performSave = async () => {
      setIsLocalSaving(true);
      const payload = buildAssistantPayload(assistant);
      await updateAssistant(assistant.id, payload as any);
      setIsLocalSaving(false);
    };

    if (immediate) {
      void performSave();
    } else {
      saveTimeoutRef.current = setTimeout(performSave, 500);
    }
  }, [updateAssistant, buildAssistantPayload]);

  const handleUpdate = useCallback((updates: Partial<Assistant>, saveStrategy: 'none' | 'debounce' | 'immediate') => {
    if (!localSelectedAssistant) return;

    // 1. Actualización local inmediata (Para estabilidad del Form)
    const next = { ...localSelectedAssistant, ...updates };
    setLocalSelectedAssistant(next);

    // 2. Sincronizar optimísticamente con la lista global
    updateLocalAssistant(localSelectedAssistant.id, updates);

    if (saveStrategy === 'none') return;
    scheduleSave(next, saveStrategy === 'immediate');
  }, [localSelectedAssistant, updateLocalAssistant, scheduleSave]);

  const handleCreate = useCallback(async (runtime: 'local' | 'openai') => {
    setShowRuntimeModal(false);
    const newAssistant = await createAssistant({
      accountId,
      name: runtime === 'openai' ? 'Nuevo asistente OpenAI' : 'Nuevo asistente',
      runtime,
      status: 'draft',
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        topP: 1.0,
        responseFormat: 'text'
      },
      timingConfig: {
        responseDelaySeconds: 2,
        smartDelay: true
      }
    });

    if (newAssistant && !onOpenTab) {
      setLocalSelectedAssistant(newAssistant);
      selectEntity(newAssistant);
    }
  }, [accountId, createAssistant, onOpenTab, selectEntity]);

  const handleOpenResource = useCallback((id: string, type: 'instruction' | 'vectorStore' | 'tool') => {
    onOpenTab?.(id, 'Payload...', { type, [`${type}Id`]: id });
  }, [onOpenTab]);

  const handleCreateResource = useCallback((type: 'instruction' | 'vectorStore' | 'tool') => {
    onOpenTab?.('new', 'Nuevo', { type, [`${type}Id`]: 'new' });
  }, [onOpenTab]);

  const handleCopyActiveConfig = async () => {
    const config = await getActiveConfig();
    if (config) {
      await copy(JSON.stringify(config, null, 2));
    } else {
      setError('Error al obtener la configuración activa');
    }
  };

  // Cleanup cleanup cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // 5. Renderizado
  if (showRuntimeModal) {
    return <RuntimeSelectorModal onSelect={handleCreate} onClose={() => setShowRuntimeModal(false)} />;
  }

  if (localSelectedAssistant) {
    return (
      <AssistantDetail
        assistant={localSelectedAssistant}
        instructions={instructions}
        vectorStores={vectorStores}
        tools={tools}
        onUpdate={handleUpdate}
        onDelete={() => deleteAssistant(localSelectedAssistant.id)}
        onActivate={async () => {
          await activateAssistant(localSelectedAssistant.id);
          setDetailActivateConfirm(false);
          // Al activar, otros asistentes cambian, recargamos lista
          refresh();
        }}
        onCopyConfig={handleCopyActiveConfig}
        onClose={() => {
          setLocalSelectedAssistant(null);
          if (onOpenTab) clearSelection();
          else selectEntity(null as any);
        }}
        onOpenResource={handleOpenResource}
        onCreateResource={handleCreateResource}
        isSaving={isLocalSaving || isBackendSaving}
        saveError={assistantError}
        activateConfirm={detailActivateConfirm}
        setActivateConfirm={setDetailActivateConfirm}
      />
    );
  }

  return (
    <AssistantList
      assistants={assistants}
      instructions={instructions}
      loading={loadingAssistants}
      onSelect={handleSelect}
      onCreate={() => setShowRuntimeModal(true)}
      onActivate={async (id) => {
        await activateAssistant(id);
        refresh();
      }}
      onDelete={deleteAssistant}
      activateConfirm={activateConfirmId}
      setActivateConfirm={setActivateConfirmId}
    />
  );
}

export default AssistantsView;

