/**
 * FC-410: Checkbox Component
 * Checkbox y Radio buttons canónicos
 * 
 * Características:
 * - Checkbox simple
 * - Radio button
 * - Estados indeterminate
 * - Etiquetas y descripciones
 * - Grupos de opciones
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';
import clsx from 'clsx';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Etiqueta del checkbox */
  label?: string;
  /** Descripción adicional */
  description?: string;
  /** Estado indeterminado */
  indeterminate?: boolean;
  /** Mensaje de error */
  error?: string;
}

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Etiqueta del radio */
  label?: string;
  /** Descripción adicional */
  description?: string;
  /** Mensaje de error */
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      indeterminate = false,
      error,
      className,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1">
        <label className={clsx(
          'inline-flex items-start gap-3',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}>
          {/* Checkbox Input */}
          <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
            <input
              ref={ref}
              type="checkbox"
              checked={checked}
              disabled={disabled}
              className={clsx(
                'peer sr-only',
                className
              )}
              {...props}
            />
            
            {/* Custom Checkbox */}
            <div className={clsx(
              'w-5 h-5 rounded border-2 transition-all',
              'flex items-center justify-center',
              checked || indeterminate
                ? 'bg-accent border-accent'
                : hasError
                  ? 'bg-surface border-error'
                  : 'bg-surface border-subtle',
              !disabled && 'peer-focus:ring-2 peer-focus:ring-accent peer-focus:ring-offset-2 peer-focus:ring-offset-base',
              !disabled && !checked && !indeterminate && 'hover:border-accent'
            )}>
              {checked && (
                <Check size={14} className="text-inverse" strokeWidth={3} />
              )}
              {indeterminate && !checked && (
                <Minus size={14} className="text-inverse" strokeWidth={3} />
              )}
            </div>
          </div>

          {/* Label & Description */}
          {(label || description) && (
            <div className="flex-1 min-w-0">
              {label && (
                <div className="text-sm font-medium text-primary">
                  {label}
                </div>
              )}
              {description && (
                <div className="text-xs text-secondary mt-0.5">
                  {description}
                </div>
              )}
            </div>
          )}
        </label>

        {/* Error */}
        {error && (
          <p className="text-xs text-error ml-8">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      error,
      className,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1">
        <label className={clsx(
          'inline-flex items-start gap-3',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}>
          {/* Radio Input */}
          <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
            <input
              ref={ref}
              type="radio"
              checked={checked}
              disabled={disabled}
              className={clsx(
                'peer sr-only',
                className
              )}
              {...props}
            />
            
            {/* Custom Radio */}
            <div className={clsx(
              'w-5 h-5 rounded-full border-2 transition-all',
              'flex items-center justify-center',
              checked
                ? 'bg-accent border-accent'
                : hasError
                  ? 'bg-surface border-error'
                  : 'bg-surface border-subtle',
              !disabled && 'peer-focus:ring-2 peer-focus:ring-accent peer-focus:ring-offset-2 peer-focus:ring-offset-base',
              !disabled && !checked && 'hover:border-accent'
            )}>
              {checked && (
                <div className="w-2 h-2 rounded-full bg-inverse" />
              )}
            </div>
          </div>

          {/* Label & Description */}
          {(label || description) && (
            <div className="flex-1 min-w-0">
              {label && (
                <div className="text-sm font-medium text-primary">
                  {label}
                </div>
              )}
              {description && (
                <div className="text-xs text-secondary mt-0.5">
                  {description}
                </div>
              )}
            </div>
          )}
        </label>

        {/* Error */}
        {error && (
          <p className="text-xs text-error ml-8">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

// RadioGroup helper component
export interface RadioGroupProps {
  /** Opciones del grupo */
  options: Array<{
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;
  /** Valor seleccionado */
  value?: string;
  /** Callback cuando cambia el valor */
  onChange?: (value: string) => void;
  /** Nombre del grupo */
  name: string;
  /** Mensaje de error */
  error?: string;
  /** Orientación */
  orientation?: 'vertical' | 'horizontal';
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      options,
      value,
      onChange,
      name,
      error,
      orientation = 'vertical',
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'flex gap-4',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        )}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            label={option.label}
            description={option.description}
            disabled={option.disabled}
            error={value === option.value ? error : undefined}
          />
        ))}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
