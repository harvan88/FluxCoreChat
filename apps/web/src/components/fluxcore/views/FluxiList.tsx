import { Zap, Bot, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { CollectionView, StatusBadge } from '../shared';
import type { CollectionColumn } from '../shared/CollectionView';

interface FluxiListProps {
    works: any[];
    loading: boolean;
    onSelect: (item: any) => void;
    onCreate?: () => void;
    title?: string;
    description?: string;
    type: 'proposed' | 'active' | 'history';
}

export function FluxiList({
    works,
    loading,
    onSelect,
    onCreate,
    title = 'Trabajos',
    description,
    type
}: FluxiListProps) {

    const columns: CollectionColumn<any>[] = [
        {
            id: 'id',
            header: 'Definición / ID',
            accessor: (row) => (
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${type === 'proposed' ? 'bg-accent/10 text-accent' : 'bg-primary/5 text-primary'
                        }`}>
                        {type === 'proposed' ? <Bot size={18} /> : <Zap size={18} />}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-primary truncate">
                            {row.workDefinitionId || 'Trabajo del Sistema'}
                        </span>
                        <span className="text-xs text-muted truncate font-mono">
                            {row.id.slice(0, 8)}...
                        </span>
                    </div>
                </div>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            accessor: (row) => (
                type === 'proposed' ? (
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full border border-accent/20">
                        Pendiente
                    </span>
                ) : (
                    <StatusBadge status={row.state} />
                )
            ),
        },
        {
            id: 'intent',
            header: type === 'proposed' ? 'Intención' : 'Detalles',
            accessor: (row) => (
                <span className="text-sm text-secondary truncate max-w-[200px] block">
                    {type === 'proposed' ? (row.intent || 'Sin intención explícita') : (
                        row.suspendedReason || row.cancelledReason || row.aggregateKey || '-'
                    )}
                </span>
            ),
            hideBelow: 'md'
        },
        {
            id: 'created',
            header: 'Creado',
            accessor: (row) => (
                <div className="text-xs text-muted flex items-center gap-1">
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true, locale: es })}
                </div>
            ),
            hideBelow: 'lg'
        },
        {
            id: 'confidence',
            header: 'Confianza',
            accessor: (row) => (
                type === 'proposed' && row.confidence ? (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${row.confidence > 0.8 ? 'text-green-600 bg-green-500/10 border-green-500/20' :
                        row.confidence > 0.5 ? 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' :
                            'text-red-500 bg-red-500/10 border-red-500/20'
                        }`}>
                        {(row.confidence * 100).toFixed(0)}%
                    </span>
                ) : (
                    <span className="text-xs text-muted">-</span>
                )
            ),
            hideBelow: 'lg'
        }
    ];

    // Filter columns if not applicable
    const activeColumns = columns.filter(col => {
        if (type !== 'proposed' && col.id === 'confidence') return false;
        return true;
    });

    return (
        <CollectionView<any>
            icon={type === 'proposed' ? Bot : Zap}
            title={title}
            createLabel="Nuevo Trabajo"
            onCreate={onCreate || (() => { })}
            data={works}
            getRowKey={(row) => row.id}
            columns={activeColumns}
            loading={loading}
            onRowClick={onSelect}
            emptyDescription={description || "No hay elementos en esta lista"}
            className="h-full bg-surface"
        />
    );
}
