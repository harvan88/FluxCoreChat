/**
 * ThemeToggle - Componente para cambiar entre tema claro y oscuro
 */

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../store/themeStore';
import clsx from 'clsx';

type Theme = 'light' | 'dark' | 'system';

interface ThemeOption {
  value: Theme;
  icon: React.ReactNode;
  label: string;
}

const themeOptions: ThemeOption[] = [
  { value: 'light', icon: <Sun size={16} />, label: 'Claro' },
  { value: 'dark', icon: <Moon size={16} />, label: 'Oscuro' },
  { value: 'system', icon: <Monitor size={16} />, label: 'Sistema' },
];

interface ThemeToggleProps {
  /** Variante de visualización */
  variant?: 'buttons' | 'select' | 'simple';
  /** Tamaño del componente */
  size?: 'sm' | 'md' | 'lg';
  /** Mostrar labels */
  showLabels?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Toggle simple entre claro y oscuro
 */
export function ThemeToggleSimple({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        'p-2 rounded-lg transition-colors',
        'bg-hover hover:bg-active',
        'text-secondary hover:text-primary',
        className
      )}
      title={resolvedTheme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      aria-label="Cambiar tema"
    >
      {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

/**
 * Selector de tema con 3 opciones
 */
export function ThemeToggle({ 
  variant = 'buttons', 
  size = 'md',
  showLabels = true,
  className 
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  
  const sizeClasses = {
    sm: 'text-xs gap-1 p-1',
    md: 'text-sm gap-2 p-1.5',
    lg: 'text-base gap-2 p-2',
  };
  
  const buttonSizeClasses = {
    sm: 'px-2 py-1',
    md: 'px-3 py-1.5',
    lg: 'px-4 py-2',
  };

  if (variant === 'simple') {
    return <ThemeToggleSimple className={className} />;
  }

  if (variant === 'select') {
    return (
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className={clsx(
          'rounded-lg border transition-colors',
          'bg-elevated border-default',
          'text-primary',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]',
          sizeClasses[size],
          className
        )}
        aria-label="Seleccionar tema"
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  // Variant: buttons (default)
  return (
    <div 
      className={clsx(
        'inline-flex rounded-lg p-1',
        'bg-elevated',
        className
      )}
      role="radiogroup"
      aria-label="Seleccionar tema"
    >
      {themeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={clsx(
            'flex items-center gap-1.5 rounded-md transition-all duration-200',
            buttonSizeClasses[size],
            theme === option.value
              ? 'bg-accent text-inverse shadow-sm'
              : 'text-secondary hover:text-primary hover:bg-hover'
          )}
          role="radio"
          aria-checked={theme === option.value}
          title={option.label}
        >
          {option.icon}
          {showLabels && <span>{option.label}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Componente de configuración de tema para Settings
 */
export function ThemeSettings() {
  const { theme, resolvedTheme } = useTheme();
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-primary mb-1">
          Tema de la interfaz
        </h3>
        <p className="text-xs text-muted mb-3">
          Elige cómo quieres que se vea FluxCore
        </p>
        <ThemeToggle variant="buttons" size="md" showLabels />
      </div>
      
      {theme === 'system' && (
        <p className="text-xs text-muted">
          Actualmente usando tema {resolvedTheme === 'dark' ? 'oscuro' : 'claro'} 
          {' '}según la preferencia de tu sistema.
        </p>
      )}
    </div>
  );
}

export default ThemeToggle;
