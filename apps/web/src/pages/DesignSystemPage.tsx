import { useEffect, useState, useCallback } from 'react';
import { useThemeStore } from '../store/themeStore';
import { Sun, Moon, Monitor, Copy, Check, RotateCcw } from 'lucide-react';

interface ColorToken {
  variable: string;
  label: string;
  description: string;
}

const COLOR_TOKENS: Record<string, ColorToken[]> = {
  'Fondos (Backgrounds)': [
    { variable: '--bg-base', label: 'bg-base', description: 'Fondo principal de la app' },
    { variable: '--bg-surface', label: 'bg-surface', description: 'Tarjetas, paneles, sidebars' },
    { variable: '--bg-elevated', label: 'bg-elevated', description: 'Modales, dropdowns, tooltips' },
    { variable: '--bg-hover', label: 'bg-hover', description: 'Estado hover de elementos' },
    { variable: '--bg-active', label: 'bg-active', description: 'Estado activo/seleccionado' },
  ],
  'Bordes (Borders)': [
    { variable: '--border-subtle', label: 'border-subtle', description: 'Separadores sutiles' },
    { variable: '--border-default', label: 'border-default', description: 'Bordes normales' },
    { variable: '--border-strong', label: 'border-strong', description: 'Bordes enfatizados' },
  ],
  'Texto (Text)': [
    { variable: '--text-primary', label: 'text-primary', description: 'Texto principal, títulos' },
    { variable: '--text-secondary', label: 'text-secondary', description: 'Texto secundario, descripciones' },
    { variable: '--text-muted', label: 'text-muted', description: 'Texto deshabilitado, hints' },
    { variable: '--text-inverse', label: 'text-inverse', description: 'Texto sobre fondos accent' },
  ],
  'Accent (Principal)': [
    { variable: '--accent-primary', label: 'bg-accent / text-accent', description: 'Color principal de la marca' },
    { variable: '--accent-hover', label: 'bg-accent-hover', description: 'Hover del color accent' },
    { variable: '--accent-muted', label: 'bg-accent-muted', description: 'Fondo sutil con accent' },
  ],
  'Estados Semánticos': [
    { variable: '--color-success', label: 'text-success / bg-success', description: 'Éxito, confirmación' },
    { variable: '--color-warning', label: 'text-warning / bg-warning', description: 'Advertencia, precaución' },
    { variable: '--color-error', label: 'text-error / bg-error', description: 'Error, peligro' },
    { variable: '--color-info', label: 'text-info', description: 'Información' },
  ],
};

// Valores por defecto del tema oscuro
const DARK_DEFAULTS: Record<string, string> = {
  '--bg-base': '#0d0d0d',
  '--bg-surface': '#141414',
  '--bg-elevated': '#1a1a1a',
  '--bg-hover': '#242424',
  '--bg-active': '#2a2a2a',
  '--border-subtle': '#1f1f1f',
  '--border-default': '#2a2a2a',
  '--border-strong': '#3a3a3a',
  '--text-primary': '#f5f5f5',
  '--text-secondary': '#a3a3a3',
  '--text-muted': '#666666',
  '--text-inverse': '#0d0d0d',
  '--accent-primary': '#3b82f6',
  '--accent-hover': '#2563eb',
  '--accent-muted': 'rgba(59, 130, 246, 0.12)',
  '--color-success': '#22c55e',
  '--color-warning': '#f59e0b',
  '--color-error': '#ef4444',
  '--color-info': '#3b82f6',
};

const LIGHT_DEFAULTS: Record<string, string> = {
  '--bg-base': '#ffffff',
  '--bg-surface': '#fafafa',
  '--bg-elevated': '#f5f5f5',
  '--bg-hover': '#ebebeb',
  '--bg-active': '#e0e0e0',
  '--border-subtle': '#f0f0f0',
  '--border-default': '#e5e5e5',
  '--border-strong': '#d4d4d4',
  '--text-primary': '#171717',
  '--text-secondary': '#525252',
  '--text-muted': '#a3a3a3',
  '--text-inverse': '#ffffff',
  '--accent-primary': '#2563eb',
  '--accent-hover': '#1d4ed8',
  '--accent-muted': 'rgba(37, 99, 235, 0.08)',
  '--color-success': '#16a34a',
  '--color-warning': '#d97706',
  '--color-error': '#dc2626',
  '--color-info': '#2563eb',
};

function rgbaToHex(rgba: string): string {
  if (rgba.startsWith('#')) return rgba;
  if (rgba.startsWith('rgba')) {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  }
  if (rgba.startsWith('rgb')) {
    const match = rgba.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  }
  return rgba;
}

export function DesignSystemPage() {
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadCurrentValues = useCallback(() => {
    const computed = getComputedStyle(document.documentElement);
    const currentValues: Record<string, string> = {};
    
    Object.values(COLOR_TOKENS).flat().forEach(token => {
      const value = computed.getPropertyValue(token.variable).trim();
      currentValues[token.variable] = value || (resolvedTheme === 'dark' ? DARK_DEFAULTS[token.variable] : LIGHT_DEFAULTS[token.variable]);
    });
    
    setValues(currentValues);
  }, [resolvedTheme]);

  useEffect(() => {
    // Pequeño delay para asegurar que el tema se aplicó
    const timer = setTimeout(loadCurrentValues, 50);
    return () => clearTimeout(timer);
  }, [loadCurrentValues, resolvedTheme]);

  const handleColorChange = (variable: string, newValue: string) => {
    document.documentElement.style.setProperty(variable, newValue);
    setValues(prev => ({ ...prev, [variable]: newValue }));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    const defaults = resolvedTheme === 'dark' ? DARK_DEFAULTS : LIGHT_DEFAULTS;
    Object.entries(defaults).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(variable, value);
    });
    setValues(defaults);
    setHasChanges(false);
  };

  const generateCSS = () => {
    const lines = Object.entries(values)
      .map(([variable, value]) => `  ${variable}: ${value};`)
      .join('\n');
    return `:root[data-theme="${resolvedTheme}"] {\n${lines}\n}`;
  };

  const copyCSS = async () => {
    await navigator.clipboard.writeText(generateCSS());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-base text-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface border-b border-default px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">FluxCore Design System</h1>
            <p className="text-secondary text-sm">Editor visual de tokens de diseño</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
            <div className="flex bg-elevated rounded-lg p-1 gap-1">
              <button
                onClick={() => setTheme('light')}
                className={`p-2 rounded-md transition-colors ${theme === 'light' ? 'bg-accent text-inverse' : 'hover:bg-hover'}`}
                title="Tema claro"
              >
                <Sun size={18} />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'bg-accent text-inverse' : 'hover:bg-hover'}`}
                title="Tema oscuro"
              >
                <Moon size={18} />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-2 rounded-md transition-colors ${theme === 'system' ? 'bg-accent text-inverse' : 'hover:bg-hover'}`}
                title="Tema del sistema"
              >
                <Monitor size={18} />
              </button>
            </div>

            {/* Reset Button */}
            {hasChanges && (
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-2 px-3 py-2 bg-elevated hover:bg-hover rounded-lg transition-colors text-sm"
              >
                <RotateCcw size={16} />
                Resetear
              </button>
            )}

            {/* Copy CSS Button */}
            <button
              onClick={copyCSS}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-inverse rounded-lg transition-colors"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copiado!' : 'Copiar CSS'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Info Banner */}
        <div className="bg-accent-muted border border-accent rounded-lg p-4 mb-8">
          <p className="text-sm">
            <strong>Cómo usar:</strong> Modifica los colores con el selector o escribe valores HEX/RGB. 
            Los cambios se aplican en tiempo real. Cuando estés satisfecho, copia el CSS y pégalo en{' '}
            <code className="bg-elevated px-1 rounded">apps/web/src/index.css</code>
          </p>
        </div>

        {/* Color Sections */}
        <div className="grid gap-8">
          {Object.entries(COLOR_TOKENS).map(([category, tokens]) => (
            <section key={category} className="bg-surface rounded-xl border border-subtle p-6">
              <h2 className="text-lg font-semibold mb-4">{category}</h2>
              
              <div className="grid gap-4">
                {tokens.map(token => {
                  const currentValue = values[token.variable] || '';
                  const hexValue = rgbaToHex(currentValue);
                  
                  return (
                    <div 
                      key={token.variable}
                      className="flex items-center gap-4 p-3 bg-elevated rounded-lg"
                    >
                      {/* Color Preview & Picker */}
                      <div className="relative">
                        <div 
                          className="w-12 h-12 rounded-lg border border-default shadow-inner"
                          style={{ backgroundColor: currentValue }}
                        />
                        <input
                          type="color"
                          value={hexValue.startsWith('#') ? hexValue : '#000000'}
                          onChange={(e) => handleColorChange(token.variable, e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Seleccionar color"
                        />
                      </div>

                      {/* Token Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono text-accent">{token.variable}</code>
                          <span className="text-xs text-muted">→</span>
                          <code className="text-xs font-mono text-secondary">.{token.label}</code>
                        </div>
                        <p className="text-xs text-muted truncate">{token.description}</p>
                      </div>

                      {/* Value Input */}
                      <input
                        type="text"
                        value={currentValue}
                        onChange={(e) => handleColorChange(token.variable, e.target.value)}
                        className="w-40 bg-base border border-default rounded px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none"
                        placeholder="#000000"
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Live Preview Section */}
        <section className="mt-8 bg-surface rounded-xl border border-subtle p-6">
          <h2 className="text-lg font-semibold mb-4">Vista Previa en Vivo</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Buttons */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-secondary">Botones</h3>
              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 bg-accent text-inverse rounded-lg hover:bg-accent-hover transition-colors">
                  Primary
                </button>
                <button className="px-4 py-2 bg-elevated border border-default rounded-lg hover:bg-hover transition-colors">
                  Secondary
                </button>
                <button className="px-4 py-2 text-muted hover:text-primary transition-colors">
                  Ghost
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="px-3 py-1.5 bg-success text-inverse rounded text-sm">Success</button>
                <button className="px-3 py-1.5 bg-warning text-inverse rounded text-sm">Warning</button>
                <button className="px-3 py-1.5 bg-error text-inverse rounded text-sm">Error</button>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-secondary">Tarjetas</h3>
              <div className="bg-elevated p-4 rounded-lg border border-subtle">
                <h4 className="font-medium text-primary">Título de tarjeta</h4>
                <p className="text-sm text-secondary mt-1">Texto secundario de ejemplo</p>
                <p className="text-xs text-muted mt-2">Texto muted para hints</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-secondary">Inputs</h3>
              <input 
                type="text" 
                placeholder="Input de texto..."
                className="w-full bg-base border border-default rounded-lg px-4 py-2 focus:border-accent focus:outline-none placeholder:text-muted"
              />
              <div className="flex items-center gap-3">
                <input type="checkbox" className="accent-[var(--accent-primary)]" defaultChecked />
                <label className="text-sm">Checkbox activo</label>
              </div>
            </div>

            {/* Text Hierarchy */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-secondary">Jerarquía de texto</h3>
              <p className="text-primary font-semibold">Texto primary (títulos)</p>
              <p className="text-secondary">Texto secondary (descripciones)</p>
              <p className="text-muted text-sm">Texto muted (hints, timestamps)</p>
            </div>
          </div>
        </section>

        {/* Generated CSS Preview */}
        <section className="mt-8 bg-surface rounded-xl border border-subtle p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">CSS Generado</h2>
            <button
              onClick={copyCSS}
              className="flex items-center gap-2 px-3 py-1.5 bg-elevated hover:bg-hover rounded transition-colors text-sm"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              Copiar
            </button>
          </div>
          <pre className="bg-base rounded-lg p-4 overflow-x-auto text-sm font-mono text-secondary border border-subtle">
            {generateCSS()}
          </pre>
        </section>
      </main>
    </div>
  );
}

export default DesignSystemPage;
