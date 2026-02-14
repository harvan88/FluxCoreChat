/**
 * AssetUploader Component
 * 
 * Componente para subir assets con:
 * - Drag & drop
 * - Preview de archivos
 * - Barra de progreso
 * - Manejo de errores
 * 
 * Pertenece a CHAT CORE, no a FluxCore.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Image, FileText, Film, Music, AlertCircle, CheckCircle, Loader2, RefreshCcw } from 'lucide-react';
import { useAssetUpload, formatBytes, type UploadedAsset, type UploadStatus, type UploadProgress } from '../../hooks/useAssetUpload';
import clsx from 'clsx';

// ════════════════════════════════════════════════════════════════════════════
// Tipos
// ════════════════════════════════════════════════════════════════════════════

interface AssetUploaderProps {
    accountId: string;
    onUploadComplete?: (asset: UploadedAsset) => void;
    onCancel?: () => void;
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
    className?: string;
}

type FileType = 'image' | 'video' | 'audio' | 'document';

interface FilePreview {
    file: File;
    previewUrl: string | null;
    type: FileType;
}

type QueueStatus = UploadStatus | 'pending';

interface QueuedFile extends FilePreview {
    id: string;
    status: QueueStatus;
    progress: UploadProgress | null;
    error?: string | null;
    asset?: UploadedAsset | null;
}

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

function getFileType(mimeType: string): FilePreview['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

function getFileIcon(type: FilePreview['type']) {
    switch (type) {
        case 'image': return Image;
        case 'video': return Film;
        case 'audio': return Music;
        default: return FileText;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Componente
// ════════════════════════════════════════════════════════════════════════════

export function AssetUploader({
    accountId,
    onUploadComplete,
    onCancel,
    maxSizeBytes = 100 * 1024 * 1024,
    allowedMimeTypes,
    className,
}: AssetUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [queue, setQueue] = useState<QueuedFile[]>([]);
    const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeUploadIdRef = useRef<string | null>(null);

    useEffect(() => {
        activeUploadIdRef.current = activeUploadId;
    }, [activeUploadId]);

    useEffect(() => {
        return () => {
            queue.forEach((item) => {
                if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }
            });
        };
    }, []);

    const updateQueueItem = useCallback((id: string, updater: (item: QueuedFile) => QueuedFile) => {
        setQueue((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
    }, []);

    const removeQueueItem = useCallback((id: string) => {
        setQueue((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target?.previewUrl) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter((item) => item.id !== id);
        });
    }, []);

    const clearCompleted = useCallback(() => {
        setQueue((prev) => {
            prev.filter((item) => item.status === 'completed').forEach((item) => {
                if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }
            });
            return prev.filter((item) => item.status !== 'completed');
        });
    }, []);

    const {
        upload,
        cancel,
        status,
        progress,
        error,
        reset,
    } = useAssetUpload({
        accountId,
        maxSizeBytes,
        allowedMimeTypes,
        onProgress: (currentProgress) => {
            const currentId = activeUploadIdRef.current;
            if (!currentId) return;
            updateQueueItem(currentId, (item) => ({
                ...item,
                progress: currentProgress,
                status: 'uploading',
            }));
        },
        onError: (message) => {
            const currentId = activeUploadIdRef.current;
            if (!currentId) return;
            updateQueueItem(currentId, (item) => ({
                ...item,
                status: 'error',
                error: message,
                progress: null,
            }));
        },
    });

    const createPreview = useCallback((file: File): FilePreview => {
        const type = getFileType(file.type);
        const previewUrl = type === 'image' ? URL.createObjectURL(file) : null;
        return { file, previewUrl, type };
    }, []);

    const enqueueFiles = useCallback((files: File[]) => {
        if (files.length === 0) return;

        setQueue((prev) => [
            ...prev,
            ...files.map((file) => ({
                ...createPreview(file),
                id: crypto.randomUUID(),
                status: 'pending' as QueueStatus,
                progress: null,
                error: null,
                asset: null,
            } satisfies QueuedFile)),
        ]);
    }, [createPreview]);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
        enqueueFiles(Array.from(event.dataTransfer.files || []));
    }, [enqueueFiles]);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            enqueueFiles(Array.from(event.target.files));
        }
        event.target.value = '';
    }, [enqueueFiles]);

    const processQueueItem = useCallback(async (item: QueuedFile) => {
        setActiveUploadId(item.id);
        updateQueueItem(item.id, (current) => ({ ...current, status: 'creating_session', error: null }));

        try {
            const uploadedAsset = await upload(item.file);
            if (!uploadedAsset) {
                updateQueueItem(item.id, (current) => ({ ...current, status: 'cancelled', progress: null }));
                return;
            }

            updateQueueItem(item.id, (current) => ({
                ...current,
                status: 'completed',
                asset: uploadedAsset,
                progress: null,
            }));

            onUploadComplete?.(uploadedAsset);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al subir';
            updateQueueItem(item.id, (current) => ({
                ...current,
                status: message === 'Upload cancelled' ? 'cancelled' : 'error',
                error: message === 'Upload cancelled' ? null : message,
                progress: null,
            }));
        } finally {
            setActiveUploadId(null);
            setIsProcessingQueue(false);
            reset();
        }
    }, [upload, onUploadComplete, reset, updateQueueItem]);

    useEffect(() => {
        if (isProcessingQueue) return;
        const nextItem = queue.find((item) => item.status === 'pending');
        if (!nextItem) return;

        setIsProcessingQueue(true);
        void processQueueItem(nextItem);
    }, [queue, isProcessingQueue, processQueueItem]);

    const handleCancelActive = useCallback(() => {
        cancel();
        const currentId = activeUploadIdRef.current;
        if (currentId) {
            updateQueueItem(currentId, (item) => ({ ...item, status: 'cancelled', progress: null }));
        }
        setActiveUploadId(null);
        setIsProcessingQueue(false);
        onCancel?.();
    }, [cancel, onCancel, updateQueueItem]);

    const renderQueueItem = (item: QueuedFile) => {
        const FileIcon = getFileIcon(item.type);
        const isActive = activeUploadId === item.id;

        return (
            <div
                key={item.id}
                className="flex items-center gap-3 p-3 border border-subtle rounded-lg bg-surface"
            >
                {item.previewUrl ? (
                    <img src={item.previewUrl} alt={item.file.name} className="w-12 h-12 object-cover rounded" />
                ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-subtle rounded">
                        <FileIcon size={20} className="text-muted" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{item.file.name}</p>
                    <p className="text-xs text-muted">
                        {formatBytes(item.file.size)} · {item.file.type || 'Desconocido'}
                    </p>

                    {item.status === 'pending' && (
                        <p className="text-xs text-muted mt-1">En cola</p>
                    )}

                    {item.status === 'creating_session' && (
                        <p className="text-xs text-muted mt-1 flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" /> Preparando…
                        </p>
                    )}

                    {item.status === 'uploading' && item.progress && (
                        <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-muted">
                                <span>Subiendo…</span>
                                <span>{item.progress.percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-subtle rounded-full overflow-hidden mt-1">
                                <div
                                    className="h-full bg-accent transition-all"
                                    style={{ width: `${item.progress.percentage}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {item.status === 'completed' && (
                        <p className="text-xs text-success mt-1 flex items-center gap-1">
                            <CheckCircle size={12} /> Listo
                        </p>
                    )}

                    {item.status === 'error' && (
                        <p className="text-xs text-error mt-1 flex items-center gap-1">
                            <AlertCircle size={12} /> {item.error || 'Error al subir'}
                        </p>
                    )}

                    {item.status === 'cancelled' && (
                        <p className="text-xs text-warning mt-1 flex items-center gap-1">
                            <AlertCircle size={12} /> Cancelado
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {item.status === 'pending' && (
                        <button
                            onClick={() => removeQueueItem(item.id)}
                            className="p-1.5 text-muted hover:text-error hover:bg-hover rounded"
                            title="Eliminar"
                        >
                            <X size={14} />
                        </button>
                    )}

                    {item.status === 'error' && (
                        <button
                            onClick={() => updateQueueItem(item.id, (current) => ({ ...current, status: 'pending', error: null }))}
                            className="p-1.5 rounded hover:bg-hover text-primary"
                            title="Reintentar"
                        >
                            <RefreshCcw size={14} />
                        </button>
                    )}

                    {isActive && (status === 'uploading' || status === 'creating_session' || status === 'committing') && (
                        <Loader2 size={16} className="animate-spin text-muted" />
                    )}
                </div>
            </div>
        );
    };

    const completedCount = queue.filter((item) => item.status === 'completed').length;
    const globalStatus = (() => {
        if (status === 'creating_session') return 'Preparando archivo…';
        if (status === 'uploading' && progress) {
            return `Subiendo ${progress.percentage}% (${formatBytes(progress.bytesUploaded)} / ${formatBytes(progress.totalBytes)})`;
        }
        if (status === 'committing') return 'Confirmando subida…';
        if (status === 'error' && error) return `Error: ${error}`;
        return null;
    })();

    const DropZone = (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                isDragging ? 'border-accent bg-accent/10' : 'border-subtle hover:border-accent/50 hover:bg-hover'
            )}
        >
            <Upload size={32} className={clsx('mx-auto mb-3', isDragging ? 'text-accent' : 'text-muted')} />
            <p className="text-sm font-medium text-primary">Arrastra archivos o haz click para seleccionarlos</p>
            <p className="text-xs text-muted mt-1">
                Hasta {formatBytes(maxSizeBytes)} por archivo · {allowedMimeTypes?.join(', ') || 'Formatos permitidos por la cuenta'}
            </p>
        </div>
    );

    const QueueSection = queue.length > 0 ? (
        <div className="space-y-3">
            {queue.map(renderQueueItem)}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{completedCount}/{queue.length} completados</span>
                {activeUploadId && (
                    <button
                        onClick={handleCancelActive}
                        className="px-3 py-1 rounded bg-error/10 text-error"
                    >
                        Cancelar actual
                    </button>
                )}
                <button
                    onClick={clearCompleted}
                    className="px-3 py-1 rounded bg-elevated text-secondary hover:bg-hover"
                    disabled={completedCount === 0}
                >
                    Limpiar completados
                </button>
            </div>
        </div>
    ) : (
        <p className="text-sm text-muted text-center border border-dashed border-subtle rounded-lg py-6">
            La cola está vacía. Agrega uno o varios archivos para iniciar la ingesta.
        </p>
    );

    const StatusBanner = globalStatus ? (
        <div className="text-xs text-muted flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> {globalStatus}
        </div>
    ) : null;

    return (
        <div className={clsx('space-y-4', className)}>
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept={allowedMimeTypes?.join(',')}
                onChange={handleFileInput}
            />
            {DropZone}
            {QueueSection}
            {StatusBanner}
        </div>
    );
}

export default AssetUploader;
