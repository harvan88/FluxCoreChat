import { Bot, Plus, Zap, Check, X, Share2, Download, RotateCcw } from 'lucide-react';
import { Button } from '../../ui';
import { OpenAIIcon } from '../../../lib/icon-library';
import { DoubleConfirmationDeleteButton } from '../../ui/DoubleConfirmationDeleteButton';
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
 * AssistantList - Restaurada estética original exacta
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
        return (
            <div className="flex items-center justify-center h-64 text-muted">
                Cargando asistentes...
            </div>
        );
    }

    if (assistants.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <Bot size={48} className="text-muted mb-4" />
                <h3 className="text-lg font-medium text-primary mb-2">
                    No hay asistentes configurados
                </h3>
                <p className="text-secondary mb-4">
                    Crea tu primer asistente para comenzar
                </p>
                <Button onClick={onCreate}>
                    <Plus size={16} className="mr-1" />
                    Crear asistente
                </Button>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Activo</span>;
            case 'disabled':
                return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Desactivado</span>;
            default:
                return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Borrador</span>;
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="flex items-center justify-end px-6 py-3">
                <Button variant="secondary" size="sm" onClick={onCreate}>
                    <Plus size={16} className="mr-1" />
                    Nuevo asistente
                </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto px-6">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-subtle text-left">
                            <th className="px-4 py-3 text-xs font-medium text-muted">Nombre</th>
                            <th className="px-4 py-3 text-xs font-medium text-muted hidden md:table-cell">Instrucciones</th>
                            <th className="px-4 py-3 text-xs font-medium text-muted">Estado</th>
                            <th className="px-4 py-3 text-xs font-medium text-muted hidden lg:table-cell">Última modificación</th>
                            <th className="px-4 py-3 text-xs font-medium text-muted hidden lg:table-cell">Tamaño</th>
                            <th className="px-4 py-3 text-xs font-medium text-muted sticky right-0 bg-surface"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {assistants.map((assistant) => (
                            <tr
                                key={assistant.id}
                                className="border-b border-subtle hover:bg-hover cursor-pointer group"
                                onClick={() => onSelect(assistant)}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                                            {assistant.runtime === 'openai' ? (
                                                <OpenAIIcon size={16} className="text-primary" />
                                            ) : (
                                                <Bot size={16} className="text-accent" />
                                            )}
                                        </div>
                                        {assistant.status === 'active' && (
                                            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Asistente activo" />
                                        )}
                                        <span className="font-medium text-primary">{assistant.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                    <span className="text-muted text-xs">
                                        {(assistant.instructionIds || []).length > 0
                                            ? ((assistant.instructionIds || []).slice(0, 1).map(id => instructions.find(i => i.id === id)?.name || 'Desconocido').join(', '))
                                            : '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{getStatusBadge(assistant.status)}</td>
                                <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                                    {formatDate(assistant.updatedAt)} {assistant.lastModifiedBy}
                                </td>
                                <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                                    {formatSize(assistant.sizeBytes)} - {assistant.tokensUsed || 0} tokens
                                </td>
                                <td className="px-4 py-3 sticky right-0 bg-surface group-hover:bg-hover">
                                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1 hover:bg-active rounded" onClick={(e) => e.stopPropagation()}><Share2 size={14} className="text-muted flex-shrink-0" /></button>
                                        <button className="p-1 hover:bg-active rounded" onClick={(e) => e.stopPropagation()}><Download size={14} className="text-muted flex-shrink-0" /></button>
                                        <button className="p-1 hover:bg-active rounded" onClick={(e) => e.stopPropagation()}><RotateCcw size={14} className="text-muted flex-shrink-0" /></button>
                                        {assistant.status !== 'active' && (
                                            activateConfirm === assistant.id ? (
                                                <>
                                                    <button className="p-1 hover:bg-active rounded" title="Activar ahora" onClick={(e) => { e.stopPropagation(); onActivate(assistant.id); }}>
                                                        <Check size={14} className="text-success flex-shrink-0" />
                                                    </button>
                                                    <button className="p-1 hover:bg-active rounded" title="Cancelar" onClick={(e) => { e.stopPropagation(); setActivateConfirm(null); }}>
                                                        <X size={14} className="text-muted flex-shrink-0" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button className="p-1 hover:bg-active rounded" title="Activar" onClick={(e) => { e.stopPropagation(); setActivateConfirm(assistant.id); }}>
                                                    <Zap size={14} className="text-muted hover:text-success flex-shrink-0" />
                                                </button>
                                            )
                                        )}
                                        <DoubleConfirmationDeleteButton onConfirm={() => onDelete(assistant.id)} size={14} />
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
