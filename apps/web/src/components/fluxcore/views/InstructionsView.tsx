/**
 * Instructions View - Biblioteca de Instrucciones (Orquestador)
 * 
 * Implementa un patrón de "Stable Local State" para evitar parpadeos y pérdida de foco 
 * durante la edición y el guardado automático.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { usePanelStore } from '../../../store/panelStore';
import {
  useInstructions,
  useAssistants,
  useAutoSave,
  useEntitySelection
} from '../../../hooks/fluxcore';
import type { Instruction } from '../../../types/fluxcore';
import type { ClipboardStatus, EditorViewMode } from '../../../types/fluxcore/instruction.types';
import { InstructionDetail } from '../instructions/InstructionDetail';
import { InstructionList } from '../instructions/InstructionList';
import {
  MAX_INSTRUCTION_CHARS,
  AUTOSAVE_DELAY_MS,
  countLines,
  countWords,
  estimateTokens,
} from '../../../lib/fluxcore';

const MAX_CHARS = MAX_INSTRUCTION_CHARS;

interface InstructionsViewProps {
  accountId: string;
  onOpenTab?: (tabId: string, title: string, data: any) => void;
  instructionId?: string;
}

export function InstructionsView({ accountId, onOpenTab, instructionId }: InstructionsViewProps) {
  const { token } = useAuthStore();
  const { openTab } = usePanelStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [localSelectedInstruction, setLocalSelectedInstruction] = useState<Instruction | null>(null);
  const [viewMode, setViewMode] = useState<EditorViewMode>('code');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [copyStatus, setCopyStatus] = useState<ClipboardStatus>('idle');
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Ref para capturar el estado más reciente dentro de closures (autosave)
  const currentInstructionRef = useRef<Instruction | null>(null);

  const {
    instructions,
    loading,
    createInstruction,
    updateInstruction,
    updateLocalInstruction,
    deleteInstruction: deleteInstructionHook,
    refresh,
  } = useInstructions(accountId);

  const {
    assistants,
    createAssistant: createAssistantHook,
  } = useAssistants(accountId);

  const [lastAutosave, setLastAutosave] = useState<Date | null>(null);
  const [creatingAssistant, setCreatingAssistant] = useState(false);

  // Sincronizar el ref con el estado local cada vez que este cambie
  useEffect(() => {
    currentInstructionRef.current = localSelectedInstruction;
  }, [localSelectedInstruction]);

  // 1. Configuración de Selección (useEntitySelection)
  const selectionOptions = useMemo(() => ({
    entities: instructions,
    urlId: instructionId,
    onSelect: (instruction: Instruction) => {
      // Estabilidad: Solo actualizar si el ID cambió o si no había selección previa
      setLocalSelectedInstruction(prev => {
        if (prev?.id === instruction.id) return prev;
        return instruction;
      });
    },
    loadById: async (id: string) => {
      if (!token) return null;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await fetch(`/api/fluxcore/instructions/${id}?accountId=${accountId}`, { headers });
        const data = await response.json();
        return data.success ? data.data : null;
      } catch (error) {
        console.error('[InstructionsView] Error loading instruction by ID:', error);
        return null;
      }
    }
  }), [instructions, instructionId, token, accountId]);

  const { selectEntity, clearSelection } = useEntitySelection<Instruction>(selectionOptions);

  // 2. Lógica de Auto-Guardado (Mismo patrón que Assistants)
  const { save: autoSaveContent, saveImmediate: autoSaveContentImmediate, isSaving: isAutoSaving } = useAutoSave(
    async ({ id, content }: { id: string; content: string }) => {
      const current = currentInstructionRef.current;
      if (!current || current.id !== id) return;

      try {
        await updateInstruction(id, {
          name: current.name,
          description: current.description ?? undefined,
          content,
          status: current.status,
        });

        // NO llamamos a setLocalSelectedInstruction aquí para evitar el salto de cursor (Cursor Jump)
        // Confiamos en que localSelectedInstruction ya tiene el valor más reciente del usuario
        setHasChanges(false);
        setLastAutosave(new Date());
      } catch (error) {
        console.error('[InstructionsView] Autosave failed:', error);
      }
    },
    {
      delay: AUTOSAVE_DELAY_MS ?? 1000,
    }
  );

  // Resetear timer de autosave al cambiar de instrucción
  useEffect(() => {
    setLastAutosave(null);
  }, [localSelectedInstruction?.id]);

  // 3. Handlers de Acción
  const handleCreateNew = async () => {
    const created = await createInstruction({
      accountId,
      name: 'Nuevas instrucciones',
      content: '',
      status: 'draft',
    });

    if (!created) return;

    if (onOpenTab) {
      const identity = `extension:fluxcore:instruction:${accountId}:${created.id}`;
      onOpenTab(created.id, created.name, {
        type: 'instruction',
        identity,
        instructionId: created.id,
      });
    } else {
      setLocalSelectedInstruction(created);
      selectEntity(created);
    }
  };

  const handleSelectInstruction = (instruction: Instruction) => {
    setDeleteError(null);
    if (onOpenTab) {
      const identity = `extension:fluxcore:instruction:${accountId}:${instruction.id}`;
      onOpenTab(instruction.id, instruction.name, {
        type: 'instruction',
        identity,
        instructionId: instruction.id,
      });
    } else {
      setLocalSelectedInstruction(instruction);
      selectEntity(instruction);
    }
    setIsSaving(false);
  };

  const deleteInstructionById = async (id: string) => {
    const success = await deleteInstructionHook(id);
    if (success) {
      if (localSelectedInstruction?.id === id) {
        setLocalSelectedInstruction(null);
        clearSelection();
      }
      setDeleteError(null);
      void refresh();
      return;
    }
    setDeleteError('No se pudo eliminar la instrucción');
  };

  const handleDeleteInstruction = async () => {
    if (!localSelectedInstruction) return;
    await deleteInstructionById(localSelectedInstruction.id);
  };

  const handleContentChange = (newContent: string) => {
    if (!localSelectedInstruction) return;
    const truncatedContent = newContent.slice(0, MAX_CHARS);

    // Actualización local inmediata (Estabilidad)
    setLocalSelectedInstruction(prev => prev ? { ...prev, content: truncatedContent } : prev);

    // Sincronización optimista con el hook global
    updateLocalInstruction(localSelectedInstruction.id, { content: truncatedContent });

    setHasChanges(true);
    autoSaveContent({ id: localSelectedInstruction.id, content: truncatedContent });
  };

  const handleCopyContent = async () => {
    if (!localSelectedInstruction) return;
    try {
      await navigator.clipboard.writeText(localSelectedInstruction.content || '');
      setCopyStatus('copied');
    } catch (error) {
      setCopyStatus('error');
    } finally {
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleDownloadContent = () => {
    if (!localSelectedInstruction) return;
    const content = localSelectedInstruction.content || '';
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `${localSelectedInstruction.name || 'instruccion'}.md`;
    link.download = filename.replace(/[\\/:*?"<>|]/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNameChange = (value: string) => {
    if (!localSelectedInstruction) return;
    setLocalSelectedInstruction(prev => prev ? { ...prev, name: value } : prev);
    updateLocalInstruction(localSelectedInstruction.id, { name: value });
  };

  const handleNameSave = async (newName: string) => {
    if (!localSelectedInstruction) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === localSelectedInstruction.name) return;

    setIsSaving(true);
    try {
      await updateInstruction(localSelectedInstruction.id, {
        name: trimmed,
        description: localSelectedInstruction.description ?? undefined,
        content: localSelectedInstruction.content,
        status: localSelectedInstruction.status,
      });
      await refresh();
    } catch (e) {
      console.error('[InstructionsView] Error saving name:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!token || !localSelectedInstruction?.id) return;

    setIsSaving(true);
    try {
      const updated = await updateInstruction(localSelectedInstruction.id, {
        name: localSelectedInstruction.name,
        description: localSelectedInstruction.description ?? undefined,
        content: localSelectedInstruction.content,
        status: localSelectedInstruction.status,
      });

      if (updated) {
        setLocalSelectedInstruction(prev => prev?.id === updated.id ? { ...prev, ...updated, content: prev.content } : updated);
      }

      await refresh();
      setLastAutosave(new Date());
      setHasChanges(false);
    } catch (e) {
      console.error('[InstructionsView] Error manual save:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Estadísticas y Consumidores
  const editorStats = useMemo(() => {
    const content = localSelectedInstruction?.content ?? '';
    return {
      chars: content.length,
      lines: countLines(content),
      words: countWords(content),
      tokens: estimateTokens(content),
    };
  }, [localSelectedInstruction?.content]);

  const assistantConsumers = useMemo(() => {
    if (!localSelectedInstruction?.usedByAssistants?.length) return [];
    const ids = new Set(localSelectedInstruction.usedByAssistants);
    return assistants
      .filter((assistant) => ids.has(assistant.id))
      .map((assistant) => ({
        id: assistant.id,
        name: assistant.name,
        runtime: assistant.runtime
      }));
  }, [localSelectedInstruction?.usedByAssistants, assistants]);

  const handleCreateAssistantForInstruction = useCallback(async () => {
    if (!localSelectedInstruction?.id) return;
    setCreatingAssistant(true);
    try {
      const newAssistant = await createAssistantHook({
        accountId,
        name: `Asistente ${localSelectedInstruction.name}`,
        runtime: 'local',
        status: 'draft',
        instructionIds: [localSelectedInstruction.id],
      });
      if (newAssistant && onOpenTab) {
        onOpenTab(newAssistant.id, newAssistant.name, {
          type: 'assistant',
          assistantId: newAssistant.id,
        });
      }
    } catch (error) {
      console.error('[InstructionsView] Error creating assistant:', error);
    } finally {
      setCreatingAssistant(false);
    }
  }, [accountId, createAssistantHook, onOpenTab, localSelectedInstruction?.id, localSelectedInstruction?.name]);

  // 5. Renderizado
  if (localSelectedInstruction) {
    const isManaged = localSelectedInstruction.isManaged === true;
    return (
      <InstructionDetail
        instruction={localSelectedInstruction}
        viewMode={viewMode}
        copyStatus={copyStatus}
        onViewModeChange={setViewMode}
        onCopyContent={handleCopyContent}
        onDownloadContent={handleDownloadContent}
        onContentChange={handleContentChange}
        onContentBlur={() => {
          if (localSelectedInstruction?.id) {
            autoSaveContentImmediate({
              id: localSelectedInstruction.id,
              content: localSelectedInstruction.content
            });
          }
        }}
        onClose={() => {
          setLocalSelectedInstruction(null);
          if (onOpenTab) clearSelection();
          else selectEntity(null as any);
        }}
        onSave={!isManaged ? handleSave : undefined}
        canSave={!isManaged && hasChanges && !isSaving}
        isSaving={isSaving}
        maxChars={MAX_CHARS}
        deleteError={deleteError}
        onDelete={handleDeleteInstruction}
        onNameChange={handleNameChange}
        onNameSave={handleNameSave}
        nameInputRef={nameInputRef}
        isManaged={isManaged}
        openProfileTab={() =>
          openTab('settings', {
            type: 'settings',
            identity: 'settings:profile',
            title: 'Perfil',
            closable: true,
            context: { settingsSection: 'profile' },
          })
        }
        stats={editorStats}
        lastAutosave={lastAutosave}
        assistantConsumers={assistantConsumers}
        onCreateAssistant={assistantConsumers.length === 0 ? handleCreateAssistantForInstruction : undefined}
        createAssistantLoading={creatingAssistant}
        isAutoSaving={isAutoSaving}
      />
    );
  }

  return (
    <InstructionList
      instructions={instructions}
      loading={loading}
      onCreate={handleCreateNew}
      onSelect={handleSelectInstruction}
      onDelete={deleteInstructionById}
    />
  );
}

export default InstructionsView;
