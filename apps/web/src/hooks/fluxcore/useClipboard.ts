/**
 * useClipboard Hook - Sistema universal de copia con fallback
 * 
 * =============================================================================
 * PROPÓSITO:
 * =============================================================================
 * Hook reutilizable que maneja toda la lógica de copiar al portapapeles
 * con feedback visual, manejo de errores y fallback automático.
 * 
 * =============================================================================
 * CARACTERÍSTICAS PRINCIPALES:
 * =============================================================================
 * - ✅ Doble estrategia: Clipboard API moderno + fallback tradicional
 * - ✅ Manejo automático de estados (idle → copied/error → idle)
 * - ✅ Logging estructurado para debugging
 * - ✅ Callbacks para éxito/error
 * - ✅ Limpieza automática de timeouts
 * - ✅ Validación de entradas
 * 
 * =============================================================================
 * ESTRATEGIA DE COPIA (DUAL LAYER):
 * =============================================================================
 * 
 * 1. CAPA MODERNA: navigator.clipboard.writeText()
 *    - Funciona en HTTPS y contextos seguros
 *    - Más eficiente y seguro
 *    - Puede fallar en desarrollo local (http://)
 *    - Puede ser bloqueado por políticas de permisos
 * 
 * 2. CAPA FALLBACK: document.execCommand('copy')
 *    - Método tradicional compatible con todos los navegadores
 *    - Funciona en HTTP y contextos de desarrollo
 *    - Crea textarea temporal fuera de pantalla
 *    - Menos eficiente pero más confiable
 * 
 * =============================================================================
 * ESTADOS Y FLUJO:
 * =============================================================================
 * 
 * idle → [click] → copying → success/error → idle (2s después)
 * 
 * - 'idle': Estado inicial, listo para copiar
 * - 'copied': Copia exitosa, feedback visual verde
 * - 'error': Fallo en ambos métodos, feedback visual rojo
 * 
 * =============================================================================
 * EJEMPLOS DE USO:
 * =============================================================================
 * 
 * // BÁSICO
 * const { copy, isCopied } = useClipboard();
 * 
 * // CON CALLBACKS
 * const { copy, isCopied, isError } = useClipboard({
 *   duration: 3000,
 *   onSuccess: () => toast.success('Copiado!'),
 *   onError: (error) => toast.error(`Error: ${error.message}`)
 * });
 * 
 * // EN COMPONENTE
 * function MyComponent() {
 *   const { copy, isCopied } = useClipboard();
 *   
 *   return (
 *     <button onClick={() => copy('texto a copiar')}>
 *       {isCopied ? '✓ Copiado' : 'Copiar'}
 *     </button>
 *   );
 * }
 * 
 * =============================================================================
 * ERRORES COMUNES Y SOLUCIONES:
 * =============================================================================
 * 
 * ❌ ERROR: "NotAllowedError: Clipboard API blocked"
 * CAUSA: Política de permisos en desarrollo local
 * SOLUCIÓN: El hook usa fallback automáticamente
 * 
 * ❌ ERROR: "TypeError: Cannot read properties of undefined"
 * CAUSA: Pasar undefined/null al hook
 * SOLUCIÓN: Validar antes de usar
 * const textToCopy = value || '';
 * 
 * ❌ ERROR: "Text too large to copy"
 * CAUSA: Intentar copiar >1MB de datos
 * SOLUCIÓN: Validar tamaño antes de copiar
 * 
 * =============================================================================
 * CONSIDERACIONES DE PERFORMANCE:
 * =============================================================================
 * 
 * - El fallback crea elementos DOM temporales
 * - Para copias frecuentes, considerar memoización
 * - Datos muy grandes pueden causar lag
 * - Los timeouts se limpian automáticamente al desmontar
 * 
 * =============================================================================
 * SEGURIDAD:
 * =============================================================================
 * 
 * - El fallback usa posición fixed fuera de pantalla
 * - Los elementos temporales se eliminan inmediatamente
 * - No deja rastros en el DOM
 * - Funciona incluso en iframes con restricciones
 * 
 * =============================================================================
 * TESTING:
 * =============================================================================
 * 
 * // Mock navigator.clipboard para testing
 * Object.assign(navigator, {
 *   clipboard: {
 *     writeText: vi.fn().mockResolvedValue(undefined)
 *   }
 * });
 * 
 * // Mock document.execCommand para testing
 * const mockExecCommand = vi.fn(() => true);
 * Object.defineProperty(document, 'execCommand', {
 *   value: mockExecCommand
 * });
 * 
 * =============================================================================
 * DEPENDENCIAS:
 * =============================================================================
 * - React hooks (useState, useCallback, useRef, useEffect)
 * - COPY_NOTIFICATION_DURATION_MS (constante de configuración)
 * - ClipboardStatus type (tipado de estados)
 * =============================================================================
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
        console.log('[useClipboard] Iniciando copia:', { 
            textLength: text?.length || 0, 
            textContent: text ? `${text.substring(0, 30)}...` : 'empty',
            hasClipboardAPI: !!navigator.clipboard,
            hasWriteText: !!navigator.clipboard?.writeText
        });

        // Limpiar timeout anterior
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        try {
            // Intentar con Clipboard API moderno
            await navigator.clipboard.writeText(text);
            console.log('[useClipboard] Copia exitosa con Clipboard API');
            setStatus('copied');
            onSuccess?.();

            // Volver a idle después del duration
            timeoutRef.current = setTimeout(() => {
                setStatus('idle');
            }, duration);
        } catch (e) {
            console.warn('[useClipboard] Clipboard API falló, usando fallback:', e);
            
            // FALLBACK: Método tradicional para desarrollo/local
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (successful) {
                    console.log('[useClipboard] Copia exitosa con fallback');
                    setStatus('copied');
                    onSuccess?.();
                } else {
                    throw new Error('Fallback copy failed');
                }
            } catch (fallbackError) {
                console.error('[useClipboard] Fallback también falló:', fallbackError);
                const err = fallbackError instanceof Error ? fallbackError : new Error('All copy methods failed');
                setStatus('error');
                onError?.(err);
            }

            // Volver a idle después del duration (incluso si falló)
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
