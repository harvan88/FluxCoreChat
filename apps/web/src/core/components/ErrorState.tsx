/**
 * ErrorState - Componente visual para estados de error
 * 
 * PRINCIPIO: Componente puramente visual, sin semántica del sistema.
 * La vista que lo usa decide qué mensaje de error mostrar.
 */

import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export interface ErrorStateProps {
  /** Título del error */
  title?: string;
  /** Mensaje de error */
  message: string;
  /** Callback para reintentar */
  onRetry?: () => void;
  /** Texto del botón de reintentar */
  retryLabel?: string;
  /** Icono personalizado */
  icon?: ReactNode;
  /** Clases CSS adicionales */
  className?: string;
}

export function ErrorState({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Reintentar',
  icon,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-full px-4 ${className}`}>
      <div className="max-w-md w-full bg-elevated border border-subtle rounded-lg p-6 text-center">
        <div className="flex justify-center mb-4 text-red-500">
          {icon || <AlertCircle size={32} />}
        </div>
        <h3 className="text-primary font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted break-words">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 rounded-md bg-hover text-primary hover:bg-active transition-colors"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
