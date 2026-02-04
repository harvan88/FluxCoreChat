/**
 * AssetPreview Component
 * 
 * Componente para mostrar preview de assets en mensajes.
 * Soporta:
 * - Imágenes (con lightbox)
 * - Videos
 * - Audio
 * - Documentos (icono + nombre)
 * 
 * Pertenece a CHAT CORE, no a FluxCore.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
    Image as ImageIcon, 
    FileText, 
    Film, 
    Music, 
    Download, 
    ExternalLink,
    X,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';

// ════════════════════════════════════════════════════════════════════════════
// Tipos
// ════════════════════════════════════════════════════════════════════════════

interface AssetPreviewProps {
    assetId: string;
    accountId: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    className?: string;
    showDownload?: boolean;
    compact?: boolean;
    typeHint?: AssetType;
}

type AssetType = 'image' | 'video' | 'audio' | 'document';

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

function getAssetType(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

function getAssetIcon(type: AssetType) {
    switch (type) {
        case 'image': return ImageIcon;
        case 'video': return Film;
        case 'audio': return Music;
        default: return FileText;
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileExtension(name: string): string {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() || '' : '';
}

// ════════════════════════════════════════════════════════════════════════════
// Componente
// ════════════════════════════════════════════════════════════════════════════

export function AssetPreview({
    assetId,
    accountId,
    name,
    mimeType,
    sizeBytes,
    className,
    showDownload = true,
    compact = false,
    typeHint,
}: AssetPreviewProps) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const currentUserId = useAuthStore((state) => state.user?.id ?? null);

    const assetType = typeHint ?? getAssetType(mimeType);
    const AssetIcon = getAssetIcon(assetType);
    const extension = getFileExtension(name);

    // Obtener URL firmada
    const fetchSignedUrl = useCallback(async () => {
        if (signedUrl) return signedUrl;

        if (!currentUserId) {
            setError('Usuario no autenticado');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.signAssetUrl(assetId, accountId, {
                actorId: currentUserId,
                actorType: 'user',
                action: 'preview',
                channel: 'web',
                disposition: assetType === 'document' ? 'attachment' : 'inline',
            });
            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to get signed URL');
            }
            setSignedUrl(response.data.url);
            return response.data.url;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error loading asset';
            setError(errorMsg);
            return null;
        } finally {
            setLoading(false);
        }
    }, [assetId, accountId, signedUrl, currentUserId, assetType]);

    // Cargar URL para imágenes automáticamente
    useEffect(() => {
        if (assetType === 'image' && !signedUrl && !loading && !error) {
            fetchSignedUrl();
        }
    }, [assetType, signedUrl, loading, error, fetchSignedUrl]);

    // Manejar descarga
    const handleDownload = useCallback(async () => {
        const url = await fetchSignedUrl();
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = name;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }, [fetchSignedUrl, name]);

    // Abrir en nueva pestaña
    const handleOpenExternal = useCallback(async () => {
        const url = await fetchSignedUrl();
        if (url) {
            window.open(url, '_blank');
        }
    }, [fetchSignedUrl]);

    // Renderizar imagen
    const renderImage = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center w-full h-32 bg-subtle rounded-lg">
                    <Loader2 size={24} className="animate-spin text-muted" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center w-full h-32 bg-subtle rounded-lg">
                    <div className="text-center">
                        <AlertCircle size={24} className="mx-auto text-red-500 mb-1" />
                        <p className="text-xs text-muted">Error al cargar</p>
                    </div>
                </div>
            );
        }

        if (signedUrl) {
            return (
                <>
                    <img
                        src={signedUrl}
                        alt={name}
                        className={clsx(
                            'rounded-lg cursor-pointer object-cover',
                            compact ? 'max-w-[150px] max-h-[100px]' : 'max-w-full max-h-[300px]'
                        )}
                        onClick={() => setLightboxOpen(true)}
                    />

                    {/* Lightbox */}
                    {lightboxOpen && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
                            onClick={() => setLightboxOpen(false)}
                        >
                            <button
                                className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"
                                onClick={() => setLightboxOpen(false)}
                            >
                                <X size={24} className="text-white" />
                            </button>
                            <img
                                src={signedUrl}
                                alt={name}
                                className="max-w-[90vw] max-h-[90vh] object-contain"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}
                </>
            );
        }

        return null;
    };

    // Renderizar video
    const renderVideo = () => {
        if (!signedUrl) {
            return (
                <button
                    onClick={fetchSignedUrl}
                    className="flex items-center gap-2 p-3 bg-subtle rounded-lg hover:bg-hover transition-colors"
                >
                    <Film size={20} className="text-muted" />
                    <span className="text-sm text-primary">{name}</span>
                    {loading && <Loader2 size={16} className="animate-spin text-muted" />}
                </button>
            );
        }

        return (
            <video
                src={signedUrl}
                controls
                className={clsx(
                    'rounded-lg',
                    compact ? 'max-w-[200px]' : 'max-w-full max-h-[300px]'
                )}
            >
                Tu navegador no soporta video.
            </video>
        );
    };

    // Renderizar audio
    const renderAudio = () => {
        if (!signedUrl) {
            return (
                <button
                    onClick={fetchSignedUrl}
                    className="flex items-center gap-2 p-3 bg-subtle rounded-lg hover:bg-hover transition-colors"
                >
                    <Music size={18} className="text-muted" />
                    <span className="text-sm text-primary">Escuchar audio</span>
                    {loading && <Loader2 size={16} className="animate-spin text-muted" />}
                </button>
            );
        }

        return (
            <div className="flex flex-col gap-2">
                <audio src={signedUrl} controls className="w-full" />
                {showDownload && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownload}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-subtle hover:bg-hover"
                        >
                            <Download size={14} /> Descargar
                        </button>
                        <button
                            onClick={handleOpenExternal}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-subtle hover:bg-hover"
                        >
                            <ExternalLink size={14} /> Abrir
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Renderizar documento
    const renderDocument = () => {
        return (
            <div className={clsx(
                'flex items-center gap-3 p-3 bg-subtle rounded-lg',
                compact ? 'max-w-[200px]' : ''
            )}>
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-accent/10 rounded">
                    <AssetIcon size={20} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{name}</p>
                    <p className="text-xs text-muted">
                        {extension && <span className="mr-2">{extension}</span>}
                        {formatBytes(sizeBytes)}
                    </p>
                </div>
                {showDownload && (
                    <div className="flex gap-1">
                        <button
                            onClick={handleDownload}
                            className="p-1.5 hover:bg-hover rounded"
                            title="Descargar"
                        >
                            <Download size={16} className="text-muted" />
                        </button>
                        <button
                            onClick={handleOpenExternal}
                            className="p-1.5 hover:bg-hover rounded"
                            title="Abrir en nueva pestaña"
                        >
                            <ExternalLink size={16} className="text-muted" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Renderizar según tipo
    const renderContent = () => {
        switch (assetType) {
            case 'image':
                return renderImage();
            case 'video':
                return renderVideo();
            case 'audio':
                return renderAudio();
            default:
                return renderDocument();
        }
    };

    return (
        <div className={clsx('asset-preview', className)}>
            {renderContent()}
        </div>
    );
}

export default AssetPreview;
