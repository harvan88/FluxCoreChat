/**
 * V2-4: ExtensionConfigPanel Component
 * 
 * Panel para configurar una extensión instalada.
 */

import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Settings, Info, Terminal } from 'lucide-react';
import clsx from 'clsx';
import { usePanelStore } from '../../store/panelStore';

interface ExtensionConfig {
  [key: string]: any;
}

interface ConfigSchema {
  [key: string]: {
    type: 'boolean' | 'string' | 'number' | 'select';
    label: string;
    description?: string;
    default: any;
    options?: { value: string; label: string }[];
    min?: number;
    max?: number;
  };
}

interface ExtensionConfigPanelProps {
  extensionId: string;
  extensionName: string;
  config: ExtensionConfig;
  schema?: ConfigSchema;
  onSave: (config: ExtensionConfig) => Promise<void>;
  onClose: () => void;
}

// Schema por defecto para core-ai
const coreAISchema: ConfigSchema = {
  enabled: {
    type: 'boolean',
    label: 'Habilitado',
    description: 'Activar o desactivar la extensión de IA',
    default: true,
  },
  provider: {
    type: 'select',
    label: 'Proveedor',
    description: 'Proveedor de IA a utilizar',
    default: 'groq',
    options: [
      { value: 'groq', label: 'Groq' },
      { value: 'openai', label: 'OpenAI' },
    ],
  },
  mode: {
    type: 'select',
    label: 'Modo de operación',
    description: 'Cómo debe comportarse la IA al recibir mensajes',
    default: 'suggest',
    options: [
      { value: 'suggest', label: 'Sugerir (requiere aprobación)' },
      { value: 'auto', label: 'Automático (responde solo)' },
      { value: 'off', label: 'Desactivado' },
    ],
  },
  responseDelay: {
    type: 'number',
    label: 'Delay de respuesta (segundos)',
    description: 'Tiempo de espera antes de responder automáticamente',
    default: 30,
    min: 0,
    max: 300,
  },
  smartDelayEnabled: {
    type: 'boolean',
    label: 'Smart Delay',
    description: 'Permite que el delay se ajuste según la actividad detectada en el chat',
    default: false,
  },
  model: {
    type: 'select',
    label: 'Modelo de IA',
    description: 'Modelo de lenguaje a utilizar',
    default: 'llama-3.1-8b-instant',
    options: [
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (rápido)' },
      { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (potente)' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4o mini (2024-07-18)' },
    ],
  },
  temperature: {
    type: 'number',
    label: 'Temperatura',
    description: 'Mayor = más creativo, menor = más preciso',
    default: 0.7,
    min: 0,
    max: 2,
  },
};

export function ExtensionConfigPanel({
  extensionId,
  extensionName,
  config,
  schema,
  onSave,
  onClose,
}: ExtensionConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<ExtensionConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { openTab } = usePanelStore();

  // Usar schema de core-ai si es esa extensión y no hay schema custom
  const activeSchema = schema || (extensionId.includes('core-ai') ? coreAISchema : {});

  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  const handleChange = (key: string, value: any) => {
    setLocalConfig((prev) => {
      const next = { ...prev, [key]: value };

      if (extensionId.includes('core-ai') && key === 'provider') {
        const provider = value;
        const currentModel = next.model;

        const groqModels = new Set(['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768']);
        const openaiModels = new Set(['gpt-4o-mini-2024-07-18']);

        if (provider === 'openai' && !openaiModels.has(currentModel)) {
          next.model = 'gpt-4o-mini-2024-07-18';
        }

        if (provider === 'groq' && !groqModels.has(currentModel)) {
          next.model = 'llama-3.1-8b-instant';
        }
      }

      return next;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localConfig);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaults: ExtensionConfig = {};
    Object.entries(activeSchema).forEach(([key, field]) => {
      defaults[key] = field.default;
    });
    setLocalConfig(defaults);
    setHasChanges(true);
  };

  const handleOpenPromptInspector = () => {
    openTab('extensions', {
      type: 'extension',
      title: 'Prompt Inspector',
      icon: 'Terminal',
      closable: true,
      context: {
        extensionId,
        extensionName,
        view: 'promptInspector',
      },
    });
  };

  const renderField = (key: string, field: ConfigSchema[string]) => {
    const value = localConfig[key] ?? field.default;

    switch (field.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleChange(key, e.target.checked)}
              className="w-5 h-5 rounded bg-elevated border-subtle text-accent focus:ring-accent"
            />
            <span className="text-primary">{field.label}</span>
          </label>
        );

      case 'select':
        return (
          <div>
            <label className="block text-sm text-secondary mb-1">{field.label}</label>
            <select
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full bg-elevated text-primary rounded-lg px-3 py-2 border border-subtle focus:border-accent focus:outline-none"
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'number':
        return (
          <div>
            <label className="block text-sm text-secondary mb-1">{field.label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(key, parseFloat(e.target.value))}
              min={field.min}
              max={field.max}
              step={field.max && field.max <= 2 ? 0.1 : 1}
              className="w-full bg-elevated text-primary rounded-lg px-3 py-2 border border-subtle focus:border-accent focus:outline-none"
            />
          </div>
        );

      case 'string':
      default:
        return (
          <div>
            <label className="block text-sm text-secondary mb-1">{field.label}</label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full bg-elevated text-primary rounded-lg px-3 py-2 border border-subtle focus:border-accent focus:outline-none"
            />
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="text-accent" size={20} />
          <h2 className="text-lg font-semibold text-primary">{extensionName}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Config Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(activeSchema).map(([key, field]) => (
          <div key={key}>
            {renderField(key, field)}
            {field.description && (
              <p className="text-xs text-muted mt-1 flex items-start gap-1">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                {field.description}
              </p>
            )}
          </div>
        ))}

        {Object.keys(activeSchema).length === 0 && (
          <div className="text-center py-8 text-muted">
            <Settings size={48} className="mx-auto mb-3 opacity-50" />
            <p>Esta extensión no tiene opciones configurables.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            Restablecer
          </button>
          {extensionId.includes('core-ai') && (
            <button
              onClick={handleOpenPromptInspector}
              className="flex items-center gap-2 px-3 py-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors"
              title="Ver el payload exacto enviado a la IA"
            >
              <Terminal size={16} />
              Prompt Inspector
            </button>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
            hasChanges && !isSaving
              ? 'bg-accent text-inverse hover:bg-accent/80'
              : 'bg-elevated text-muted cursor-not-allowed'
          )}
        >
          <Save size={16} />
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
