/**
 * FC-407: Badge Component
 * Sistema de badges canónico para indicadores de estado
 * 
 * Variantes:
 * - info: Información general (azul)
 * - success: Éxito o activo (verde)
 * - warning: Advertencia (amarillo)
 * - error: Error o peligro (rojo)
 * - neutral: Neutral o inactivo (gris)
 * 
 * Tamaños:
 * - sm: Pequeño
 * - md: Mediano (default)
 * - lg: Grande
 * 
 * Estilos:
 * - solid: Fondo sólido
 * - soft: Fondo suave con transparencia
 * - outline: Solo borde
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeStyle = 'solid' | 'soft' | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Variante de color */
  variant?: BadgeVariant;
  /** Tamaño del badge */
  size?: BadgeSize;
  /** Estilo visual */
  badgeStyle?: BadgeStyle;
  /** Icono a la izquierda */
  leftIcon?: ReactNode;
  /** Icono a la derecha */
  rightIcon?: ReactNode;
  /** Mostrar punto indicador */
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, Record<BadgeStyle, string>> = {
  info: {
    solid: 'bg-accent text-inverse',
    soft: 'bg-accent/20 text-accent',
    outline: 'border border-accent text-accent',
  },
  success: {
    solid: 'bg-success text-inverse',
    soft: 'bg-success/20 text-success',
    outline: 'border border-success text-success',
  },
  warning: {
    solid: 'bg-warning text-inverse',
    soft: 'bg-warning/20 text-warning',
    outline: 'border border-warning text-warning',
  },
  error: {
    solid: 'bg-error text-inverse',
    soft: 'bg-error/20 text-error',
    outline: 'border border-error text-error',
  },
  neutral: {
    solid: 'bg-elevated text-primary border border-subtle',
    soft: 'bg-hover text-secondary',
    outline: 'border border-subtle text-secondary',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

const dotStyles: Record<BadgeVariant, string> = {
  info: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  neutral: 'bg-muted',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'neutral',
      size = 'md',
      badgeStyle = 'soft',
      leftIcon,
      rightIcon,
      dot = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={clsx(
          // Base styles
          'inline-flex items-center gap-1.5',
          'rounded-full font-medium whitespace-nowrap',
          
          // Variant styles
          variantStyles[variant][badgeStyle],
          
          // Size styles
          sizeStyles[size],
          
          // Custom className
          className
        )}
        {...props}
      >
        {/* Dot indicator */}
        {dot && (
          <span className={clsx(
            'w-1.5 h-1.5 rounded-full',
            dotStyles[variant]
          )} />
        )}
        
        {/* Left icon */}
        {leftIcon && (
          <span className="flex-shrink-0">
            {leftIcon}
          </span>
        )}
        
        {/* Content */}
        {children}
        
        {/* Right icon */}
        {rightIcon && (
          <span className="flex-shrink-0">
            {rightIcon}
          </span>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
