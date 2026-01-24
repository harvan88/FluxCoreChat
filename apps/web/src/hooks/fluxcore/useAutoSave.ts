/**
 * useAutoSave Hook
 * 
 * Hook para auto-guardado con debounce.
 * Extraído del patrón repetido en AssistantsView.tsx
 * 
 * @example
 * const { save, saveImmediate, isSaving, error } = useAutoSave(saveToServer);
 * 
 * // En onChange:
 * save(newData);
 * 
 * // En onBlur (guardado inmediato):
 * saveImmediate(newData);
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AUTOSAVE_DELAY_MS } from '../../lib/fluxcore/constants';

export interface UseAutoSaveOptions {
    /** Delay en ms antes de guardar (default: 500ms) */
    delay?: number;
    /** Callback al guardar exitosamente */
    onSuccess?: () => void;
    /** Callback al fallar */
    onError?: (error: Error) => void;
}

export interface UseAutoSaveReturn<T> {
    /** Función para programar guardado con debounce */
    save: (data: T) => void;
    /** Función para guardar inmediatamente */
    saveImmediate: (data: T) => void;
    /** Indica si está guardando */
    isSaving: boolean;
    /** Último error ocurrido */
    error: Error | null;
    /** Limpia el error */
    clearError: () => void;
}

/**
 * Hook para auto-guardado con debounce
 */
export function useAutoSave<T>(
    saveFunction: (data: T) => Promise<void>,
    options: UseAutoSaveOptions = {}
): UseAutoSaveReturn<T> {
    const { delay = AUTOSAVE_DELAY_MS, onSuccess, onError } = options;

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastDataRef = useRef<T | null>(null);

    // Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    const executeSave = useCallback(async (data: T) => {
        setIsSaving(true);
        setError(null);

        try {
            await saveFunction(data);
            onSuccess?.();
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            onError?.(err);
        } finally {
            setIsSaving(false);
        }
    }, [saveFunction, onSuccess, onError]);

    const save = useCallback((data: T) => {
        lastDataRef.current = data;

        // Cancelar timeout anterior
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Programar nuevo guardado
        timeoutRef.current = setTimeout(() => {
            void executeSave(data);
        }, delay);
    }, [executeSave, delay]);

    const saveImmediate = useCallback((data: T) => {
        // Cancelar cualquier guardado pendiente
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        void executeSave(data);
    }, [executeSave]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        save,
        saveImmediate,
        isSaving,
        error,
        clearError,
    };
}

export default useAutoSave;
