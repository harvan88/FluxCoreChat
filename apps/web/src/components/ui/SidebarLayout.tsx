/**
 * FC-412: SidebarLayout Component
 * Layout unificado para todos los sidebars de la aplicación
 * 
 * Estructura:
 * - Header con título, acciones y botón de pin
 * - Barra de búsqueda opcional
 * - Contenido principal con scroll
 * - Footer opcional
 */

import { forwardRef, type ReactNode, type HTMLAttributes } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import clsx from 'clsx';
import { Input } from './Input';

export interface SidebarLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Título del sidebar */
  title: string;
  /** Icono del título */
  icon?: ReactNode;
  /** Acciones del header (botones, etc.) */
  headerActions?: ReactNode;
  /** Mostrar barra de búsqueda */
  showSearch?: boolean;
  /** Placeholder de búsqueda */
  searchPlaceholder?: string;
  /** Valor de búsqueda */
  searchValue?: string;
  /** Callback cuando cambia la búsqueda */
  onSearchChange?: (value: string) => void;
  /** Estado de pin */
  isPinned?: boolean;
  /** Callback cuando se hace toggle de pin */
  onTogglePin?: () => void;
  /** Mostrar botón de pin */
  showPinButton?: boolean;
  /** Footer del sidebar */
  footer?: ReactNode;
  /** Contenido del sidebar */
  children: ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Empty state */
  emptyMessage?: string;
  /** Mostrar empty cuando no hay children */
  isEmpty?: boolean;
}

export const SidebarLayout = forwardRef<HTMLDivElement, SidebarLayoutProps>(
  (
    {
      title,
      icon,
      headerActions,
      showSearch = false,
      searchPlaceholder = 'Buscar...',
      searchValue = '',
      onSearchChange,
      isPinned = false,
      onTogglePin,
      showPinButton = true,
      footer,
      children,
      loading = false,
      emptyMessage = 'No hay elementos',
      isEmpty = false,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'flex flex-col h-full bg-surface',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-subtle">
          <div className="flex items-center justify-between gap-3">
            {/* Title with icon */}
            <div className="flex items-center gap-2 min-w-0">
              {icon && (
                <span className="text-accent flex-shrink-0">
                  {icon}
                </span>
              )}
              <h2 className="text-lg font-semibold text-primary truncate">
                {title}
              </h2>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {headerActions}
              
              {showPinButton && onTogglePin && (
                <button
                  onClick={onTogglePin}
                  className={clsx(
                    'p-1.5 rounded-lg transition-colors',
                    isPinned
                      ? 'text-accent bg-accent/10'
                      : 'text-muted hover:text-primary hover:bg-hover'
                  )}
                  title={isPinned ? 'Desfijar sidebar' : 'Fijar sidebar'}
                >
                  {isPinned ? <Lock size={16} /> : <LockOpen size={16} />}
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          {showSearch && (
            <div className="mt-3">
              <Input
                variant="search"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted">
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-subtle">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

SidebarLayout.displayName = 'SidebarLayout';

// Subcomponentes para estructura más granular

export interface SidebarSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Título de la sección */
  title?: string;
  /** Acciones de la sección */
  actions?: ReactNode;
  /** Colapsable */
  collapsible?: boolean;
  /** Estado de colapso */
  collapsed?: boolean;
  /** Callback al toggle colapso */
  onToggleCollapse?: () => void;
  children: ReactNode;
}

export const SidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(
  (
    {
      title,
      actions,
      collapsible = false,
      collapsed = false,
      onToggleCollapse,
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx('py-2', className)}
        {...props}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-1.5">
            <button
              onClick={collapsible ? onToggleCollapse : undefined}
              className={clsx(
                'text-xs font-semibold text-muted uppercase tracking-wider',
                collapsible && 'hover:text-primary cursor-pointer'
              )}
            >
              {title}
            </button>
            {actions && (
              <div className="flex items-center gap-1">
                {actions}
              </div>
            )}
          </div>
        )}
        {!collapsed && children}
      </div>
    );
  }
);

SidebarSection.displayName = 'SidebarSection';

export interface SidebarItemProps extends HTMLAttributes<HTMLButtonElement> {
  /** Icono del item */
  icon?: ReactNode;
  /** Label principal */
  label: string;
  /** Label secundario */
  secondaryLabel?: string;
  /** Badge o contador */
  badge?: ReactNode;
  /** Estado activo */
  active?: boolean;
  /** Deshabilitado */
  disabled?: boolean;
}

export const SidebarItem = forwardRef<HTMLButtonElement, SidebarItemProps>(
  (
    {
      icon,
      label,
      secondaryLabel,
      badge,
      active = false,
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
          active
            ? 'bg-accent/10 text-accent'
            : 'text-secondary hover:text-primary hover:bg-hover',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {icon && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {label}
          </div>
          {secondaryLabel && (
            <div className="text-xs text-muted truncate">
              {secondaryLabel}
            </div>
          )}
        </div>
        {badge && (
          <div className="flex-shrink-0">
            {badge}
          </div>
        )}
      </button>
    );
  }
);

SidebarItem.displayName = 'SidebarItem';
