/**
 * CollapsibleSection - Sección colapsable con toggle de configuración
 * 
 * Patrón DaVinci Resolve: El toggle indica si la configuración es personalizada (activo)
 * o usa valores por defecto del sistema (inactivo).
 * 
 * Uso:
 * - Toggle activo (azul): Usuario ha personalizado esta sección
 * - Toggle inactivo (gris): Usa configuración por defecto
 */

import { useState, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Switch } from './Switch';

export interface CollapsibleSectionProps {
  /** Título de la sección */
  title: string;
  /** Contenido colapsable */
  children: ReactNode;
  /** Si la sección está expandida inicialmente */
  defaultExpanded?: boolean;
  /** Si el toggle de configuración está activo (personalizado) */
  isCustomized?: boolean;
  /** Callback cuando cambia el estado del toggle */
  onToggleCustomized?: (customized: boolean) => void;
  /** Si mostrar el toggle de configuración */
  showToggle?: boolean;
  /** Icono opcional para el título */
  icon?: ReactNode;
  /** Clases adicionales para el contenedor */
  className?: string;
  /** Si la sección está deshabilitada */
  disabled?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  isCustomized = false,
  onToggleCustomized,
  showToggle = true,
  icon,
  className = '',
  disabled = false,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [customized, setCustomized] = useState(isCustomized);

  useEffect(() => {
    setCustomized(isCustomized);
  }, [isCustomized]);

  const handleToggleExpand = () => {
    if (!disabled) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`border-b border-subtle ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={handleToggleExpand}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-3 px-4 py-3
          text-left transition-colors duration-150
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Toggle switch */}
          {showToggle && (
            <Switch
              checked={customized}
              onCheckedChange={(v) => {
                setCustomized(v);
                onToggleCustomized?.(v);
                // 🔧 AUTO-EXPAND: Si se activa, expandir sección
                if (v === true && !isExpanded) {
                  setIsExpanded(true);
                }
              }}
              disabled={disabled}
              size="sm"
            />
          )}

          {/* Optional icon */}
          {icon && (
            <span className="text-accent flex-shrink-0">
              {icon}
            </span>
          )}

          {/* Title */}
          <span className="text-primary font-medium text-sm truncate">
            {title}
          </span>
        </div>

        {/* Expand/Collapse indicator */}
        <span
          className={`
            text-muted flex-shrink-0 transition-transform duration-150
            ${isExpanded ? 'rotate-0' : '-rotate-90'}
          `}
        >
          <ChevronDown size={16} />
        </span>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleSection;
