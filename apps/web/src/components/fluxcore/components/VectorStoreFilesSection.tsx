/**
 * VectorStoreFilesSection - Gestión de archivos en Vector Stores
 * 
 * Lista los archivos asociados a un vector store y permite:
 * - Ver lista de archivos con estado de procesamiento
 * - Subir nuevos archivos
 * - Eliminar archivos
 * - Ver progreso de embedding
 * 
 * Los archivos son assets centralizados consumidos por referencia.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    FileText,
    Upload,
    Trash2,
    Check,
    X,
    Loader2,
    AlertCircle,
    FileIcon,
    File,
    RefreshCw,
} from 'lucide-react';
import { Button, Badge } from '../../ui';
import { useAuthStore } from '../../../store/authStore';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

interface VectorStoreFile {
    id: string;
    name: string;
    mimeType?: string;
    sizeBytes: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    errorMessage?: string;
    chunkCount?: number;
    createdAt: string;
    updatedAt: string;
}

interface VectorStoreFilesSectionProps {
    vectorStoreId: string;
    accountId: string;
    onFileCountChange?: (count: number) => void;
}

const ACCEPTED_FILE_TYPES = [
    '.txt', '.md', '.pdf', '.docx', '.doc',
    '.csv', '.json', '.html', '.xml'
];

const MIME_TYPE_ICONS: Record<string, typeof FileText> = {
    'application/pdf': FileText,
    'text/plain': FileText,
    'text/markdown': FileText,
    'application/json': File,
    'text/csv': File,
};

// ════════════════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════════════════

export function VectorStoreFilesSection({
    vectorStoreId,
    accountId,
    onFileCountChange
}: VectorStoreFilesSectionProps) {
    const { token } = useAuthStore();
    const [files, setFiles] = useState<VectorStoreFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const onFileCountChangeRef = useRef(onFileCountChange);

    // Cargar archivos
    const loadFiles = useCallback(async () => {
        if (!token || !vectorStoreId) return;

        try {
            const response = await fetch(
                `/api/fluxcore/vector-stores/${vectorStoreId}/files`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setFiles(data.data || []);
                    onFileCountChangeRef.current?.(data.data?.length || 0);
                }
            }
        } catch (err) {
            console.error('Error loading files:', err);
        } finally {
            setLoading(false);
        }
    }, [token, vectorStoreId]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    // Auto-refresh para archivos en procesamiento
    useEffect(() => {
        const hasProcessing = files.some(f => f.status === 'processing' || f.status === 'pending');
        if (!hasProcessing) return;

        const interval = setInterval(loadFiles, 5000);
        return () => clearInterval(interval);
    }, [files.length, files.some?.(f => f.status === 'processing' || f.status === 'pending'), loadFiles]);

    // Subir archivos
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            const totalFiles = selectedFiles.length;
            let completed = 0;

            for (const file of Array.from(selectedFiles)) {
                await uploadFile(file);
                completed++;
                setUploadProgress(Math.round((completed / totalFiles) * 100));
            }

            await loadFiles();
        } catch (err: any) {
            setError(err.message || 'Error al subir archivos');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const uploadFile = async (file: File): Promise<void> => {
        // Usar el nuevo endpoint unificado que crea, vincula y procesa
        const formData = new FormData();
        formData.append('file', file);
        formData.append('accountId', accountId);

        const response = await fetch(
            `/api/fluxcore/vector-stores/${vectorStoreId}/files/upload`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message || `Error subiendo archivo: ${file.name}`);
        }
    };

    // Eliminar archivo
    const handleDelete = async (fileId: string) => {
        if (deleteConfirm !== fileId) {
            setDeleteConfirm(fileId);
            return;
        }

        try {
            const response = await fetch(
                `/api/fluxcore/vector-stores/${vectorStoreId}/files/${fileId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.ok) {
                setFiles(prev => prev.filter(f => f.id !== fileId));
                onFileCountChange?.(files.length - 1);
            }
        } catch (err) {
            console.error('Error deleting file:', err);
        } finally {
            setDeleteConfirm(null);
        }
    };

    // Re-procesar archivo
    const handleReprocess = async (fileId: string) => {
        try {
            const res = await fetch(
                `/api/fluxcore/vector-stores/${vectorStoreId}/files/${fileId}/reprocess?accountId=${encodeURIComponent(accountId)}`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                const msg = typeof data?.message === 'string' ? data.message : 'Error al reprocesar archivo';
                setError(msg);
                return;
            }
            await loadFiles();
        } catch (err) {
            console.error('Error reprocessing file:', err);
            setError('Error de conexión');
        }
    };

    // Formatear tamaño
    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Obtener badge de estado
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="success"><Check size={12} className="mr-1" />Indexado</Badge>;
            case 'processing':
                return <Badge variant="info"><Loader2 size={12} className="mr-1 animate-spin" />Procesando</Badge>;
            case 'failed':
                return <Badge variant="error"><AlertCircle size={12} className="mr-1" />Error</Badge>;
            default:
                return <Badge variant="warning">Pendiente</Badge>;
        }
    };

    // Obtener icono según tipo MIME
    const FileIconComponent = (mimeType?: string) => {
        const Icon = mimeType ? (MIME_TYPE_ICONS[mimeType] || FileIcon) : FileIcon;
        return <Icon size={16} className="text-muted flex-shrink-0" />;
    };

    return (
        <div className="space-y-4">
            {/* Header con acción de upload */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted">
                    {loading ? 'Cargando...' : `${files.length} archivo(s)`}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => loadFiles()}
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={14} className="mr-1 animate-spin" />
                                {uploadProgress}%
                            </>
                        ) : (
                            <>
                                <Upload size={14} className="mr-1" />
                                Agregar archivo
                            </>
                        )}
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ACCEPTED_FILE_TYPES.join(',')}
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto hover:bg-error/20 p-1 rounded"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Lista de archivos */}
            {loading ? (
                <div className="text-center py-8 text-muted">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Cargando archivos...
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-subtle rounded-lg">
                    <FileText size={32} className="mx-auto text-muted mb-2" />
                    <p className="text-secondary text-sm mb-3">No hay archivos en este vector store</p>
                    <Button
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={14} className="mr-1" />
                        Subir archivos
                    </Button>
                </div>
            ) : (
                <div className="border border-subtle rounded-lg divide-y divide-subtle">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-hover group"
                        >
                            {/* Icon */}
                            {FileIconComponent(file.mimeType)}

                            {/* File info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-primary font-medium truncate">
                                        {file.name}
                                    </span>
                                    {getStatusBadge(file.status)}
                                </div>
                                <div className="text-xs text-muted flex items-center gap-2">
                                    <span>{formatSize(file.sizeBytes)}</span>
                                    {file.chunkCount !== undefined && file.chunkCount > 0 && (
                                        <>
                                            <span>•</span>
                                            <span>{file.chunkCount} fragmentos</span>
                                        </>
                                    )}
                                    {file.errorMessage && (
                                        <span className="text-error" title={file.errorMessage}>
                                            • {file.errorMessage.slice(0, 50)}...
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {file.status === 'failed' && (
                                    <button
                                        onClick={() => handleReprocess(file.id)}
                                        className="p-1.5 hover:bg-elevated rounded text-muted hover:text-primary"
                                        title="Re-procesar"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                )}

                                {deleteConfirm === file.id ? (
                                    <>
                                        <button
                                            onClick={() => handleDelete(file.id)}
                                            className="p-1.5 hover:bg-error/20 rounded text-error"
                                            title="Confirmar eliminación"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(null)}
                                            className="p-1.5 hover:bg-elevated rounded text-muted"
                                            title="Cancelar"
                                        >
                                            <X size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleDelete(file.id)}
                                        className="p-1.5 hover:bg-error/20 rounded text-muted hover:text-error"
                                        title="Eliminar archivo"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Drag & Drop hint */}
            <p className="text-xs text-muted text-center">
                Formatos soportados: TXT, MD, PDF, DOCX, CSV, JSON
            </p>
        </div>
    );
}

export default VectorStoreFilesSection;
