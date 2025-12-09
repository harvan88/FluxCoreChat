/**
 * FC-405: Input Component
 * Sistema de inputs canónico con variantes predefinidas
 * 
 * Tipos:
 * - text: Texto simple
 * - search: Búsqueda con icono
 * - email: Email con validación
 * - password: Contraseña con toggle
 * - number: Numérico
 * - textarea: Área de texto
 * 
 * Estados:
 * - error: Con mensaje de error
 * - disabled: Deshabilitado
 * - readonly: Solo lectura
 */

import { forwardRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { Search, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

export type InputVariant = 'text' | 'search' | 'email' | 'password' | 'number' | 'textarea';

interface BaseInputProps {
  /** Variante del input */
  variant?: InputVariant;
  /** Etiqueta del campo */
  label?: string;
  /** Mensaje de error */
  error?: string;
  /** Texto de ayuda */
  helperText?: string;
  /** Icono a la izquierda */
  leftIcon?: ReactNode;
  /** Icono a la derecha */
  rightIcon?: ReactNode;
  /** Ancho completo */
  fullWidth?: boolean;
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, BaseInputProps {}
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {}

const inputBaseStyles = clsx(
  'w-full rounded-lg transition-colors',
  'bg-elevated text-primary placeholder:text-muted',
  'border border-subtle',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'read-only:bg-surface read-only:cursor-default'
);

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    
    const isPassword = variant === 'password';
    const isSearch = variant === 'search';
    const hasError = !!error;
    
    const inputType = isPassword 
      ? (showPassword ? 'text' : 'password')
      : variant === 'search' ? 'text' : variant;

    const renderInput = () => (
      <div className="relative">
        {/* Left Icon */}
        {(leftIcon || isSearch) && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {isSearch ? <Search size={18} /> : leftIcon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          type={inputType}
          className={clsx(
            inputBaseStyles,
            'px-3 py-2',
            (leftIcon || isSearch) && 'pl-10',
            (rightIcon || isPassword) && 'pr-10',
            hasError && 'border-error focus:border-error focus:ring-error',
            className
          )}
          {...props}
        />

        {/* Right Icon / Password Toggle */}
        {(rightIcon || isPassword) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isPassword ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted hover:text-primary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            ) : (
              <div className="text-muted pointer-events-none">{rightIcon}</div>
            )}
          </div>
        )}
      </div>
    );

    return (
      <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label className="text-sm font-medium text-primary">
            {label}
          </label>
        )}

        {/* Input */}
        {renderInput()}

        {/* Helper Text / Error */}
        {(helperText || error) && (
          <p className={clsx(
            'text-xs',
            hasError ? 'text-error' : 'text-muted'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
      className,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label className="text-sm font-medium text-primary">
            {label}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          rows={rows}
          className={clsx(
            inputBaseStyles,
            'px-3 py-2 resize-y',
            hasError && 'border-error focus:border-error focus:ring-error',
            className
          )}
          {...props}
        />

        {/* Helper Text / Error */}
        {(helperText || error) && (
          <p className={clsx(
            'text-xs',
            hasError ? 'text-error' : 'text-muted'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
