import { Database, Share2 } from 'lucide-react';
import { DoubleConfirmationDeleteButton } from '../../ui';
import { OpenAIIcon } from '../../../lib/icon-library';
import type { VectorStore } from '../../../types/fluxcore';
import { formatDate, formatSize } from '../../../lib/fluxcore';
import { CollectionView, StatusBadge, EntityActions } from '../shared';
import type { CollectionColumn } from '../shared/CollectionView';

interface VectorStoreListProps {
    stores: VectorStore[];
    loading: boolean;
    onCreate: () => void;
    onSelect: (store: VectorStore) => void;
    onDelete: (id: string) => void;
}

const columns: CollectionColumn<VectorStore>[] = [
    {
        id: 'name',
        header: 'Nombre',
        accessor: (row) => (
            <div className="flex items-center gap-2 min-w-0">
                <Database size={16} className="text-accent flex-shrink-0" />
                {row.backend === 'openai' && (
                    <span className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-medium" title="Vector Store OpenAI">
                        <OpenAIIcon size={14} className="text-accent" />
                        OpenAI
                    </span>
                )}
                <span className="font-medium text-primary truncate">{row.name}</span>
            </div>
        ),
    },
    {
        id: 'assistant',
        header: 'Asistente',
        hideBelow: 'md',
        accessor: () => <span className="text-secondary">-</span>,
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
                {formatDate(row.updatedAt)}
                {row.lastModifiedBy && ` ${row.lastModifiedBy}`}
            </span>
        ),
    },
    {
        id: 'size',
        header: 'Tamaño',
        hideBelow: 'lg',
        accessor: (row) => <span className="text-secondary text-sm">{formatSize(row.sizeBytes)}</span>,
    },
    {
        id: 'expires',
        header: 'Expira',
        hideBelow: 'lg',
        accessor: (row) => (
            <span className="text-secondary text-sm">
                {row.expiresAt ? formatDate(row.expiresAt) : 'Nunca'}
            </span>
        ),
    },
];

export function VectorStoreList({ stores, loading, onCreate, onSelect, onDelete }: VectorStoreListProps) {
    return (
        <CollectionView<VectorStore>
            icon={Database}
            title="Base de conocimiento"
            createLabel="Nuevo vector store"
            onCreate={onCreate}
            data={stores}
            getRowKey={(row) => row.id}
            columns={columns}
            loading={loading}
            onRowClick={onSelect}
            emptyDescription="Crea un vector store para almacenar conocimiento para tus asistentes"
            renderMobileActions={(row) => (
                <>
                    <button className="p-1 hover:bg-elevated rounded" title="Compartir" onClick={(e) => e.stopPropagation()}>
                        <Share2 size={16} className="text-muted" />
                    </button>
                    <DoubleConfirmationDeleteButton onConfirm={() => onDelete(row.id)} size={16} />
                </>
            )}
            renderActions={(row) => (
                <EntityActions
                    onShare={() => {}}
                    onRefresh={() => {}}
                    onDelete={() => onDelete(row.id)}
                    showDownload={false}
                />
            )}
        />
    );
}
