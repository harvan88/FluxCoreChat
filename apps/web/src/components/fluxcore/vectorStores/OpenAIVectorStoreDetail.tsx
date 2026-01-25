import { useRef, useMemo, useCallback } from 'react';
import { Pencil, Copy, ExternalLink, Cloud, Plus, Timer, Zap } from 'lucide-react';
import { Button, Badge, DoubleConfirmationDeleteButton, CollapsibleSection, Checkbox } from '../../ui';
import { VectorStoreFilesSection } from '../components/VectorStoreFilesSection';
import { VectorStoreDiagnosticSection } from '../components/VectorStoreDiagnosticSection';
import { useAssistants } from '../../../hooks/fluxcore';
import type { VectorStore } from '../../../types/fluxcore';
import { formatDate, formatSize } from '../../../lib/fluxcore';

interface OpenAIVectorStoreDetailProps {
    store: VectorStore;
    accountId: string;
    onUpdate: (updates: Partial<VectorStore>) => void;
    onDelete: () => void;
    onSave: (updates?: Partial<VectorStore>) => void;
    onOpenTab?: (tabId: string, title: string, data: any) => void;
    isSaving: boolean;
    saveError: string | null;
}

export function OpenAIVectorStoreDetail({
    store,
    accountId,
    onUpdate,
    onDelete,
    onSave,
    onOpenTab,
    isSaving,
    saveError
}: OpenAIVectorStoreDetailProps) {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const { assistants } = useAssistants(accountId);

    // Encontrar asistentes que consumen este VS
    const consumingAssistants = useMemo(() => {
        return assistants.filter(a => a.vectorStoreIds?.includes(store.id));
    }, [assistants, store.id]);

    const handleCopyConfig = async () => {
        const config = { vectorStore: store };
        await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    };

    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur();
            onSave();
        }
    };

    const handleCreateAssistant = useCallback(() => {
        if (!onOpenTab) return;

        // Abrir pestaña de creación de asistente pre-vinculado
        onOpenTab('new-assistant', 'Nuevo Asistente', {
            type: 'assistant',
            view: 'config',
            initialData: {
                runtime: 'openai',
                vectorStoreIds: [store.id]
            }
        });
    }, [onOpenTab, store.id]);

    const handleOpenAssistant = (assistantId: string, name: string) => {
        if (onOpenTab) {
            onOpenTab(assistantId, name, {
                type: 'assistant',
                assistantId
            });
        }
    };

    const isPolicyNever = store.expirationPolicy === 'never' || !store.expirationPolicy;

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-subtle flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 rounded border border-transparent hover:border-subtle focus-within:border-accent transition-colors bg-transparent flex-1">
                            <button
                                type="button"
                                onClick={() => nameInputRef.current?.focus()}
                                className="p-1 text-muted hover:text-primary transition-colors flex-shrink-0"
                            >
                                <Pencil size={16} />
                            </button>
                            <input
                                ref={nameInputRef}
                                type="text"
                                className="text-lg font-semibold text-primary bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
                                value={store.name}
                                onChange={(e) => onUpdate({ name: e.target.value })}
                                onBlur={() => onSave()}
                                onKeyDown={handleNameKeyDown}
                                placeholder="Nombre en OpenAI"
                            />
                        </div>
                        <Badge variant="info" className="opacity-80 flex items-center gap-1">
                            <Cloud size={10} /> OpenAI Sync
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isSaving && <span className="text-xs text-muted animate-pulse">Sincronizando...</span>}
                    {saveError && <span className="text-xs text-red-500">{saveError}</span>}
                    <Button size="sm" onClick={() => onSave()} disabled={isSaving}>Sync Manual</Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* ID Info */}
                    <div className="flex items-center justify-between group px-4">
                        <div className="text-sm flex items-center gap-6">
                            <div>
                                <span className="text-muted block text-[10px] uppercase tracking-wider">ID OpenAI</span>
                                <a
                                    href={`https://platform.openai.com/storage/vector_stores/${store.externalId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent font-mono text-xs hover:underline flex items-center gap-1"
                                >
                                    {store.externalId || 'Sincronizando...'}
                                    <ExternalLink size={10} />
                                </a>
                            </div>
                            <div>
                                <span className="text-muted block text-[10px] uppercase tracking-wider">Estado en Cloud</span>
                                <span className="text-primary font-medium flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${store.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                                    {store.status === 'completed' ? 'Listo' : 'Procesando'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN: Detalles & Uso - Respetando patrón colapsable (Ocupando fila completa) */}
                    <CollapsibleSection title="Detalles & Uso" defaultExpanded showToggle={false}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2">
                            <div className="space-y-1">
                                <label className="text-[10px] text-muted uppercase font-bold">Tamaño Utilizado</label>
                                <p className="text-lg font-semibold text-primary">{formatSize(store.usageBytes || 0)}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-muted uppercase font-bold">Archivos Indexados</label>
                                <p className="text-lg font-semibold text-primary">{(store.fileCounts as any)?.total || 0}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-muted uppercase font-bold">Costo de Almacenamiento</label>
                                <p className="text-lg font-semibold text-accent">
                                    ${(((store.usageBytes || 0) / (1024 * 1024 * 1024)) * 0.10).toFixed(5)} <span className="text-[10px] text-muted font-normal italic">/ día</span>
                                </p>
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* SECCIÓN: Expiración - Ocupando fila completa y con lógica excluyente */}
                    <CollapsibleSection title="Política de Expiración (Cloud)" defaultExpanded showToggle={false}>
                        <div className="space-y-6 py-4">
                            <div className="flex flex-col gap-4">
                                <Checkbox
                                    label="Nunca expirar"
                                    description="La base de conocimiento se conservará indefinidamente en OpenAI."
                                    checked={isPolicyNever}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            const updates = { expirationPolicy: 'never' as any };
                                            onUpdate(updates);
                                            onSave(updates);
                                        }
                                    }}
                                />

                                <div className="pl-6 border-l-2 border-subtle space-y-3">
                                    <Checkbox
                                        label="Expirar por inactividad"
                                        description="Eliminar automáticamente si no hay interacción con el asistente."
                                        checked={!isPolicyNever}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                const updates = {
                                                    expirationPolicy: 'after_days' as any,
                                                    expirationDays: store.expirationDays || 30
                                                };
                                                onUpdate(updates);
                                                onSave(updates);
                                            }
                                        }}
                                    />

                                    {!isPolicyNever && (
                                        <div className="flex items-center gap-3 mt-4 ml-6">
                                            <input
                                                type="number"
                                                min="1"
                                                max="365"
                                                className="bg-elevated border border-subtle rounded px-3 py-1.5 text-sm text-primary w-24 focus:border-accent outline-none"
                                                value={store.expirationDays || 30}
                                                onChange={(e) => onUpdate({ expirationDays: parseInt(e.target.value) || 30 })}
                                                onBlur={() => onSave()}
                                            />
                                            <span className="text-sm text-secondary">días tras el último uso</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {store.expiresAt && !isPolicyNever && (
                                <div className="mt-4 p-3 bg-accent/5 rounded-lg border border-accent/10 flex items-center gap-3">
                                    <Timer size={16} className="text-accent" />
                                    <span className="text-xs text-secondary">
                                        Fecha próxima de eliminación estimada: <strong>{formatDate(store.expiresAt)}</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Asistentes Vinculados" defaultExpanded showToggle={false}>
                        <div className="space-y-4 py-2">
                            <div className="flex flex-wrap gap-2">
                                {consumingAssistants.length === 0 ? (
                                    <div className="text-sm text-muted italic py-2">
                                        Ningún asistente está usando esta base de conocimiento actualmente.
                                    </div>
                                ) : (
                                    consumingAssistants.map(assistant => (
                                        <button
                                            key={assistant.id}
                                            onClick={() => handleOpenAssistant(assistant.id, assistant.name)}
                                            className="flex items-center gap-2 px-3 py-2 bg-elevated border border-subtle rounded-lg hover:border-accent/50 transition-all text-sm group"
                                        >
                                            <Zap size={14} className="text-accent fill-accent/20" />
                                            <span className="text-primary font-medium">{assistant.name}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleCreateAssistant}
                                className="w-full flex items-center justify-center gap-2 border-dashed h-10"
                            >
                                <Plus size={14} />
                                Crear y vincular nuevo asistente OpenAI
                            </Button>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Archivos en OpenAI storage" defaultExpanded showToggle={false}>
                        <VectorStoreFilesSection
                            vectorStoreId={store.id}
                            accountId={accountId}
                            onFileCountChange={(count) => {
                                // Sincronizar localmente si cambia el conteo
                                if (count !== (store.fileCounts as any)?.total) {
                                    onUpdate({ fileCount: count });
                                }
                            }}
                        />
                    </CollapsibleSection>

                    <VectorStoreDiagnosticSection
                        vectorStoreId={store.id}
                        accountId={accountId}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-subtle bg-surface flex items-center justify-between">
                <button
                    onClick={handleCopyConfig}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary hover:text-primary hover:bg-elevated rounded transition-all"
                >
                    <Copy size={16} />
                    <span>Copiar Manifiesto Cloud</span>
                </button>
                <DoubleConfirmationDeleteButton
                    onConfirm={onDelete}
                    size={16}
                />
            </div>
        </div>
    );
}

