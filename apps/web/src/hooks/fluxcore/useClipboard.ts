/**
 * useClipboard Hook
 * 
 * Hook para copiar texto al portapapeles con feedback visual.
 * Extraído del patrón repetido en múltiples vistas de FluxCore.
 * 
 * @example
 * const { copy, status, isCopied } = useClipboard();
 * 
 * <button onClick={() => copy(text)}>
 *   {isCopied ? 'Copiado!' : 'Copiar'}
 * </button>
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { COPY_NOTIFICATION_DURATION_MS } from '../../lib/fluxcore/constants';
import type { ClipboardStatus } from '../../types/fluxcore';

export interface UseClipboardOptions {
    /** Duración del estado 'copied' en ms (default: 2000ms) */
    duration?: number;
    /** Callback al copiar exitosamente */
    onSuccess?: () => void;
    /** Callback al fallar */
    onError?: (error: Error) => void;
}

export interface UseClipboardReturn {
    /** Función para copiar texto */
    copy: (text: string) => Promise<void>;
    /** Estado actual: 'idle' | 'copied' | 'error' */
    status: ClipboardStatus;
    /** Shortcut: true si status === 'copied' */
    isCopied: boolean;
    /** Shortcut: true si status === 'error' */
    isError: boolean;
    /** Resetear al estado idle */
    reset: () => void;
}

/**
 * Hook para copiar al portapapeles con feedback
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
    const {
        duration = COPY_NOTIFICATION_DURATION_MS,
        onSuccess,
        onError
    } = options;

    const [status, setStatus] = useState<ClipboardStatus>('idle');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    const reset = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setStatus('idle');
    }, []);

    const copy = useCallback(async (text: string) => {
        // Limpiar timeout anterior
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        try {
            await navigator.clipboard.writeText(text);
            setStatus('copied');
            onSuccess?.();

            // Volver a idle después del duration
            timeoutRef.current = setTimeout(() => {
                setStatus('idle');
            }, duration);
        } catch (e) {
            const err = e instanceof Error ? e : new Error('Failed to copy');
            setStatus('error');
            onError?.(err);

            // Volver a idle después del duration
            timeoutRef.current = setTimeout(() => {
                setStatus('idle');
            }, duration);
        }
    }, [duration, onSuccess, onError]);

    return {
        copy,
        status,
        isCopied: status === 'copied',
        isError: status === 'error',
        reset,
    };
}

export default useClipboard;
