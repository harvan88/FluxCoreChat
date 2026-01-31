/**
 * useAssetUpload Hook
 * 
 * Hook para gestionar uploads de assets usando el sistema de sesiones.
 * Soporta:
 * - Creación de sesión de upload
 * - Upload con progreso
 * - Commit de upload
 * - Cancelación
 * 
 * Pertenece a CHAT CORE, no a FluxCore.
 */

import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';

// ════════════════════════════════════════════════════════════════════════════
// Tipos
// ════════════════════════════════════════════════════════════════════════════

export type UploadStatus = 'idle' | 'creating_session' | 'uploading' | 'committing' | 'completed' | 'error' | 'cancelled';

export interface UploadProgress {
    bytesUploaded: number;
    totalBytes: number;
    percentage: number;
}

export interface UploadSession {
    sessionId: string;
    expiresAt: string;
    maxSizeBytes: number;
    allowedMimeTypes: string[];
}

export interface UploadedAsset {
    assetId: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
}

export interface UseAssetUploadOptions {
    accountId: string;
    onSuccess?: (asset: UploadedAsset) => void;
    onError?: (error: string) => void;
    onProgress?: (progress: UploadProgress) => void;
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
}

export interface UseAssetUploadReturn {
    status: UploadStatus;
    progress: UploadProgress | null;
    error: string | null;
    session: UploadSession | null;
    uploadedAsset: UploadedAsset | null;
    upload: (file: File) => Promise<UploadedAsset | null>;
    cancel: () => void;
    reset: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// Hook
// ════════════════════════════════════════════════════════════════════════════

export function useAssetUpload(options: UseAssetUploadOptions): UseAssetUploadReturn {
    const { accountId, onSuccess, onError, onProgress, maxSizeBytes, allowedMimeTypes } = options;

    const [status, setStatus] = useState<UploadStatus>('idle');
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<UploadSession | null>(null);
    const [uploadedAsset, setUploadedAsset] = useState<UploadedAsset | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    /**
     * Crear sesión de upload
     */
    const createSession = useCallback(async (file: File): Promise<UploadSession | null> => {
        setStatus('creating_session');
        setError(null);

        try {
            const response = await api.createAssetUploadSession({
                accountId,
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                totalBytes: file.size,
                maxSizeBytes,
                allowedMimeTypes,
            });

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to create upload session');
            }

            const sessionData: UploadSession = {
                sessionId: response.data.sessionId,
                expiresAt: response.data.expiresAt,
                maxSizeBytes: response.data.maxSizeBytes,
                allowedMimeTypes: response.data.allowedMimeTypes || [],
            };

            setSession(sessionData);
            sessionIdRef.current = sessionData.sessionId;

            return sessionData;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to create session';
            setError(errorMsg);
            setStatus('error');
            onError?.(errorMsg);
            return null;
        }
    }, [accountId, maxSizeBytes, allowedMimeTypes, onError]);

    /**
     * Subir archivo
     */
    const uploadFile = useCallback(async (file: File, sessionId: string): Promise<boolean> => {
        setStatus('uploading');
        setProgress({ bytesUploaded: 0, totalBytes: file.size, percentage: 0 });

        abortControllerRef.current = new AbortController();

        try {
            // Usar XMLHttpRequest para tener progreso real
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const prog: UploadProgress = {
                            bytesUploaded: event.loaded,
                            totalBytes: event.total,
                            percentage: Math.round((event.loaded / event.total) * 100),
                        };
                        setProgress(prog);
                        onProgress?.(prog);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(true);
                    } else {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            reject(new Error(response.error || `Upload failed with status ${xhr.status}`));
                        } catch {
                            reject(new Error(`Upload failed with status ${xhr.status}`));
                        }
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });

                xhr.addEventListener('abort', () => {
                    reject(new Error('Upload cancelled'));
                });

                // Abrir conexión
                xhr.open('PUT', `/api/assets/upload/${sessionId}?accountId=${accountId}`);
                xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

                // Agregar token de autenticación si existe
                const token = localStorage.getItem('token');
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }

                // Guardar referencia para poder cancelar
                abortControllerRef.current = {
                    abort: () => xhr.abort(),
                } as AbortController;

                // Enviar archivo
                xhr.send(file);
            });
        } catch (err) {
            if ((err as Error).message === 'Upload cancelled') {
                setStatus('cancelled');
                return false;
            }
            throw err;
        }
    }, [accountId, onProgress]);

    /**
     * Confirmar upload
     */
    const commitUpload = useCallback(async (sessionId: string): Promise<UploadedAsset | null> => {
        setStatus('committing');

        try {
            const response = await api.commitAssetUpload(sessionId, accountId);

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to commit upload');
            }

            const asset: UploadedAsset = {
                assetId: response.data.assetId,
                name: response.data.name,
                mimeType: response.data.mimeType,
                sizeBytes: response.data.sizeBytes,
                status: response.data.status,
            };

            setUploadedAsset(asset);
            setStatus('completed');
            onSuccess?.(asset);

            return asset;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to commit upload';
            setError(errorMsg);
            setStatus('error');
            onError?.(errorMsg);
            return null;
        }
    }, [accountId, onSuccess, onError]);

    /**
     * Proceso completo de upload
     */
    const upload = useCallback(async (file: File): Promise<UploadedAsset | null> => {
        // Validar tamaño
        if (maxSizeBytes && file.size > maxSizeBytes) {
            const errorMsg = `File too large. Maximum size is ${formatBytes(maxSizeBytes)}`;
            setError(errorMsg);
            setStatus('error');
            onError?.(errorMsg);
            return null;
        }

        // Validar tipo MIME
        if (allowedMimeTypes && allowedMimeTypes.length > 0) {
            const isAllowed = allowedMimeTypes.some(type => {
                if (type.endsWith('/*')) {
                    return file.type.startsWith(type.slice(0, -1));
                }
                return file.type === type;
            });

            if (!isAllowed) {
                const errorMsg = `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`;
                setError(errorMsg);
                setStatus('error');
                onError?.(errorMsg);
                return null;
            }
        }

        try {
            // 1. Crear sesión
            const sessionData = await createSession(file);
            if (!sessionData) return null;

            // 2. Subir archivo
            const uploaded = await uploadFile(file, sessionData.sessionId);
            if (!uploaded) return null;

            // 3. Confirmar upload
            const asset = await commitUpload(sessionData.sessionId);
            return asset;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Upload failed';
            setError(errorMsg);
            setStatus('error');
            onError?.(errorMsg);
            return null;
        }
    }, [createSession, uploadFile, commitUpload, maxSizeBytes, allowedMimeTypes, onError]);

    /**
     * Cancelar upload
     */
    const cancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Cancelar sesión en el servidor si existe
        if (sessionIdRef.current) {
            api.cancelAssetUpload(sessionIdRef.current, accountId).catch(() => {
                // Ignorar errores de cancelación
            });
        }

        setStatus('cancelled');
        setProgress(null);
        sessionIdRef.current = null;
    }, [accountId]);

    /**
     * Resetear estado
     */
    const reset = useCallback(() => {
        setStatus('idle');
        setProgress(null);
        setError(null);
        setSession(null);
        setUploadedAsset(null);
        sessionIdRef.current = null;
        abortControllerRef.current = null;
    }, []);

    return {
        status,
        progress,
        error,
        session,
        uploadedAsset,
        upload,
        cancel,
        reset,
    };
}

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export { formatBytes };
