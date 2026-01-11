/**
 * SliderInput - Barra deslizante con input numérico
 * 
 * Componente canónico para valores numéricos como temperatura, porcentajes, etc.
 * Diseño: Barra horizontal + círculo deslizante + campo numérico
 * 
 * Sigue el patrón visual del sistema de diseño FluxCore.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SliderInputProps {
  /** Valor actual */
  value: number;
  /** Callback cuando cambia el valor */
  onChange: (value: number) => void;
  /** Valor mínimo */
  min?: number;
  /** Valor máximo */
  max?: number;
  /** Paso de incremento */
  step?: number;
  /** Label opcional */
  label?: string;
  /** Unidad de medida (ej: "%", "°C", "tokens") */
  unit?: string;
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Clases adicionales */
  className?: string;
  /** Número de decimales a mostrar */
  decimals?: number;
  /** Ancho del input numérico */
  inputWidth?: string;
}

export function SliderInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit,
  disabled = false,
  className = '',
  decimals = 2,
  inputWidth = 'w-16',
}: SliderInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const calculateValueFromPosition = useCallback((clientX: number) => {
    if (!sliderRef.current) return localValue;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawValue = min + percentage * (max - min);
    
    // Aplicar step
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(min, Math.min(max, steppedValue));
  }, [min, max, step, localValue]);

  const handleSliderChange = useCallback((clientX: number) => {
    const newValue = calculateValueFromPosition(clientX);
    setLocalValue(newValue);
    onChange(newValue);
  }, [calculateValueFromPosition, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    handleSliderChange(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleSliderChange(e.touches[0].clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleSliderChange(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      handleSliderChange(e.touches[0].clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleSliderChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Permitir entrada vacía temporalmente
    if (inputValue === '' || inputValue === '-') {
      setLocalValue(min);
      return;
    }

    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      setLocalValue(clamped);
      onChange(clamped);
    }
  };

  const handleInputBlur = () => {
    // Asegurar que el valor está dentro del rango al perder foco
    const clamped = Math.max(min, Math.min(max, localValue));
    setLocalValue(clamped);
    onChange(clamped);
  };

  // Calcular posición del thumb como porcentaje
  const percentage = ((localValue - min) / (max - min)) * 100;

  // Formatear valor para display
  const formatValue = (val: number) => {
    return decimals > 0 ? val.toFixed(decimals) : val.toString();
  };

  return (
    <div className={`${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm text-secondary mb-2">
          {label}
        </label>
      )}

      <div className="flex items-center gap-3">
        {/* Slider track */}
        <div
          ref={sliderRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`
            relative flex-1 h-2 rounded-full
            ${disabled ? 'bg-elevated cursor-not-allowed' : 'bg-elevated cursor-pointer'}
          `}
        >
          {/* Progress fill */}
          <div
            className={`
              absolute left-0 top-0 h-full rounded-full transition-all duration-75
              ${disabled ? 'bg-muted' : 'bg-accent'}
            `}
            style={{ width: `${percentage}%` }}
          />

          {/* Thumb */}
          <div
            className={`
              absolute top-1/2 -translate-y-1/2 -translate-x-1/2
              w-4 h-4 rounded-full shadow-md
              transition-transform duration-75
              ${disabled 
                ? 'bg-muted cursor-not-allowed' 
                : 'bg-primary cursor-grab active:cursor-grabbing hover:scale-110'
              }
              ${isDragging ? 'scale-110' : ''}
            `}
            style={{ left: `${percentage}%` }}
          />
        </div>

        {/* Numeric input */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={formatValue(localValue)}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={`
              ${inputWidth} h-8 px-2 text-sm text-right
              bg-elevated border border-default rounded
              text-primary placeholder:text-muted
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20
              disabled:opacity-50 disabled:cursor-not-allowed
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
            `}
          />
          {unit && (
            <span className="text-sm text-muted min-w-[2rem]">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SliderInput;
