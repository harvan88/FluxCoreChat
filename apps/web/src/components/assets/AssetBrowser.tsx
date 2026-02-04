/**
 * AssetBrowser Component
 * 
 * Panel para explorar y gestionar assets de una cuenta.
 * Soporta:
 * - Búsqueda y filtros
 * - Vista de grid/lista
 * - Preview de assets
 * - Acciones (descargar, eliminar)
 * 
 * Pertenece a CHAT CORE, no a FluxCore.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Grid,
    List,
    Download,
    Trash2,
    RefreshCw,
    Filter,
    Image as ImageIcon,
    FileText,
    Film,
    Music,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { AssetPreview } from '../chat/AssetPreview';
import { AssetUploader } from '../chat/AssetUploader';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';

// ════════════════════════════════════════════════════════════════════════════
// Tipos
// ════════════════════════════════════════════════════════════════════════════

interface Asset {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
    scope: string;
    createdAt: string;
}

interface AssetBrowserProps {
    accountId: string;
    onSelectAsset?: (asset: Asset) => void;
    selectionMode?: boolean;
    className?: string;
}

type ViewMode = 'grid' | 'list';
type ScopeFilter = 'all' | 'message_attachment' | 'template_asset' | 'execution_plan' | 'shared_internal';
type StatusFilter = 'all' | 'ready' | 'pending' | 'archived';

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

function getAssetIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType.startsWith('video/')) return Film;
    if (mimeType.startsWith('audio/')) return Music;
    return FileText;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const scopeLabels: Record<string, string> = {
    message_attachment: 'Adjunto',
    template_asset: 'Plantilla',
    execution_plan: 'Plan',
    shared_internal: 'Interno',
    profile_avatar: 'Avatar',
    workspace_asset: 'Workspace',
};

const statusLabels: Record<string, string> = {
    ready: 'Listo',
    pending: 'Pendiente',
    archived: 'Archivado',
    deleted: 'Eliminado',
};

const statusColors: Record<string, string> = {
    ready: 'bg-green-500/10 text-green-500',
    pending: 'bg-yellow-500/10 text-yellow-500',
    archived: 'bg-gray-500/10 text-gray-500',
    deleted: 'bg-red-500/10 text-red-500',
};

// ════════════════════════════════════════════════════════════════════════════
// Componente
// ════════════════════════════════════════════════════════════════════════════

export function AssetBrowser({
    accountId,
    onSelectAsset,
    selectionMode = false,
    className,
}: AssetBrowserProps) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);

    // Filtros
    const [search, setSearch] = useState('');
    const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ready');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [showUploader, setShowUploader] = useState(false);
    const currentUserId = useAuthStore((state) => state.user?.id ?? null);

    // Paginación
    const [offset, setOffset] = useState(0);
    const limit = 20;

    // Cargar assets
    const loadAssets = useCallback(async (resetOffset = false) => {
        setLoading(true);
        setError(null);

        if (resetOffset) {
            setOffset(0);
        }

        try {
            const response = await api.searchAssets({
                accountId,
                scope: scopeFilter === 'all' ? undefined : scopeFilter,
                status: statusFilter === 'all' ? undefined : statusFilter,
                search: search || undefined,
                limit,
                offset: resetOffset ? 0 : offset,
            });

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to load assets');
            }

            setAssets(response.data.assets);
            setTotal(response.data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading assets');
        } finally {
            setLoading(false);
        }
    }, [accountId, scopeFilter, statusFilter, search, offset]);

    // Cargar al montar y cuando cambian filtros
    useEffect(() => {
        loadAssets(true);
    }, [scopeFilter, statusFilter]);

    // Buscar con debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            loadAssets(true);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Eliminar asset
    const handleDelete = useCallback(async (asset: Asset) => {
        if (!confirm(`¿Eliminar "${asset.name}"?`)) return;

        try {
            const response = await api.deleteAsset(asset.id, accountId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to delete asset');
            }
            loadAssets();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error deleting asset');
        }
    }, [accountId, loadAssets]);

    // Descargar asset
    const handleDownload = useCallback(async (asset: Asset) => {
        if (!currentUserId) {
            alert('No hay sesión activa. Inicia sesión de nuevo.');
            return;
        }
        try {
            const response = await api.signAssetUrl(asset.id, accountId, {
                actorId: currentUserId,
                actorType: 'user',
                action: 'download',
                channel: 'web',
                disposition: 'attachment',
            });
            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to get download URL');
            }

            const link = document.createElement('a');
            link.href = response.data.url;
            link.download = asset.name;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error downloading asset');
        }
    }, [accountId, currentUserId]);

    // Renderizar asset en grid
    const renderGridItem = (asset: Asset) => {
        const Icon = getAssetIcon(asset.mimeType);
        const isImage = asset.mimeType.startsWith('image/');

        return (
            <div
                key={asset.id}
                className={clsx(
                    'group relative bg-surface border border-subtle rounded-lg overflow-hidden',
                    'hover:border-accent/50 transition-colors',
                    selectionMode && 'cursor-pointer'
                )}
                onClick={() => selectionMode && onSelectAsset?.(asset)}
            >
                {/* Preview */}
                <div className="aspect-square bg-subtle flex items-center justify-center">
                    {isImage ? (
                        <AssetPreview
                            assetId={asset.id}
                            accountId={accountId}
                            name={asset.name}
                            mimeType={asset.mimeType}
                            sizeBytes={asset.sizeBytes}
                            compact
                            showDownload={false}
                        />
                    ) : (
                        <Icon size={40} className="text-muted" />
                    )}
                </div>

                {/* Info */}
                <div className="p-2">
                    <p className="text-sm font-medium text-primary truncate" title={asset.name}>
                        {asset.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted">{formatBytes(asset.sizeBytes)}</span>
                        <span className={clsx('text-xs px-1.5 py-0.5 rounded', statusColors[asset.status])}>
                            {statusLabels[asset.status] || asset.status}
                        </span>
                    </div>
                </div>

                {/* Actions overlay */}
                {!selectionMode && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(asset); }}
                            className="p-1.5 bg-black/50 rounded hover:bg-black/70"
                            title="Descargar"
                        >
                            <Download size={14} className="text-white" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(asset); }}
                            className="p-1.5 bg-black/50 rounded hover:bg-red-500"
                            title="Eliminar"
                        >
                            <Trash2 size={14} className="text-white" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Renderizar asset en lista
    const renderListItem = (asset: Asset) => {
        const Icon = getAssetIcon(asset.mimeType);

        return (
            <div
                key={asset.id}
                className={clsx(
                    'flex items-center gap-3 p-3 bg-surface border border-subtle rounded-lg',
                    'hover:border-accent/50 transition-colors',
                    selectionMode && 'cursor-pointer'
                )}
                onClick={() => selectionMode && onSelectAsset?.(asset)}
            >
                <div className="w-10 h-10 flex items-center justify-center bg-subtle rounded">
                    <Icon size={20} className="text-muted" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{asset.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{formatBytes(asset.sizeBytes)}</span>
                        <span>•</span>
                        <span>{scopeLabels[asset.scope] || asset.scope}</span>
                        <span>•</span>
                        <span>{formatDate(asset.createdAt)}</span>
                    </div>
                </div>

                <span className={clsx('text-xs px-2 py-1 rounded', statusColors[asset.status])}>
                    {statusLabels[asset.status] || asset.status}
                </span>

                {!selectionMode && (
                    <div className="flex gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(asset); }}
                            className="p-2 hover:bg-hover rounded"
                            title="Descargar"
                        >
                            <Download size={16} className="text-muted" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(asset); }}
                            className="p-2 hover:bg-hover rounded text-red-500"
                            title="Eliminar"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={clsx('flex flex-col h-full', className)}>
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-subtle">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-primary">Assets</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowUploader(!showUploader)}
                            className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
                        >
                            Subir archivo
                        </button>
                        <button
                            onClick={() => loadAssets()}
                            className="p-2 hover:bg-hover rounded-lg"
                            title="Refrescar"
                        >
                            <RefreshCw size={18} className={clsx('text-muted', loading && 'animate-spin')} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Buscar assets..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-subtle border border-subtle rounded-lg text-sm focus:outline-none focus:border-accent"
                        />
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={clsx(
                            'p-2 rounded-lg border',
                            showFilters ? 'bg-accent/10 border-accent text-accent' : 'border-subtle hover:bg-hover'
                        )}
                    >
                        <Filter size={18} />
                    </button>

                    <div className="flex border border-subtle rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={clsx('p-2', viewMode === 'grid' ? 'bg-accent text-white' : 'hover:bg-hover')}
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx('p-2', viewMode === 'list' ? 'bg-accent text-white' : 'hover:bg-hover')}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-subtle">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted">Tipo:</span>
                            <select
                                value={scopeFilter}
                                onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
                                className="px-2 py-1 bg-subtle border border-subtle rounded text-sm"
                            >
                                <option value="all">Todos</option>
                                <option value="message_attachment">Adjuntos</option>
                                <option value="template_asset">Plantillas</option>
                                <option value="execution_plan">Plans</option>
                                <option value="shared_internal">Internos</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted">Estado:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                className="px-2 py-1 bg-subtle border border-subtle rounded text-sm"
                            >
                                <option value="all">Todos</option>
                                <option value="ready">Listos</option>
                                <option value="pending">Pendientes</option>
                                <option value="archived">Archivados</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Uploader */}
            {showUploader && (
                <div className="flex-shrink-0 p-4 border-b border-subtle bg-subtle/50">
                    <AssetUploader
                        accountId={accountId}
                        onUploadComplete={() => {
                            setShowUploader(false);
                            loadAssets();
                        }}
                        onCancel={() => setShowUploader(false)}
                    />
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {loading && assets.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 size={32} className="animate-spin text-muted" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <AlertCircle size={40} className="text-red-500 mb-2" />
                        <p className="text-red-500">{error}</p>
                        <button
                            onClick={() => loadAssets()}
                            className="mt-2 text-sm text-accent hover:underline"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : assets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <FileText size={40} className="text-muted mb-2" />
                        <p className="text-muted">No hay assets</p>
                        <button
                            onClick={() => setShowUploader(true)}
                            className="mt-2 text-sm text-accent hover:underline"
                        >
                            Subir el primero
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {assets.map(renderGridItem)}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {assets.map(renderListItem)}
                    </div>
                )}
            </div>

            {/* Footer */}
            {total > 0 && (
                <div className="flex-shrink-0 px-4 py-2 border-t border-subtle flex items-center justify-between text-sm text-muted">
                    <span>{total} asset{total !== 1 ? 's' : ''}</span>
                    {total > limit && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setOffset(Math.max(0, offset - limit)); loadAssets(); }}
                                disabled={offset === 0}
                                className="px-2 py-1 hover:bg-hover rounded disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <span>{Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}</span>
                            <button
                                onClick={() => { setOffset(offset + limit); loadAssets(); }}
                                disabled={offset + limit >= total}
                                className="px-2 py-1 hover:bg-hover rounded disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AssetBrowser;
