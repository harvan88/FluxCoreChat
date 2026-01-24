import { useState, useCallback } from 'react';
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
 * AssistantsView - Orquestador del módulo de Asistentes IA
 * 
 * Este componente ha sido refactorizado para utilizar composición de componentes
 * y hooks de negocio especializados. Reduce el monolito original de 1,289 líneas
 * a menos de 150 líneas de pura orquestación.
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
    isSaving,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    activateAssistant,
    getActiveConfig,
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

  // 3. Manejo de selección y navegación (Sincronizado con assistantId de props)
  const {
    selectedEntity: selectedAssistant,
    selectEntity,
    clearSelection
  } = useEntitySelection<Assistant>({
    entities: assistants,
    urlId: assistantId,
    onSelect: (assistant) => {
      // Si es un agente externo de OpenAI, abrir en tab exclusivo
      if (assistant.runtime === 'openai' && onOpenTab) {
        onOpenTab(assistant.id, assistant.name, {
          type: 'openai-assistant',
          assistantId: assistant.id,
          runtime: 'openai',
        });
        return;
      }
    }
  });

  // 4. Handlers de acción
  const handleSelect = useCallback((assistant: Assistant) => {
    if (onOpenTab) {
      onOpenTab(assistant.id, assistant.name, {
        type: 'assistant',
        assistantId: assistant.id,
      });
    } else {
      selectEntity(assistant);
    }
  }, [onOpenTab, selectEntity]);

  const handleCreate = useCallback(async (runtime: 'local' | 'openai') => {
    setShowRuntimeModal(false);
    const newAssistant = await createAssistant({
      accountId,
      name: runtime === 'openai' ? 'Nuevo Agente OpenAI' : 'Nuevo Asistente',
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

    if (newAssistant) {
      handleSelect(newAssistant);
    }
  }, [accountId, createAssistant, handleSelect]);

  const handleOpenResource = useCallback((id: string, type: 'instruction' | 'vectorStore' | 'tool') => {
    onOpenTab?.(id, 'Cargando...', { type, [`${type}Id`]: id });
  }, [onOpenTab]);

  const handleCopyActiveConfig = async () => {
    const config = await getActiveConfig();
    if (config) {
      await copy(JSON.stringify(config, null, 2));
    } else {
      setError('No se pudo obtener la configuración activa');
    }
  };

  // 5. Renderizado

  // Modal de creación
  if (showRuntimeModal) {
    return <RuntimeSelectorModal onSelect={handleCreate} onClose={() => setShowRuntimeModal(false)} />;
  }

  // Vista de detalle (Configuración)
  if (selectedAssistant) {
    return (
      <AssistantDetail
        assistant={selectedAssistant}
        instructions={instructions}
        vectorStores={vectorStores}
        tools={tools}
        onUpdate={(updates) => updateAssistant(selectedAssistant.id, updates)}
        onDelete={() => deleteAssistant(selectedAssistant.id)}
        onActivate={async () => {
          await activateAssistant(selectedAssistant.id);
          setDetailActivateConfirm(false);
        }}
        onCopyConfig={handleCopyActiveConfig}
        onClose={onOpenTab ? clearSelection : () => selectEntity(null as any)} // Depende de si estamos en modo tabs o vista única
        onOpenResource={handleOpenResource}
        onCreateResource={(type) => handleOpenResource('new', type)}
        isSaving={isSaving}
        saveError={assistantError}
        activateConfirm={detailActivateConfirm}
        setActivateConfirm={setDetailActivateConfirm}
      />
    );
  }

  // Vista de lista (Dashboard)
  return (
    <AssistantList
      assistants={assistants}
      instructions={instructions}
      loading={loadingAssistants}
      onSelect={handleSelect}
      onCreate={() => setShowRuntimeModal(true)}
      onActivate={activateAssistant}
      onDelete={deleteAssistant}
      activateConfirm={activateConfirmId}
      setActivateConfirm={setActivateConfirmId}
    />
  );
}

export default AssistantsView;
