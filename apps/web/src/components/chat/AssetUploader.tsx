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

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image, FileText, Film, Music, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAssetUpload, formatBytes, type UploadedAsset } from '../../hooks/useAssetUpload';
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
    compact?: boolean;
}

interface FilePreview {
    file: File;
    previewUrl: string | null;
    type: 'image' | 'video' | 'audio' | 'document';
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
    maxSizeBytes = 100 * 1024 * 1024, // 100MB default
    allowedMimeTypes,
    className,
    compact = false,
}: AssetUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<FilePreview | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        status,
        progress,
        error,
        uploadedAsset,
        upload,
        cancel,
        reset,
    } = useAssetUpload({
        accountId,
        maxSizeBytes,
        allowedMimeTypes,
        onSuccess: (asset) => {
            onUploadComplete?.(asset);
        },
    });

    // Crear preview del archivo
    const createPreview = useCallback((file: File): FilePreview => {
        const type = getFileType(file.type);
        let previewUrl: string | null = null;

        if (type === 'image') {
            previewUrl = URL.createObjectURL(file);
        }

        return { file, previewUrl, type };
    }, []);

    // Limpiar preview
    const clearPreview = useCallback(() => {
        if (selectedFile?.previewUrl) {
            URL.revokeObjectURL(selectedFile.previewUrl);
        }
        setSelectedFile(null);
    }, [selectedFile]);

    // Manejar selección de archivo
    const handleFileSelect = useCallback((file: File) => {
        clearPreview();
        const preview = createPreview(file);
        setSelectedFile(preview);
    }, [clearPreview, createPreview]);

    // Manejar drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    // Manejar drag over
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    // Manejar drag leave
    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    // Manejar click para seleccionar archivo
    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Manejar cambio en input
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
        e.target.value = '';
    }, [handleFileSelect]);

    // Iniciar upload
    const handleUpload = useCallback(async () => {
        if (!selectedFile) return;
        await upload(selectedFile.file);
    }, [selectedFile, upload]);

    // Cancelar
    const handleCancel = useCallback(() => {
        cancel();
        clearPreview();
        reset();
        onCancel?.();
    }, [cancel, clearPreview, reset, onCancel]);

    // Remover archivo seleccionado
    const handleRemoveFile = useCallback(() => {
        clearPreview();
        reset();
    }, [clearPreview, reset]);

    // Renderizar estado
    const renderStatus = () => {
        if (status === 'completed' && uploadedAsset) {
            return (
                <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle size={16} />
                    <span className="text-sm">Upload completado</span>
                </div>
            );
        }

        if (status === 'error' && error) {
            return (
                <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle size={16} />
                    <span className="text-sm">{error}</span>
                </div>
            );
        }

        if (status === 'uploading' && progress) {
            return (
                <div className="w-full">
                    <div className="flex items-center justify-between text-sm text-muted mb-1">
                        <span>Subiendo...</span>
                        <span>{progress.percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-subtle rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </div>
                    <div className="text-xs text-muted mt-1">
                        {formatBytes(progress.bytesUploaded)} / {formatBytes(progress.totalBytes)}
                    </div>
                </div>
            );
        }

        if (status === 'creating_session' || status === 'committing') {
            return (
                <div className="flex items-center gap-2 text-muted">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">
                        {status === 'creating_session' ? 'Preparando...' : 'Finalizando...'}
                    </span>
                </div>
            );
        }

        return null;
    };

    // Renderizar preview del archivo
    const renderFilePreview = () => {
        if (!selectedFile) return null;

        const FileIcon = getFileIcon(selectedFile.type);

        return (
            <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-subtle">
                {selectedFile.previewUrl ? (
                    <img
                        src={selectedFile.previewUrl}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded"
                    />
                ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-subtle rounded">
                        <FileIcon size={24} className="text-muted" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                        {selectedFile.file.name}
                    </p>
                    <p className="text-xs text-muted">
                        {formatBytes(selectedFile.file.size)} • {selectedFile.file.type || 'Desconocido'}
                    </p>
                </div>

                {status === 'idle' && (
                    <button
                        onClick={handleRemoveFile}
                        className="p-1 hover:bg-hover rounded"
                        title="Remover archivo"
                    >
                        <X size={16} className="text-muted" />
                    </button>
                )}
            </div>
        );
    };

    // Modo compacto (para integrar en ChatComposer)
    if (compact) {
        return (
            <div className={clsx('relative', className)}>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={allowedMimeTypes?.join(',')}
                    onChange={handleInputChange}
                />
                
                {!selectedFile ? (
                    <button
                        onClick={handleClick}
                        className="p-2 hover:bg-hover rounded-lg transition-colors"
                        title="Adjuntar archivo"
                    >
                        <Upload size={20} className="text-muted" />
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        {renderFilePreview()}
                        {renderStatus()}
                        
                        {status === 'idle' && (
                            <button
                                onClick={handleUpload}
                                className="px-3 py-1 bg-accent text-white rounded text-sm hover:bg-accent/90"
                            >
                                Subir
                            </button>
                        )}
                        
                        {(status === 'uploading' || status === 'creating_session') && (
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Modo completo (con drag & drop)
    return (
        <div className={clsx('space-y-4', className)}>
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={allowedMimeTypes?.join(',')}
                onChange={handleInputChange}
            />

            {/* Zona de drop */}
            {!selectedFile && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={handleClick}
                    className={clsx(
                        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                        isDragging
                            ? 'border-accent bg-accent/10'
                            : 'border-subtle hover:border-accent/50 hover:bg-hover'
                    )}
                >
                    <Upload
                        size={40}
                        className={clsx(
                            'mx-auto mb-4',
                            isDragging ? 'text-accent' : 'text-muted'
                        )}
                    />
                    <p className="text-primary font-medium mb-1">
                        {isDragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz click'}
                    </p>
                    <p className="text-sm text-muted">
                        Máximo {formatBytes(maxSizeBytes)}
                        {allowedMimeTypes && allowedMimeTypes.length > 0 && (
                            <> • {allowedMimeTypes.join(', ')}</>
                        )}
                    </p>
                </div>
            )}

            {/* Preview del archivo */}
            {selectedFile && renderFilePreview()}

            {/* Estado */}
            {renderStatus()}

            {/* Botones de acción */}
            {selectedFile && status === 'idle' && (
                <div className="flex gap-2">
                    <button
                        onClick={handleUpload}
                        className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                    >
                        Subir archivo
                    </button>
                    <button
                        onClick={handleRemoveFile}
                        className="px-4 py-2 bg-subtle text-secondary rounded-lg hover:bg-hover transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {/* Botón de cancelar durante upload */}
            {(status === 'uploading' || status === 'creating_session') && (
                <button
                    onClick={handleCancel}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                    Cancelar upload
                </button>
            )}

            {/* Botón de reintentar en error */}
            {status === 'error' && (
                <div className="flex gap-2">
                    <button
                        onClick={handleUpload}
                        className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                    >
                        Reintentar
                    </button>
                    <button
                        onClick={handleRemoveFile}
                        className="px-4 py-2 bg-subtle text-secondary rounded-lg hover:bg-hover transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {/* Botón de cerrar en completado */}
            {status === 'completed' && (
                <button
                    onClick={handleCancel}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                    Listo
                </button>
            )}
        </div>
    );
}

export default AssetUploader;
