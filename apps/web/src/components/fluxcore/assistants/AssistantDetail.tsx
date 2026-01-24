import { useState } from 'react';
import { Copy, Zap, ChevronDown } from 'lucide-react';
import { Button, Checkbox, SliderInput, CollapsibleSection } from '../../ui';
import { DetailHeader } from '../detail';
import { ResourceSelector } from '../forms/ResourceSelector';
import {
    PROVIDER_MODELS,
    PROVIDER_NAMES,
} from '../../../lib/fluxcore';
import type {
    Assistant,
    Instruction,
    VectorStore,
    Tool,
    AIProvider
} from '../../../types/fluxcore';

interface AssistantDetailProps {
    assistant: Assistant;
    instructions: Instruction[];
    vectorStores: VectorStore[];
    tools: Tool[];
    onUpdate: (updates: Partial<Assistant>, immediate?: boolean) => void;
    onDelete: () => void;
    onActivate: () => void;
    onCopyConfig: () => void;
    onClose: () => void;
    onOpenResource: (id: string, type: 'instruction' | 'vectorStore' | 'tool') => void;
    onCreateResource: (type: 'instruction' | 'vectorStore' | 'tool') => void;
    isSaving?: boolean;
    saveError?: string | null;
    activateConfirm: boolean;
    setActivateConfirm: (confirm: boolean) => void;
}

/**
 * AssistantDetail - Panel de configuración de un asistente
 */
export function AssistantDetail({
    assistant,
    instructions,
    vectorStores,
    tools,
    onUpdate,
    onDelete,
    onActivate,
    onCopyConfig,
    onClose,
    onOpenResource,
    onCreateResource,
    isSaving,
    saveError,
    activateConfirm,
    setActivateConfirm,
}: AssistantDetailProps) {
    const [enabledSections, setEnabledSections] = useState({
        initial: true,
        provider: true,
        timing: true,
        model: false
    });

    // Local state update helper
    const updateModel = (updates: Partial<Assistant['modelConfig']>) => {
        onUpdate({
            modelConfig: { ...assistant.modelConfig, ...updates }
        });
    };

    const updateTiming = (updates: Partial<Assistant['timingConfig']>) => {
        onUpdate({
            timingConfig: { ...assistant.timingConfig, ...updates }
        });
    };

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden">
            {/* Header */}
            <DetailHeader
                preTitle="Asistente"
                name={assistant.name}
                id={assistant.id}
                onNameChange={(name) => onUpdate({ name }, false)}
                onNameSave={(name) => onUpdate({ name }, true)}
                onClose={onClose}
                isSaving={isSaving}
                saveError={saveError}
                idPrefix="asst_"
            />

            <div className="flex-1 min-h-0 overflow-auto p-6 space-y-6">
                {/* Configuración inicial - Referencias a otros activos */}
                <CollapsibleSection
                    title="Composición de Activos"
                    defaultExpanded={true}
                    showToggle={true}
                    isCustomized={enabledSections.initial}
                    onToggleCustomized={(enabled) => setEnabledSections(prev => ({ ...prev, initial: enabled }))}
                >
                    <div className={`space-y-6 ${!enabledSections.initial ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        {/* Sistema de instrucciones */}
                        <ResourceSelector
                            label="Sistema de instrucciones"
                            resources={instructions}
                            selectedIds={assistant.instructionIds || []}
                            maxItems={1}
                            onCreate={() => onCreateResource('instruction')}
                            onSelect={(id) => onUpdate({ instructionIds: [id] }, true)}
                            onRemove={() => onUpdate({ instructionIds: [] }, true)}
                            onReferenceClick={(id) => onOpenResource(id, 'instruction')}
                            placeholder="Vincular instrucciones..."
                        />

                        {/* Base de conocimiento */}
                        <ResourceSelector
                            label="Bases de conocimiento (RAG)"
                            resources={assistant.runtime === 'openai'
                                ? vectorStores.filter(vs => vs.backend === 'openai')
                                : vectorStores
                            }
                            selectedIds={assistant.vectorStoreIds || []}
                            onCreate={() => onCreateResource('vectorStore')}
                            onSelect={(id) => onUpdate({
                                vectorStoreIds: [...(assistant.vectorStoreIds || []), id]
                            }, true)}
                            onRemove={(id) => onUpdate({
                                vectorStoreIds: assistant.vectorStoreIds?.filter(vid => vid !== id)
                            }, true)}
                            onReferenceClick={(id) => onOpenResource(id, 'vectorStore')}
                            placeholder={assistant.runtime === 'openai' ? "Agregar base (OpenAI)..." : "Agregar base de conocimiento..."}
                        />

                        {/* Herramientas */}
                        <ResourceSelector
                            label="Capacidades y Herramientas"
                            resources={tools}
                            selectedIds={assistant.toolIds || []}
                            onCreate={() => onCreateResource('tool')}
                            onSelect={(id) => onUpdate({
                                toolIds: [...(assistant.toolIds || []), id]
                            }, true)}
                            onRemove={(id) => onUpdate({
                                toolIds: assistant.toolIds?.filter(tid => tid !== id)
                            }, true)}
                            onReferenceClick={(id) => onOpenResource(id, 'tool')}
                            placeholder="Vincular herramienta..."
                        />
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
                                    className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8 text-sm focus:border-accent"
                                    value={assistant.modelConfig.provider}
                                    disabled={assistant.runtime === 'openai'}
                                    onChange={(e) => {
                                        const provider = e.target.value as AIProvider;
                                        const models = PROVIDER_MODELS[provider] || [];
                                        updateModel({
                                            provider: provider,
                                            model: models[0] || assistant.modelConfig.model
                                        });
                                    }}
                                >
                                    <option value="openai">{PROVIDER_NAMES.openai}</option>
                                    <option value="groq">{PROVIDER_NAMES.groq}</option>
                                    <option value="anthropic">{PROVIDER_NAMES.anthropic}</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-muted mb-1">Modelo de lenguaje</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8 text-sm focus:border-accent"
                                    value={assistant.modelConfig.model}
                                    onChange={(e) => updateModel({ model: e.target.value })}
                                >
                                    {(PROVIDER_MODELS[assistant.modelConfig.provider as AIProvider] || []).map((m: string) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Tiempo de espera de respuesta */}
                <CollapsibleSection
                    title="Timing y Automatización"
                    defaultExpanded={true}
                    showToggle={true}
                    isCustomized={enabledSections.timing}
                    onToggleCustomized={(enabled) => setEnabledSections(prev => ({ ...prev, timing: enabled }))}
                >
                    <div className={`space-y-6 ${!enabledSections.timing ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <div>
                            <label className="block text-sm text-muted mb-2">Delay de respuesta (segundos)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    className="w-24 bg-input border border-subtle rounded px-3 py-2 text-primary text-sm disabled:opacity-50"
                                    value={assistant.timingConfig.responseDelaySeconds}
                                    disabled={assistant.timingConfig.smartDelay}
                                    min={0}
                                    max={60}
                                    onChange={(e) => updateTiming({
                                        responseDelaySeconds: parseInt(e.target.value) || 0
                                    })}
                                />
                                <span className="text-muted text-xs">
                                    {assistant.timingConfig.smartDelay
                                        ? 'Bloqueado por Smart Delay'
                                        : 'Tiempo base antes de iniciar generación automática'}
                                </span>
                            </div>
                        </div>

                        <Checkbox
                            label="Activar Smart Delay"
                            description="Ajusta el tiempo de respuesta dinámicamente según la detección de actividad en el chat para una experiencia más humana."
                            checked={assistant.timingConfig.smartDelay}
                            onChange={(e) => updateTiming({ smartDelay: e.target.checked })}
                            className="bg-active/30 p-4 rounded-lg border border-subtle"
                        />
                    </div>
                </CollapsibleSection>

                {/* Parámetros avanzados del modelo */}
                <CollapsibleSection
                    title="Parámetros Avanzados"
                    defaultExpanded={false}
                    showToggle={true}
                    isCustomized={enabledSections.model}
                    onToggleCustomized={(enabled) => setEnabledSections(prev => ({ ...prev, model: enabled }))}
                >
                    <div className={`space-y-6 p-2 ${!enabledSections.model ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <div>
                            <label className="block text-sm text-muted mb-1">Formato de salida</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8 text-sm focus:border-accent"
                                    value={assistant.modelConfig.responseFormat}
                                    onChange={(e) => updateModel({ responseFormat: e.target.value })}
                                >
                                    <option value="text">Texto enriquecido</option>
                                    <option value="json">JSON estructurado</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            </div>
                        </div>

                        <SliderInput
                            label="Creatividad (Temperature)"
                            value={assistant.modelConfig.temperature}
                            onChange={(val) => updateModel({ temperature: val })}
                            min={0}
                            max={2}
                            step={0.1}
                        />

                        <SliderInput
                            label="Nucleus Sampling (Top P)"
                            value={assistant.modelConfig.topP}
                            onChange={(val) => updateModel({ topP: val })}
                            min={0}
                            max={1}
                            step={0.05}
                        />
                    </div>
                </CollapsibleSection>
            </div>

            {/* Footer de Acciones de Estado */}
            <div className="px-6 py-4 border-t border-subtle bg-surface flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                    {assistant.status !== 'active' ? (
                        activateConfirm ? (
                            <div className="flex items-center gap-2 bg-success/5 border border-success/30 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                                <span className="text-xs font-medium text-success mr-2">¿Confirmar activación?</span>
                                <Button
                                    onClick={onActivate}
                                    size="sm"
                                    variant="primary"
                                    className="h-8 bg-success hover:bg-success/80 border-none text-white"
                                >
                                    <Zap size={14} className="mr-1.5" />
                                    Activar ahora
                                </Button>
                                <Button
                                    onClick={() => setActivateConfirm(false)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-8"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={() => setActivateConfirm(true)}
                                variant="primary"
                                className="bg-success hover:bg-success/80 border-none text-white shadow-lg shadow-success/20"
                            >
                                <Zap size={16} className="mr-2" />
                                Establecer como Activo
                            </Button>
                        )
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-success/10 text-success rounded-lg border border-success/20">
                            <Zap size={16} fill="currentColor" />
                            <span className="text-sm font-semibold">Este asistente está en producción</span>
                        </div>
                    )}

                    <Button
                        onClick={onCopyConfig}
                        variant="secondary"
                        className="group"
                    >
                        <Copy size={16} className="mr-2 group-hover:scale-110 transition-transform" />
                        Copiar config activa
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        onClick={onDelete}
                        variant="ghost"
                        className="text-error hover:bg-error/10 hover:text-error"
                    >
                        Eliminar asistente
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default AssistantDetail;
