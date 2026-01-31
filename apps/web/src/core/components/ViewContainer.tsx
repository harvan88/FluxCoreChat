/**
 * ViewContainer - Wrapper para vistas con header opcional
 * 
 * PRINCIPIO: Componente puramente visual, sin semántica del sistema.
 * Provee estructura consistente para vistas.
 */

import type { ReactNode } from 'react';

export interface ViewContainerProps {
  /** Título del header */
  title?: string;
  /** Subtítulo opcional */
  subtitle?: string;
  /** Acciones del header (botones, etc.) */
  headerActions?: ReactNode;
  /** Contenido principal */
  children: ReactNode;
  /** Si debe mostrar el header */
  showHeader?: boolean;
  /** Clases CSS adicionales para el container */
  className?: string;
  /** Clases CSS adicionales para el contenido */
  contentClassName?: string;
}

export function ViewContainer({
  title,
  subtitle,
  headerActions,
  children,
  showHeader = true,
  className = '',
  contentClassName = '',
}: ViewContainerProps) {
  return (
    <div className={`flex flex-col h-full bg-surface ${className}`}>
      {showHeader && title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-subtle flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-primary">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}
      <div className={`flex-1 overflow-y-auto ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
