/**
 * CopyButton - Botón universal de copia (agnóstico del contenido)
 * 
 * =============================================================================
 * PROPÓSITO:
 * =============================================================================
 * Componente puramente visual que copia cualquier texto sin saber qué es.
 * Garantiza consistencia visual y funcional en toda la aplicación.
 * 
 * =============================================================================
 * CARACTERÍSTICAS DE SEGURIDAD:
 * =============================================================================
 * - ✅ Expone errores en lugar de ocultarlos
 * - ✅ Manejo robusto de estados y edge cases
 * - ✅ Validación de entradas (fail fast)
 * - ✅ Logging estructurado para debugging
 * - ✅ Fallback automático para desarrollo local
 * - ✅ Accesibilidad completa (aria-label, títulos dinámicos)
 * 
 * =============================================================================
 * ESTRATEGIA DE COPIA:
 * =============================================================================
 * 1. Intenta navigator.clipboard.writeText() (moderno, HTTPS)
 * 2. Si falla, usa document.execCommand('copy') (fallback, desarrollo)
 * 3. Expone errores si ambos métodos fallan
 * 
 * =============================================================================
 * ESTADOS VISUALES:
 * =============================================================================
 * - Normal: Gris → azul en hover
 * - Copiado: Verde con check (✓) por 2s
 * - Error: Rojo con triángulo de advertencia (⚠)
 * - Inválido: Triángulo rojo (tipo de dato incorrecto)
 * 
 * =============================================================================
 * EJEMPLOS DE USO:
 * =============================================================================
 * 
 * // BÁSICO - Copiar texto simple
 * <CopyButton text="hola-mundo" />
 * 
 * // CON VALIDACIÓN - Copiar solo si hay contenido
 * <CopyButton 
 *   text={userAlias}
 *   disabled={!userAlias || userAlias.length < 3}
 *   title="Copiar alias"
 * />
 * 
 * // CON MANEJO DE ERRORES - Para logging/analytics
 * <CopyButton 
 *   text={jsonData}
 *   onError={(error) => {
 *     toast.error(`Error: ${error.message}`);
 *     trackError('copy-failed', error);
 *   }}
 *   onSuccess={() => analytics.track('copy-success')}
 * />
 * 
 * // DEBUGGING - Para desarrollo
 * <CopyButton 
 *   text={debugInfo}
 *   debug={process.env.NODE_ENV === 'development'}
 *   size="lg"
 * />
 * 
 * // COPIAR JSON - Datos estructurados
 * <CopyButton 
 *   text={JSON.stringify(data, null, 2)}
 *   title="Copiar JSON"
 *   className="ml-2"
 * />
 * 
 * =============================================================================
 * ERRORES COMUNES Y CÓMO EVITARLOS:
 * =============================================================================
 * 
 * ❌ ERROR: Copiar undefined/null
 * <CopyButton text={undefined} /> // Fallará con validación
 * 
 * ✅ SOLUCIÓN: Validar antes
 * <CopyButton text={value || ''} disabled={!value} />
 * 
 * ❌ ERROR: No manejar permisos denegados
 * // El usuario bloquea el clipboard API
 * 
 * ✅ SOLUCIÓN: Siempre proporcionar onError
 * <CopyButton 
 *   text={sensitiveData}
 *   onError={(error) => {
 *     console.error('Copy failed:', error);
 *     showFallbackDialog(sensitiveData);
 *   }}
 * />
 * 
 * ❌ ERROR: Copiar datos muy grandes (>1MB)
 * <CopyButton text={hugeString} // Puede fallar
 * 
 * ✅ SOLUCIÓN: Validar tamaño
 * <CopyButton 
 *   text={data.length > 1000000 ? data.substring(0, 1000000) : data}
 *   onError={(error) => {
 *     if (error.message.includes('large')) {
 *       showWarning('Datos demasiado grandes para copiar');
 *     }
 *   }}
 * />
 * 
 * =============================================================================
 * BUENAS PRÁCTICAS:
 * =============================================================================
 * 
 * 1. SIEMPRE validar el texto antes de pasarlo
 * 2. USAR disabled para prevenir clicks inválidos
 * 3. PROPORCIONAR onError para logging/analytics
 * 4. USAR títulos descriptivos para accesibilidad
 * 5. ACTIVAR debug solo en desarrollo
 * 6. CONSIDERAR el tamaño de los datos para performance
 * 
 * =============================================================================
 * TESTING:
 * =============================================================================
 * 
 * // Para testing automatizado
 * cy.get('[data-testid="copy-button"]')
 *   .should('have.attr', 'data-status', 'idle')
 *   .click()
 *   .should('have.attr', 'data-status', 'copied');
 * 
 * // Para testing visual
 * <CopyButton data-testid="copy-button" />
 * 
 * =============================================================================
 * DEPENDENCIAS:
 * =============================================================================
 * - useClipboard hook (manejo de estado y lógica de copia)
 * - Lucide icons (Copy, Check, AlertTriangle)
 * - Design system colors (text-green-500, text-red-500, etc.)
 * =============================================================================
 */

import { ReactNode } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { useClipboard } from '../../hooks/fluxcore';

interface CopyButtonProps {
  /** El texto a copiar - el botón NO sabe qué es */
  text: string;
  /** Variante de tamaño */
  size?: 'sm' | 'md' | 'lg';
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Clases adicionales */
  className?: string;
  /** Texto del tooltip */
  title?: string;
  /** Callback cuando se copia exitosamente */
  onSuccess?: () => void;
  /** Callback cuando falla - EXPONE ERRORES */
  onError?: (error: Error) => void;
  /** Para debugging - muestra estado actual */
  debug?: boolean;
  /** Label opcional (si se proporciona, se renderiza como botón con texto) */
  children?: ReactNode;
  /** Variante visual (opcional para compatibilidad) */
  variant?: 'ghost' | 'solid' | 'outline';
}

export function CopyButton({ 
  text,
  size = 'sm',
  disabled,
  className = '',
  title = "Copiar",
  onSuccess,
  onError,
  debug = false,
  children,
  variant
}: CopyButtonProps) {
  // VALIDACIÓN DE ENTRADAS - PRINCIPIO DE FAIL FAST
  if (typeof text !== 'string') {
    const error = new Error(`CopyButton: text debe ser string, recibido ${typeof text}`);
    console.error('[CopyButton] Error de tipo:', error);
    onError?.(error);
    return (
      <button
        type="button"
        disabled
        className={`p-1.5 rounded transition-colors disabled:opacity-50 ${className}`}
        title="Error: tipo de dato inválido"
      >
        <AlertTriangle size={14} className="text-red-500" />
      </button>
    );
  }

  const { copy, isCopied, isError, status } = useClipboard({ 
    duration: 2000,
    onSuccess,
    onError: (error) => {
      console.error('[CopyButton] Error al copiar:', error);
      onError?.(error);
    }
  });

  // LOGGING PARA DEBUGGING
  if (debug) {
    console.log('[CopyButton] Estado:', { 
      status, 
      isCopied, 
      isError, 
      textLength: text.length,
      disabled: disabled || !text
    });
  }

  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5'
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18
  };

  // ESTADOS VISUALES - EXPOSED AND EXPLICIT
  const getVisualState = () => {
    if (isError) return {
      className: 'text-red-500 bg-red-500/10',
      icon: AlertTriangle,
      title: 'Error al copiar',
      ariaLabel: 'Error al copiar'
    };
    
    if (isCopied) return {
      className: variant === 'solid' ? 'bg-success text-inverse' : 'text-green-500 bg-green-500/10',
      icon: Check,
      title: '¡Copiado!',
      ariaLabel: 'Copiado exitosamente'
    };
    
    return {
      className: variant === 'solid' ? 'bg-accent text-inverse hover:bg-accent/80' : 'text-muted hover:text-primary hover:bg-hover',
      icon: Copy,
      title: title,
      ariaLabel: title || 'Copiar'
    };
  };

  const visualState = getVisualState();
  const Icon = visualState.icon;

  return (
    <button
      type="button"
      onClick={() => {
        if (debug) console.log('[CopyButton] Click, texto:', text);
        copy(text);
      }}
      disabled={disabled || !text}
      className={`
        ${sizes[size]} 
        rounded transition-colors 
        disabled:opacity-50 disabled:cursor-not-allowed
        ${visualState.className}
        ${className}
      `}
      title={visualState.title}
      aria-label={visualState.ariaLabel}
      data-status={status} // Para debugging y testing
      data-debug={debug}
    >
      <div className="flex items-center gap-2">
        <Icon size={iconSizes[size]} />
        {children && <span className="text-[11px] font-medium">{children}</span>}
      </div>
    </button>
  );
}

export default CopyButton;
