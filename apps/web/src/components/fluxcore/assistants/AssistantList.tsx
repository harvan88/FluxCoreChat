import { Bot, Zap, Check, X, Share2, Download, RotateCcw } from 'lucide-react';
import { DoubleConfirmationDeleteButton } from '../../ui';
import { OpenAIIcon } from '../../../lib/icon-library';
import { formatDate, formatSize } from '../../../lib/fluxcore';
import { CollectionView, StatusBadge } from '../shared';
import type { CollectionColumn } from '../shared/CollectionView';
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
 * AssistantList - Uses CollectionView for unified design
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
    const columns: CollectionColumn<Assistant>[] = [
        {
            id: 'name',
            header: 'Nombre',
            accessor: (row) => (
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        {row.runtime === 'openai' ? (
                            <OpenAIIcon size={16} className="text-primary" />
                        ) : (
                            <Bot size={16} className="text-accent" />
                        )}
                    </div>
                    {row.status === 'active' && (
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Asistente activo" />
                    )}
                    <span className="font-medium text-primary truncate">{row.name}</span>
                </div>
            ),
        },
        {
            id: 'instructions',
            header: 'Instrucciones',
            hideBelow: 'md',
            accessor: (row) => (
                <span className="text-muted text-xs">
                    {(row.instructionIds || []).length > 0
                        ? ((row.instructionIds || []).slice(0, 1).map(id => instructions.find(i => i.id === id)?.name || 'Desconocido').join(', '))
                        : '-'}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            accessor: (row) => <StatusBadge status={row.status} />,
        },
        {
            id: 'updatedAt',
            header: 'Última modificación',
            hideBelow: 'lg',
            accessor: (row) => (
                <span className="text-secondary text-sm">
                    {formatDate(row.updatedAt)} {row.lastModifiedBy}
                </span>
            ),
        },
        {
            id: 'size',
            header: 'Tamaño',
            hideBelow: 'lg',
            accessor: (row) => (
                <span className="text-secondary text-sm">
                    {formatSize(row.sizeBytes)} - {row.tokensUsed || 0} tokens
                </span>
            ),
        },
    ];

    return (
        <CollectionView<Assistant>
            icon={Bot}
            title="Asistentes"
            createLabel="Nuevo asistente"
            onCreate={onCreate}
            data={assistants}
            getRowKey={(row) => row.id}
            columns={columns}
            loading={loading}
            onRowClick={onSelect}
            emptyDescription="Crea tu primer asistente para comenzar"
            renderActions={(row) => (
                <>
                    <button className="p-1 hover:bg-elevated rounded" onClick={(e) => e.stopPropagation()}>
                        <Share2 size={14} className="text-muted flex-shrink-0" />
                    </button>
                    <button className="p-1 hover:bg-elevated rounded" onClick={(e) => e.stopPropagation()}>
                        <Download size={14} className="text-muted flex-shrink-0" />
                    </button>
                    <button className="p-1 hover:bg-elevated rounded" onClick={(e) => e.stopPropagation()}>
                        <RotateCcw size={14} className="text-muted flex-shrink-0" />
                    </button>
                    {row.status !== 'active' && (
                        activateConfirm === row.id ? (
                            <>
                                <button className="p-1 hover:bg-elevated rounded" title="Activar ahora" onClick={(e) => { e.stopPropagation(); onActivate(row.id); }}>
                                    <Check size={14} className="text-green-400 flex-shrink-0" />
                                </button>
                                <button className="p-1 hover:bg-elevated rounded" title="Cancelar" onClick={(e) => { e.stopPropagation(); setActivateConfirm(null); }}>
                                    <X size={14} className="text-muted flex-shrink-0" />
                                </button>
                            </>
                        ) : (
                            <button className="p-1 hover:bg-elevated rounded" title="Activar" onClick={(e) => { e.stopPropagation(); setActivateConfirm(row.id); }}>
                                <Zap size={14} className="text-muted hover:text-green-400 flex-shrink-0" />
                            </button>
                        )
                    )}
                    <DoubleConfirmationDeleteButton onConfirm={() => onDelete(row.id)} size={14} />
                </>
            )}
        />
    );
}

export default AssistantList;
