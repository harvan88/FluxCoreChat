import { useRef } from 'react';
import { Pencil, Copy } from 'lucide-react';
import { Button, DoubleConfirmationDeleteButton, CollapsibleSection } from '../../ui';
import { RAGConfigSection } from '../components/RAGConfigSection';
import { VectorStoreFilesSection } from '../components/VectorStoreFilesSection';
import { VectorStoreDiagnosticSection } from '../components/VectorStoreDiagnosticSection';
import type { VectorStore } from '../../../types/fluxcore';
import { formatDate, formatSize } from '../../../lib/fluxcore';

interface LocalVectorStoreDetailProps {
    store: VectorStore;
    accountId: string;
    onUpdate: (updates: Partial<VectorStore>) => void;
    onDelete: () => void;
    onSave: () => void;
    isSaving: boolean;
    saveError: string | null;
}

export function LocalVectorStoreDetail({
    store,
    accountId,
    onUpdate,
    onDelete,
    onSave,
    isSaving,
    saveError
}: LocalVectorStoreDetailProps) {
    const nameInputRef = useRef<HTMLInputElement>(null);

    const handleCopyConfig = async () => {
        const config = { vectorStore: store };
        await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    };

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-subtle flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 px-3 py-2 rounded border border-transparent hover:border-subtle focus-within:border-accent transition-colors bg-transparent">
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
                            onBlur={(e) => onUpdate({ name: e.target.value.trim() })}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                            placeholder="Nombre de la base local"
                        />
                    </div>
                    <div className="px-10">
                        <input
                            type="text"
                            className="text-sm text-secondary bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0 italic"
                            value={store.description || ''}
                            onChange={(e) => onUpdate({ description: e.target.value })}
                            onBlur={(e) => onUpdate({ description: e.target.value.trim() })}
                            placeholder="Agregar descripción..."
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isSaving && <span className="text-xs text-muted animate-pulse">Guardando...</span>}
                    {saveError && <span className="text-xs text-red-500">{saveError}</span>}
                    <Button size="sm" onClick={onSave} disabled={isSaving}>Guardar</Button>
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

                    <CollapsibleSection title="Detalles" defaultExpanded showToggle={false}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase">Tamaño total</label>
                                <p className="text-sm font-medium text-primary">{formatSize(store.sizeBytes)}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase">Costo</label>
                                <p className="text-sm font-medium text-primary">Gratis (Local)</p>
                            </div>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Configuración de Expiración" defaultExpanded>
                        <div className="space-y-4 py-2">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="text-sm text-secondary">Política de expiración</label>
                                    <select
                                        className="bg-elevated border border-subtle rounded px-3 py-2 text-sm text-primary w-full"
                                        value={store.expirationPolicy}
                                        onChange={(e) => onUpdate({ expirationPolicy: e.target.value as any })}
                                    >
                                        <option value="never">Nunca expira</option>
                                        <option value="days_after_creation">Días después de la creación</option>
                                        <option value="days_after_last_use">Días después del último uso</option>
                                    </select>
                                </div>
                                {store.expirationPolicy !== 'never' && (
                                    <div className="flex flex-col gap-2 w-32">
                                        <label className="text-sm text-secondary">Días</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            className="bg-elevated border border-subtle rounded px-3 py-2 text-sm text-primary w-full"
                                            value={store.expirationDays || 30}
                                            onChange={(e) => onUpdate({ expirationDays: parseInt(e.target.value) || 30 })}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-muted pt-1">
                                Expiración programada: <span className="text-secondary">{store.expiresAt ? formatDate(store.expiresAt) : 'Sin límite'}</span>
                            </div>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Archivos en la base de datos" defaultExpanded>
                        <VectorStoreFilesSection
                            vectorStoreId={store.id}
                            accountId={accountId}
                            onFileCountChange={(count) => onUpdate({ fileCount: count })}
                        />
                    </CollapsibleSection>

                    <VectorStoreDiagnosticSection
                        vectorStoreId={store.id}
                        accountId={accountId}
                    />

                    <CollapsibleSection title="Configuración RAG (Local)" defaultExpanded={false}>
                        <RAGConfigSection
                            vectorStoreId={store.id}
                            accountId={accountId}
                        />
                    </CollapsibleSection>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-subtle bg-surface flex items-center justify-between">
                <button
                    onClick={handleCopyConfig}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary hover:text-primary hover:bg-elevated rounded transition-all"
                >
                    <Copy size={16} />
                    <span>Copiar Configuración JSON</span>
                </button>
                <DoubleConfirmationDeleteButton onConfirm={onDelete} size={16} />
            </div>
        </div>
    );
}
