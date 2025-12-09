/**
 * FC-404: Button Component
 * Sistema de botones canónico con variantes predefinidas
 * 
 * Variantes:
 * - primary: Acción principal (bg-accent)
 * - secondary: Acción secundaria (bg-elevated)
 * - ghost: Acción terciaria (transparente)
 * - danger: Acción destructiva (bg-error)
 * 
 * Tamaños:
 * - sm: Pequeño (py-1.5 px-3)
 * - md: Mediano (py-2 px-4) - default
 * - lg: Grande (py-3 px-6)
 * 
 * Estados:
 * - disabled: Deshabilitado
 * - loading: Cargando con spinner
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante visual del botón */
  variant?: ButtonVariant;
  /** Tamaño del botón */
  size?: ButtonSize;
  /** Mostrar estado de carga */
  loading?: boolean;
  /** Icono a la izquierda del texto */
  leftIcon?: ReactNode;
  /** Icono a la derecha del texto */
  rightIcon?: ReactNode;
  /** Ancho completo */
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-inverse hover:bg-accent/80 active:bg-accent/90',
  secondary: 'bg-elevated text-primary border border-subtle hover:bg-hover active:bg-active',
  ghost: 'bg-transparent text-secondary hover:bg-hover hover:text-primary active:bg-active',
  danger: 'bg-error/20 text-error border border-error/30 hover:bg-error/30 active:bg-error/40',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'py-1.5 px-3 text-sm',
  md: 'py-2 px-4 text-base',
  lg: 'py-3 px-6 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          // Base styles
          'inline-flex items-center justify-center gap-2',
          'rounded-lg font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-base',
          
          // Variant styles
          variantStyles[variant],
          
          // Size styles
          sizeStyles[size],
          
          // State styles
          isDisabled && 'opacity-50 cursor-not-allowed',
          
          // Width
          fullWidth && 'w-full',
          
          // Custom className
          className
        )}
        {...props}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
