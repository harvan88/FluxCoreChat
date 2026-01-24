import { Database, Plus, Share2, RotateCcw } from 'lucide-react';
import { Button, Badge, DoubleConfirmationDeleteButton } from '../../ui';
import { OpenAIIcon } from '../../../lib/icon-library';
import type { VectorStore } from '../../../types/fluxcore';
import { formatDate, formatSize } from '../../../lib/fluxcore';

interface VectorStoreListProps {
    stores: VectorStore[];
    loading: boolean;
    onCreate: () => void;
    onSelect: (store: VectorStore) => void;
    onDelete: (id: string) => void;
}

const renderStatusBadge = (status: string) => {
    switch (status) {
        case 'active':
            return <Badge variant="success">Activo</Badge>;
        case 'expired':
            return <Badge variant="error">Expirado</Badge>;
        default:
            return <Badge variant="info">Borrador</Badge>;
    }
};

export function VectorStoreList({ stores, loading, onCreate, onSelect, onDelete }: VectorStoreListProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-muted">
                Cargando bases de conocimiento...
            </div>
        );
    }

    if (stores.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Database size={48} className="text-muted mb-4" />
                <h3 className="text-lg font-medium text-primary mb-2">No hay bases de conocimiento</h3>
                <p className="text-secondary mb-4">Crea un vector store para almacenar conocimiento para tus asistentes</p>
                <Button onClick={onCreate}>
                    <Plus size={16} className="mr-1" />
                    Crear vector store
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-surface rounded-lg border border-subtle overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-subtle">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Nombre de vector</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden md:table-cell">Asistente</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Última modificación</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Tamaño</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Expira</th>
                        <th className="px-4 py-3 sticky right-0 bg-surface"></th>
                    </tr>
                </thead>
                <tbody>
                    {stores.map((store) => (
                        <tr
                            key={store.id}
                            className="group border-b border-subtle last:border-b-0 hover:bg-hover cursor-pointer"
                            onClick={() => onSelect(store)}
                        >
                            <td className="px-4 py-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Database size={16} className="text-accent flex-shrink-0 min-w-[16px] min-h-[16px]" />
                                        {store.backend === 'openai' && (
                                            <span className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-medium" title="Vector Store OpenAI">
                                                <OpenAIIcon size={14} className="text-accent" />
                                                OpenAI
                                            </span>
                                        )}
                                        <span className="font-medium text-primary truncate">{store.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 md:hidden">
                                        <button className="p-1 hover:bg-elevated rounded" title="Compartir" onClick={(e) => e.stopPropagation()}>
                                            <Share2 size={16} className="text-muted" />
                                        </button>
                                        <DoubleConfirmationDeleteButton onConfirm={() => onDelete(store.id)} size={16} />
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-secondary hidden md:table-cell">-</td>
                            <td className="px-4 py-3">{renderStatusBadge(store.status)}</td>
                            <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                                {formatDate(store.updatedAt)}
                                {store.lastModifiedBy && ` ${store.lastModifiedBy}`}
                            </td>
                            <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">{formatSize(store.sizeBytes)}</td>
                            <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                                {store.expiresAt ? formatDate(store.expiresAt) : 'Nunca'}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell sticky right-0 bg-surface group-hover:bg-hover">
                                <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1 hover:bg-elevated rounded" title="Compartir" onClick={(e) => e.stopPropagation()}>
                                        <Share2 size={16} className="text-muted flex-shrink-0" />
                                    </button>
                                    <button className="p-1 hover:bg-elevated rounded" title="Recargar" onClick={(e) => e.stopPropagation()}>
                                        <RotateCcw size={16} className="text-muted flex-shrink-0" />
                                    </button>
                                    <DoubleConfirmationDeleteButton onConfirm={() => onDelete(store.id)} size={16} />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
