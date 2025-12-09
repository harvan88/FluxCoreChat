/**
 * FC-406: Card Component
 * Sistema de tarjetas canónico con estructura predefinida
 * 
 * Estructura:
 * - Card: Contenedor principal
 * - CardHeader: Encabezado con título y acciones
 * - CardBody: Contenido principal
 * - CardFooter: Pie con acciones
 * 
 * Variantes:
 * - default: Tarjeta estándar
 * - elevated: Con sombra elevada
 * - bordered: Con borde destacado
 * - interactive: Hover y click
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'interactive';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Variante visual de la tarjeta */
  variant?: CardVariant;
  /** Padding personalizado */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Título del header */
  title?: string;
  /** Subtítulo o descripción */
  subtitle?: string;
  /** Acciones del header (botones, iconos) */
  actions?: ReactNode;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Padding personalizado */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Alineación del contenido */
  align?: 'left' | 'center' | 'right' | 'between';
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-elevated border border-subtle',
  elevated: 'bg-elevated border border-subtle shadow-lg',
  bordered: 'bg-elevated border-2 border-accent/20',
  interactive: 'bg-elevated border border-subtle hover:border-accent/50 hover:shadow-md transition-all cursor-pointer',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'none',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-xl overflow-hidden',
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  (
    {
      title,
      subtitle,
      actions,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'px-4 py-3 border-b border-subtle',
          'flex items-center justify-between gap-4',
          className
        )}
        {...props}
      >
        {/* Title Section */}
        {(title || subtitle || children) && (
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-primary truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-secondary mt-0.5 truncate">
                {subtitle}
              </p>
            )}
            {children}
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  (
    {
      padding = 'md',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  (
    {
      align = 'right',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const alignStyles = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'px-4 py-3 border-t border-subtle',
          'flex items-center gap-3',
          alignStyles[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
