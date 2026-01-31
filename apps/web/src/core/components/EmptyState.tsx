/**
 * EmptyState - Componente visual para estados vacíos
 * 
 * PRINCIPIO: Componente puramente visual, sin semántica del sistema.
 * La vista que lo usa decide qué mensaje mostrar.
 */

import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Título principal */
  title: string;
  /** Subtítulo o descripción */
  subtitle?: string;
  /** Icono a mostrar (componente React) */
  icon?: ReactNode;
  /** Acción opcional (botón, link, etc.) */
  action?: ReactNode;
  /** Clases CSS adicionales */
  className?: string;
}

export function EmptyState({
  title,
  subtitle,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-full text-center px-4 ${className}`}>
      {icon && (
        <div className="mb-4 text-muted">
          {icon}
        </div>
      )}
      <p className="text-lg text-secondary font-medium">{title}</p>
      {subtitle && (
        <p className="text-sm text-muted mt-2 max-w-md">{subtitle}</p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
