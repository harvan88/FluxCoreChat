import { Bot, Plus, Zap, Check, X } from 'lucide-react';
import { Button } from '../../ui';
import { OpenAIIcon } from '../../../lib/icon-library';
import {
    StatusBadge,
    EntityActions,
    EmptyState,
    LoadingState
} from '../shared';
import { formatDate, formatSize } from '../../../lib/fluxcore';
import type { Assistant, Instruction } from '../../../types/fluxcore';

interface AssistantListProps {
    assistants: Assistant[];
    instructions: Instruction[];
    loading: boolean;
    onSelect: (assistant: Assistant) => void;
    onCreate: () => void;
    onActivate: (id: string) => void;
    onDelete: (id: string) => void;
    activateConfirm: string | null;
    setActivateConfirm: (id: string | null) => void;
}

/**
 * AssistantList - Componente de lista/tabla de asistentes
 */
export function AssistantList({
    assistants,
    instructions,
    loading,
    onSelect,
    onCreate,
    onActivate,
    onDelete,
    activateConfirm,
    setActivateConfirm,
}: AssistantListProps) {
    if (loading) {
        return <LoadingState message="Cargando asistentes..." />;
    }

    if (assistants.length === 0) {
        return (
            <EmptyState
                icon={<Bot size={48} />}
                title="No hay asistentes configurados"
                description="Crea tu primer asistente para comenzar a automatizar tus respuestas."
                actionLabel="Crear asistente"
                onAction={onCreate}
            />
        );
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header con botón crear */}
            <div className="flex items-center justify-end px-6 py-3">
                <Button variant="secondary" size="sm" onClick={onCreate}>
                    <Plus size={16} className="mr-1" />
                    Nuevo asistente
                </Button>
            </div>

            {/* Tabla */}
            <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-subtle text-left">
                            <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Nombre</th>
                            <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Instrucciones</th>
                            <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider text-center">Estado</th>
                            <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Última modificación</th>
                            <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Métricas</th>
                            <th className="px-4 py-3 text-xs font-medium text-muted sticky right-0 bg-background shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.1)]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                        {assistants.map((assistant) => (
                            <tr
                                key={assistant.id}
                                className="hover:bg-hover cursor-pointer group transition-colors"
                                onClick={() => onSelect(assistant)}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center">
                                            {assistant.runtime === 'openai' ? (
                                                <OpenAIIcon size={18} className="text-primary" />
                                            ) : (
                                                <Bot size={18} className="text-accent" />
                                            )}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-primary truncate">{assistant.name}</span>
                                                {assistant.status === 'active' && (
                                                    <span
                                                        className="w-2 h-2 rounded-full bg-success animate-pulse"
                                                        title="Asistente activo"
                                                    />
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted font-mono truncate">{assistant.id}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                    <span className="text-secondary text-sm">
                                        {(assistant.instructionIds || []).length > 0
                                            ? ((assistant.instructionIds || []).slice(0, 1).map(id => instructions.find(i => i.id === id)?.name || id).join(', '))
                                            : <span className="text-muted italic">Sin instrucciones</span>}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <StatusBadge status={assistant.status} />
                                </td>
                                <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                                    <div className="flex flex-col">
                                        <span>{formatDate(assistant.updatedAt)}</span>
                                        <span className="text-[10px] text-muted">{assistant.lastModifiedBy || 'Sistema'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                                    <div className="flex flex-col">
                                        <span>{formatSize(assistant.sizeBytes)}</span>
                                        <span className="text-[10px] text-muted">{assistant.tokensUsed || 0} tokens</span>
                                    </div>
                                </td>
                                <td className="px-4 py-1 sticky right-0 bg-background shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.1)] group-hover:bg-hover transition-colors">
                                    <div className="flex items-center justify-end gap-1">
                                        {assistant.status !== 'active' && (
                                            <div className="flex items-center">
                                                {activateConfirm === assistant.id ? (
                                                    <div className="flex items-center gap-1 bg-surface border border-success/30 rounded-md p-0.5">
                                                        <button
                                                            className="p-1 hover:bg-success/10 rounded text-success"
                                                            title="Confirmar activación"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onActivate(assistant.id);
                                                            }}
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            className="p-1 hover:bg-muted/10 rounded text-muted"
                                                            title="Cancelar"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActivateConfirm(null);
                                                            }}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="p-1.5 hover:bg-success/10 rounded-md text-muted hover:text-success transition-colors"
                                                        title="Activar como principal"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActivateConfirm(assistant.id);
                                                        }}
                                                    >
                                                        <Zap size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        <EntityActions
                                            onDelete={() => onDelete(assistant.id)}
                                            // Para mantener consistencia con la UI actual que tenía iconos vacíos para estas acciones
                                            onShare={() => { }}
                                            onDownload={() => { }}
                                            onRefresh={() => { }}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AssistantList;
