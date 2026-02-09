import { useMemo, useRef, useState } from 'react';
import { Copy, Plus, Loader2 } from 'lucide-react';
import { DoubleConfirmationDeleteButton, CollapsibleSection, Button } from '../../ui';
import { RAGConfigSection } from '../components/RAGConfigSection';
import { VectorStoreFilesSection } from '../components/VectorStoreFilesSection';
import { VectorStoreTestQuery } from './VectorStoreTestQuery';
import type { VectorStore } from '../../../types/fluxcore';
import { formatSize } from '../../../lib/fluxcore';
import { EditableName } from '../detail/EditableName';
import { useAssistants } from '../../../hooks/fluxcore/useAssistants';
import { useAuthStore } from '../../../store/authStore';

interface LocalVectorStoreDetailProps {
    store: VectorStore;
    accountId: string;
    onUpdate: (updates: Partial<VectorStore>) => void;
    onDelete: () => void;
    onSave: (updates?: Partial<VectorStore>) => void;
    isSaving: boolean;
    saveError: string | null;
    onOpenTab?: (tabId: string, title: string, data: any) => void;
}

export function LocalVectorStoreDetail({
    store,
    accountId,
    onUpdate,
    onDelete,
    onSave,
    isSaving,
    saveError,
    onOpenTab
}: LocalVectorStoreDetailProps) {
    const { token } = useAuthStore();
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [fileStats, setFileStats] = useState({
        count: store.fileCount ?? 0,
        sizeBytes: store.sizeBytes ?? 0
    });
    const { assistants, loading: assistantsLoading } = useAssistants(accountId);

    const connectedAssistants = useMemo(() =>
        assistants.filter(a => (a.vectorStoreIds || []).includes(store.id)),
        [assistants, store.id]
    );

    const handleOpenAssistant = (assistantId: string, name: string) => {
        if (!onOpenTab) return;
        onOpenTab(assistantId, name, {
            type: 'assistant',
            assistantId,
        });
    };

    const handleCreateAssistant = async () => {
        const payload = {
            runtime: 'local' as const,
            name: 'Nuevo asistente local',
            vectorStoreIds: [store.id],
            accountId,
        };

        if (onOpenTab) {
            onOpenTab('new-assistant', 'Nuevo asistente', {
                type: 'assistant',
                view: 'config',
                initialData: payload,
            });
        }

        await onSave();
    };

    const [copyingSnapshot, setCopyingSnapshot] = useState(false);

    const handleCopyConfig = async () => {
        setCopyingSnapshot(true);
        try {
            const response = await fetch(
                `/api/fluxcore/runtime/vector-store-snapshot/${store.id}?accountId=${accountId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            if (json.success && json.data) {
                await navigator.clipboard.writeText(JSON.stringify(json.data, null, 2));
            } else {
                throw new Error(json.message || 'Snapshot failed');
            }
        } catch (err) {
            console.error('Error fetching snapshot:', err);
            const fallback = { vectorStore: store, _source: 'ui_fallback' };
            await navigator.clipboard.writeText(JSON.stringify(fallback, null, 2));
        } finally {
            setCopyingSnapshot(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-subtle flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div ref={nameInputRef as any}>
                        <EditableName
                            value={store.name}
                            onChange={(value) => onUpdate({ name: value })}
                            onSave={(value) => {
                                const trimmed = value.trim();
                                onUpdate({ name: trimmed });
                                onSave({ name: trimmed });
                            }}
                            placeholder="Nombre de la base local"
                        />
                    </div>
                    <div className="px-10">
                        <input
                            type="text"
                            className="text-sm text-secondary bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0 italic"
                            value={store.description || ''}
                            onChange={(e) => onUpdate({ description: e.target.value })}
                            onBlur={(e) => {
                                const value = e.target.value.trim();
                                onUpdate({ description: value });
                                onSave({ description: value });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                }
                            }}
                            placeholder="Agregar descripción..."
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isSaving && <span className="text-xs text-muted animate-pulse">Guardando...</span>}
                    {saveError && <span className="text-xs text-red-500">{saveError}</span>}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* ID Info */}
                    <div className="flex items-center justify-between group">
                        <div className="text-sm">
                            <span className="text-muted">Identificador: </span>
                            <span className="text-secondary font-mono">{store.id}</span>
                        </div>
                    </div>

                    <div className="space-y-3 py-4 border-b border-subtle">
                        <div>
                            <p className="text-xs text-muted tracking-wide">Detalles</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm text-muted">Tamaño total</p>
                                <p className="text-sm font-medium text-primary">{formatSize(fileStats.sizeBytes)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted">Archivos</p>
                                <p className="text-sm font-medium text-primary">{fileStats.count}</p>
                            </div>
                        </div>
                    </div>

                    <CollapsibleSection title="Archivos en la base de datos" defaultExpanded>
                        <VectorStoreFilesSection
                            vectorStoreId={store.id}
                            accountId={accountId}
                            onFileCountChange={(count) => onUpdate({ fileCount: count })}
                            onFileStatsChange={({ count, sizeBytes }: { count: number; sizeBytes: number }) => {
                                setFileStats({ count, sizeBytes });
                                onUpdate({ fileCount: count, sizeBytes });
                            }}
                        />
                    </CollapsibleSection>

                    <div className="space-y-4 pb-4 border-b border-subtle">
                        <div>
                            <p className="text-xs text-muted tracking-wide">Configuración RAG (Local)</p>
                            <p className="text-sm text-secondary">Fragmentación de texto · Modelo de embeddings · Recuperación</p>
                        </div>
                        <RAGConfigSection
                            vectorStoreId={store.id}
                            accountId={accountId}
                        />
                        <div className="pt-4 border-t border-dashed border-subtle">
                            <VectorStoreTestQuery
                                vectorStoreId={store.id}
                                accountId={accountId}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 py-4 border-b border-subtle">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs text-muted tracking-wide">Asistentes conectados</p>
                                <p className="text-sm text-secondary">Asistentes locales que consumen esta base</p>
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleCreateAssistant}
                            >
                                <Plus size={14} className="mr-1" />
                                Crear asistente
                            </Button>
                        </div>
                        {assistantsLoading ? (
                            <p className="text-sm text-muted">Cargando asistentes...</p>
                        ) : connectedAssistants.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-subtle bg-elevated/30 px-4 py-3 text-sm text-secondary">
                                Ningún asistente utiliza esta base de conocimiento.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {connectedAssistants.map((assistant) => (
                                    <button
                                        type="button"
                                        key={assistant.id}
                                        onClick={() => handleOpenAssistant(assistant.id, assistant.name)}
                                        className="w-full text-left rounded-lg border border-subtle px-4 py-2 transition-colors hover:border-accent/60 hover:bg-elevated/40"
                                    >
                                        <p className="text-sm font-medium text-primary">{assistant.name}</p>
                                        <p className="text-xs text-muted">Estado: {assistant.status}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-subtle bg-surface flex items-center justify-between">
                <button
                    onClick={handleCopyConfig}
                    disabled={copyingSnapshot}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary hover:text-primary hover:bg-elevated rounded transition-all disabled:opacity-50"
                >
                    {copyingSnapshot ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                    <span>{copyingSnapshot ? 'Cargando desde DB...' : 'Copiar Configuración JSON'}</span>
                </button>
                <DoubleConfirmationDeleteButton onConfirm={onDelete} size={16} />
            </div>
        </div>
    );
}
