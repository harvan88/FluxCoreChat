/**
 * FC-409: Select Component
 * Dropdown estándar con búsqueda y opciones múltiples
 * 
 * Características:
 * - Búsqueda integrada
 * - Selección simple o múltiple
 * - Grupos de opciones
 * - Estados disabled y error
 * - Placeholder personalizable
 */

import { forwardRef, useState, useRef, useEffect, type ReactNode } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import clsx from 'clsx';

export interface SelectOption {
  /** Valor de la opción */
  value: string;
  /** Etiqueta mostrada */
  label: string;
  /** Opción deshabilitada */
  disabled?: boolean;
  /** Icono opcional */
  icon?: ReactNode;
}

export interface SelectProps {
  /** Opciones del select */
  options: SelectOption[];
  /** Valor seleccionado (simple) */
  value?: string;
  /** Valores seleccionados (múltiple) */
  values?: string[];
  /** Callback cuando cambia el valor */
  onChange?: (value: string | string[]) => void;
  /** Placeholder */
  placeholder?: string;
  /** Etiqueta del campo */
  label?: string;
  /** Mensaje de error */
  error?: string;
  /** Texto de ayuda */
  helperText?: string;
  /** Permitir búsqueda */
  searchable?: boolean;
  /** Permitir selección múltiple */
  multiple?: boolean;
  /** Deshabilitado */
  disabled?: boolean;
  /** Ancho completo */
  fullWidth?: boolean;
  /** Permitir limpiar selección */
  clearable?: boolean;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      values = [],
      onChange,
      placeholder = 'Seleccionar...',
      label,
      error,
      helperText,
      searchable = false,
      multiple = false,
      disabled = false,
      fullWidth = true,
      clearable = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedValues = multiple ? values : (value ? [value] : []);
    const hasError = !!error;

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // Focus search input when opening
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    const filteredOptions = searchQuery
      ? options.filter(opt =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        if (!isOpen) {
          setSearchQuery('');
        }
      }
    };

    const handleSelect = (optionValue: string) => {
      if (multiple) {
        const newValues = selectedValues.includes(optionValue)
          ? selectedValues.filter(v => v !== optionValue)
          : [...selectedValues, optionValue];
        onChange?.(newValues);
      } else {
        onChange?.(optionValue);
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(multiple ? [] : '');
    };

    const getDisplayText = () => {
      if (selectedValues.length === 0) return placeholder;
      
      if (multiple) {
        return `${selectedValues.length} seleccionado${selectedValues.length > 1 ? 's' : ''}`;
      }
      
      const selected = options.find(opt => opt.value === value);
      return selected?.label || placeholder;
    };

    return (
      <div
        ref={ref}
        className={clsx('relative', fullWidth && 'w-full')}
      >
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-primary mb-1.5">
            {label}
          </label>
        )}

        {/* Select Button */}
        <div ref={containerRef}>
          <button
            type="button"
            onClick={handleToggle}
            disabled={disabled}
            className={clsx(
              'w-full flex items-center justify-between gap-2',
              'px-3 py-2 rounded-lg transition-colors',
              'bg-elevated text-primary',
              'border',
              hasError ? 'border-error' : 'border-subtle',
              !disabled && 'hover:border-accent focus:border-accent focus:ring-1 focus:ring-accent',
              disabled && 'opacity-50 cursor-not-allowed',
              'focus:outline-none'
            )}
          >
            <span className={clsx(
              'truncate',
              selectedValues.length === 0 && 'text-muted'
            )}>
              {getDisplayText()}
            </span>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {clearable && selectedValues.length > 0 && !disabled && (
                <X
                  size={16}
                  className="text-muted hover:text-primary"
                  onClick={handleClear}
                />
              )}
              <ChevronDown
                size={16}
                className={clsx(
                  'text-muted transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className={clsx(
              'absolute z-50 w-full mt-1',
              'bg-elevated border border-subtle rounded-lg shadow-lg',
              'max-h-60 overflow-hidden flex flex-col'
            )}>
              {/* Search */}
              {searchable && (
                <div className="p-2 border-b border-subtle">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full pl-8 pr-3 py-1.5 bg-surface text-primary text-sm rounded border border-subtle focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted">
                    No se encontraron opciones
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => !option.disabled && handleSelect(option.value)}
                        disabled={option.disabled}
                        className={clsx(
                          'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                          isSelected && 'bg-accent/10 text-accent',
                          !isSelected && !option.disabled && 'text-primary hover:bg-hover',
                          option.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {option.icon && (
                          <span className="flex-shrink-0">{option.icon}</span>
                        )}
                        <span className="flex-1 truncate">{option.label}</span>
                        {isSelected && (
                          <Check size={16} className="flex-shrink-0 text-accent" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Helper Text / Error */}
        {(helperText || error) && (
          <p className={clsx(
            'mt-1.5 text-xs',
            hasError ? 'text-error' : 'text-muted'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
