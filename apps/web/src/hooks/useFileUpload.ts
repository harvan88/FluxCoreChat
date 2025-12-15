import { useCallback, useState } from 'react';
import type { ApiResponse } from '../types';
import { api } from '../services/api';

type UploadType = 'image' | 'document' | 'audio' | 'video';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function uploadFormData<T>(params: {
  endpoint: string;
  formData: FormData;
  onProgress?: (pct: number) => void;
}): Promise<ApiResponse<T>> {
  const token = api.getToken();

  return await new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${params.endpoint}`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      params.onProgress?.(pct);
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as any;

        if (xhr.status >= 400) {
          resolve({
            success: false,
            error: json?.error || json?.message || `HTTP ${xhr.status}`,
          });
          return;
        }

        if (json && json.success === false && !json.error && json.message) {
          json.error = json.message;
        }

        resolve(json as ApiResponse<T>);
      } catch {
        resolve({ success: false, error: 'Respuesta inválida del servidor' });
      }
    };

    xhr.onerror = () => {
      resolve({ success: false, error: 'Error de conexión' });
    };

    xhr.send(params.formData);
  });
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (params: {
    file: File;
    type: UploadType;
    messageId?: string;
  }) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('type', params.type);
    if (params.messageId) formData.append('messageId', params.messageId);

    const res = await uploadFormData<{ attachment: any; url: string }>(
      {
        endpoint: '/upload/file',
        formData,
        onProgress: setProgress,
      }
    );

    if (!res.success) {
      setError(res.error || (res as any).message || 'Error al subir archivo');
    }

    setIsUploading(false);
    return res;
  }, []);

  const uploadAudio = useCallback(async (params: { file: File; messageId?: string }) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', params.file);
    if (params.messageId) formData.append('messageId', params.messageId);

    const res = await uploadFormData<{ attachment: any; url: string; waveformData?: any }>(
      {
        endpoint: '/upload/audio',
        formData,
        onProgress: setProgress,
      }
    );

    if (!res.success) {
      setError(res.error || 'Error al subir audio');
    }

    setIsUploading(false);
    return res;
  }, []);

  return {
    uploadFile,
    uploadAudio,
    isUploading,
    progress,
    error,
    clearError: () => setError(null),
  };
}
