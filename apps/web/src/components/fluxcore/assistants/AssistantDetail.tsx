import { useState } from 'react';
import { Pencil, Copy, Zap, ChevronDown, X, Plus } from 'lucide-react';
import { Button, Badge, Checkbox, SliderInput, CollapsibleSection } from '../../ui';
import { DoubleConfirmationDeleteButton } from '../../ui/DoubleConfirmationDeleteButton';
import {
    PROVIDER_MODELS,
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
    onUpdate: (updates: Partial<Assistant>, saveStrategy: 'none' | 'debounce' | 'immediate') => void;
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
 * AssistantDetail - Restaurada lógica y estética exacta 1:1 (Source of Truth)
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

    const hiddenToolNames = new Set(['Búsqueda en archivos']);
    const visibleTools = (tools || []).filter(tool => !hiddenToolNames.has(tool.name));

    const handleNameSave = (newName: string) => {
        onUpdate({ name: newName }, 'immediate');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden">
            {/* Header original EXACTO con botón Cerrar opcional */}
            <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
                <div className="flex-1">
                    <div className="text-xs text-muted mb-1 flex items-center justify-between">
                        <span>Configuración de asistente</span>
                        <div className="flex items-center gap-2">
                            {isSaving && <span className="animate-pulse text-accent">Guardando...</span>}
                            {saveError && <span className="text-red-500">{saveError}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded border border-transparent bg-transparent hover:border-[var(--text-primary)] focus-within:border-[var(--text-primary)] transition-colors">
                        <button
                            type="button"
                            className="p-1 text-muted hover:text-primary transition-colors flex-shrink-0"
                            aria-label="Editar"
                        >
                            <Pencil size={16} />
                        </button>
                        <input
                            type="text"
                            className="text-xl font-semibold text-primary bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
                            value={assistant.name}
                            onChange={(e) => onUpdate({ name: e.target.value }, 'none')}
                            onBlur={(e) => handleNameSave(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            placeholder="Nombre del asistente"
                        />
                    </div>
                    {assistant.id && (
                        <div
                            className="text-xs text-muted mt-1 cursor-pointer hover:text-accent flex items-center gap-1 group w-fit"
                            onClick={() => copyToClipboard(assistant.id)}
                        >
                            Id: {assistant.id}
                            <span className="opacity-0 group-hover:opacity-100"><Copy size={12} /></span>
                        </div>
                    )}
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-hover rounded text-muted hover:text-primary transition-colors ml-4"
                        title="Cerrar"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-6 space-y-6">
                {/* Lógica de composición exacta (IIFE Pattern from original) */}
                <CollapsibleSection
                    title="Configuración inicial"
                    defaultExpanded={true}
                    showToggle={true}
                    isCustomized={enabledSections.initial}
                    onToggleCustomized={(enabled) => setEnabledSections(prev => ({ ...prev, initial: enabled }))}
                >
                    <div className={`space-y-6 ${!enabledSections.initial ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        {/* Sistema de instrucciones */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm text-muted">Sistema de instrucciones</label>
                                <Button variant="secondary" size="sm" onClick={() => onCreateResource('instruction')}>
                                    <Plus size={16} className="mr-1" /> Crear
                                </Button>
                            </div>

                            {(() => {
                                const currentId = assistant.instructionIds?.[0];
                                const current = currentId ? (instructions || []).find((i) => i.id === currentId) : null;
                                const selectable = (instructions || []).filter((i) => i.id !== currentId);

                                return (
                                    <>
                                        {currentId && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <Badge
                                                    variant="info"
                                                    className="flex items-center gap-1 cursor-pointer hover:bg-accent/20 transition-colors"
                                                    onClick={() => onOpenResource(currentId, 'instruction')}
                                                >
                                                    {current?.name || currentId}
                                                    <button
                                                        type="button"
                                                        className="ml-1 hover:text-red-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdate({ instructionIds: [] }, 'immediate');
                                                        }}
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
                                                        if (id) onUpdate({ instructionIds: [id] }, 'immediate');
                                                    }}
                                                >
                                                    <option value="">Seleccionar instrucción...</option>
                                                    {selectable.map((inst) => (
                                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Base de conocimiento */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm text-muted">Base de conocimiento</label>
                                <Button variant="secondary" size="sm" onClick={() => onCreateResource('vectorStore')}>
                                    <Plus size={16} className="mr-1" /> Crear
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(assistant.vectorStoreIds || []).map((id) => {
                                    const vs = (vectorStores || []).find(v => v.id === id);
                                    return (
                                        <Badge
                                            key={id}
                                            variant="info"
                                            className="flex items-center gap-1 cursor-pointer hover:bg-accent/20 transition-colors"
                                            onClick={() => onOpenResource(id, 'vectorStore')}
                                        >
                                            {vs?.name || id}
                                            <button
                                                type="button"
                                                className="ml-1 hover:text-red-400"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onUpdate({
                                                        vectorStoreIds: assistant.vectorStoreIds?.filter(vid => vid !== id)
                                                    }, 'immediate');
                                                }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                            <div className="relative">
                                {(() => {
                                    const used = new Set(assistant.vectorStoreIds || []);
                                    let selectable = (vectorStores || []).filter((vs) => !used.has(vs.id));

                                    if (assistant.runtime === 'openai') {
                                        selectable = selectable.filter((vs) => vs.backend === 'openai');
                                    }

                                    return (
                                        <select
                                            className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8"
                                            value=""
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                if (id && !assistant.vectorStoreIds?.includes(id)) {
                                                    onUpdate({
                                                        vectorStoreIds: [...(assistant.vectorStoreIds || []), id]
                                                    }, 'immediate');
                                                }
                                            }}
                                            disabled={selectable.length === 0}
                                        >
                                            <option value="">{selectable.length === 0 ? 'No hay más bases disponibles' : 'Agregar base de conocimiento...'}</option>
                                            {selectable.map((vs) => (
                                                <option key={vs.id} value={vs.id}>
                                                    {vs.name} {vs.backend === 'openai' ? '(OpenAI)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    );
                                })()}
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            </div>
                        </div>

                        {/* Herramientas */}
                        <div>
                            <label className="block text-sm text-muted mb-1">Herramientas</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(assistant.toolIds || []).map((id) => {
                                    const tool = visibleTools.find(t => t.id === id);
                                    return tool ? (
                                        <Badge key={id} variant="info" className="flex items-center gap-1">
                                            {tool.name}
                                            <button
                                                type="button"
                                                className="ml-1 hover:text-red-400"
                                                onClick={() => onUpdate({
                                                    toolIds: assistant.toolIds?.filter(tid => tid !== id)
                                                }, 'immediate')}
                                            >
                                                <X size={12} />
                                            </button>
                                        </Badge>
                                    ) : null;
                                })}
                            </div>
                            <div className="relative">
                                {(() => {
                                    const used = new Set(assistant.toolIds || []);
                                    const selectable = visibleTools.filter((t) => !used.has(t.id));
                                    return (
                                        <select
                                            className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8"
                                            value=""
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                if (id && !assistant.toolIds?.includes(id)) {
                                                    onUpdate({
                                                        toolIds: [...(assistant.toolIds || []), id]
                                                    }, 'immediate');
                                                }
                                            }}
                                            disabled={selectable.length === 0}
                                        >
                                            <option value="">{selectable.length === 0 ? 'No hay más herramientas' : 'Agregar herramienta...'}</option>
                                            {selectable.map((tool) => (
                                                <option key={tool.id} value={tool.id}>{tool.name}</option>
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
                                    value={assistant.modelConfig.provider}
                                    disabled={assistant.runtime === 'openai'}
                                    onChange={(e) => {
                                        const provider = e.target.value as AIProvider;
                                        const models = PROVIDER_MODELS[provider] || [];
                                        onUpdate({ modelConfig: { ...assistant.modelConfig, provider, model: models[0] || assistant.modelConfig.model } }, 'immediate');
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
                                <select
                                    className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none pr-8"
                                    value={assistant.modelConfig.model}
                                    onChange={(e) => onUpdate({ modelConfig: { ...assistant.modelConfig, model: e.target.value } }, 'immediate')}
                                >
                                    {(PROVIDER_MODELS[assistant.modelConfig.provider as AIProvider] || []).map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Timing */}
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
                                    value={assistant.timingConfig.responseDelaySeconds}
                                    disabled={assistant.timingConfig.smartDelay}
                                    onChange={(e) => onUpdate({ timingConfig: { ...assistant.timingConfig, responseDelaySeconds: parseInt(e.target.value) || 0 } }, 'debounce')}
                                />
                                <span className="text-muted text-sm">
                                    {assistant.timingConfig.smartDelay ? 'Desactivado por Smart Delay' : 'Tiempo de espera antes de responder automáticamente'}
                                </span>
                            </div>
                        </div>
                        <Checkbox
                            label="Smart delay"
                            description="Permite que el delay se ajuste según la actividad detectada en el chat"
                            checked={assistant.timingConfig.smartDelay}
                            onChange={(e) => onUpdate({ timingConfig: { ...assistant.timingConfig, smartDelay: e.target.checked } }, 'immediate')}
                        />
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Configuración de modelo"
                    defaultExpanded={false}
                    showToggle={true}
                    isCustomized={enabledSections.model}
                    onToggleCustomized={(enabled) => setEnabledSections(prev => ({ ...prev, model: enabled }))}
                >
                    <div className={`space-y-4 ${!enabledSections.model ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <select
                            className="w-full bg-input border border-subtle rounded px-3 py-2 text-primary appearance-none"
                            value={assistant.modelConfig.responseFormat}
                            onChange={(e) => onUpdate({ modelConfig: { ...assistant.modelConfig, responseFormat: e.target.value } }, 'immediate')}
                        >
                            <option value="text">Text</option>
                            <option value="json">JSON</option>
                        </select>
                        <SliderInput label="Temperatura" value={assistant.modelConfig.temperature} onChange={(val) => onUpdate({ modelConfig: { ...assistant.modelConfig, temperature: val } }, 'debounce')} min={0} max={2} step={0.01} />
                        <SliderInput label="Top P" value={assistant.modelConfig.topP} onChange={(val) => onUpdate({ modelConfig: { ...assistant.modelConfig, topP: val } }, 'debounce')} min={0} max={1} step={0.01} />
                    </div>
                </CollapsibleSection>
            </div>

            {/* Footer original EXACTO */}
            <div className="px-6 py-3 border-t border-subtle bg-surface flex flex-wrap items-center gap-3 justify-start">
                {assistant.status !== 'active' && (
                    activateConfirm ? (
                        <>
                            <span className="text-sm text-muted">¿Confirmar activación?</span>
                            <button
                                onClick={onActivate}
                                className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-1.5 text-sm font-medium text-inverse shadow-sm transition-colors hover:bg-success/90"
                            >
                                <Zap size={16} className="text-inverse" /> Activar ahora
                            </button>
                            <button
                                onClick={() => setActivateConfirm(false)}
                                className="inline-flex items-center gap-1.5 rounded-md bg-elevated px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-hover"
                            >
                                Cancelar
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setActivateConfirm(true)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-1.5 text-sm font-medium text-inverse shadow-sm transition-colors hover:bg-success/90"
                        >
                            <Zap size={16} className="text-inverse" /> Activar asistente
                        </button>
                    )
                )}
                <button
                    onClick={onCopyConfig}
                    className="inline-flex items-center gap-1.5 rounded-md bg-elevated px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-hover"
                >
                    <Copy size={16} /> Copiar config activa
                </button>
                <DoubleConfirmationDeleteButton onConfirm={onDelete} className="ml-auto" size={16} />
            </div>
        </div>
    );
}

export default AssistantDetail;
