import { Share2, Download, RotateCcw } from 'lucide-react';
import { DoubleConfirmationDeleteButton } from '../../ui';

interface EntityActionsProps {
    onDelete?: () => void;
    onShare?: () => void;
    onDownload?: () => void;
    onRefresh?: () => void;
    className?: string;
    showShare?: boolean;
    showDownload?: boolean;
    showRefresh?: boolean;
}

/**
 * EntityActions - Acciones comunes para elementos de lista
 */
export function EntityActions({
    onDelete,
    onShare,
    onDownload,
    onRefresh,
    className = '',
    showShare = true,
    showDownload = true,
    showRefresh = true,
}: EntityActionsProps) {
    return (
        <div className={`flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity ${className}`}>
            {showShare && onShare && (
                <button
                    className="p-1 hover:bg-elevated rounded"
                    title="Compartir"
                    onClick={(e) => { e.stopPropagation(); onShare(); }}
                >
                    <Share2 size={16} className="text-muted flex-shrink-0" />
                </button>
            )}

            {showDownload && onDownload && (
                <button
                    className="p-1 hover:bg-elevated rounded"
                    title="Descargar"
                    onClick={(e) => { e.stopPropagation(); onDownload(); }}
                >
                    <Download size={16} className="text-muted flex-shrink-0" />
                </button>
            )}

            {showRefresh && onRefresh && (
                <button
                    className="p-1 hover:bg-elevated rounded"
                    title="Recargar"
                    onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                >
                    <RotateCcw size={16} className="text-muted flex-shrink-0" />
                </button>
            )}

            {onDelete && (
                <div onClick={(e) => e.stopPropagation()}>
                    <DoubleConfirmationDeleteButton
                        onConfirm={onDelete}
                        size={16}
                    />
                </div>
            )}
        </div>
    );
}

export default EntityActions;
