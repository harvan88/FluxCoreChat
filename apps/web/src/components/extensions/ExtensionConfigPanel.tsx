/**
 * V2-4: ExtensionConfigPanel Component
 * 
 * Panel para configurar una extensión instalada.
 */

import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Settings, Info } from 'lucide-react';
import clsx from 'clsx';

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
    min: 5,
    max: 300,
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

  // Usar schema de core-ai si es esa extensión y no hay schema custom
  const activeSchema = schema || (extensionId.includes('core-ai') ? coreAISchema : {});

  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  const handleChange = (key: string, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
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
              className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-white">{field.label}</span>
          </label>
        );

      case 'select':
        return (
          <div>
            <label className="block text-sm text-gray-300 mb-1">{field.label}</label>
            <select
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
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
            <label className="block text-sm text-gray-300 mb-1">{field.label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(key, parseFloat(e.target.value))}
              min={field.min}
              max={field.max}
              step={field.max && field.max <= 2 ? 0.1 : 1}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        );

      case 'string':
      default:
        return (
          <div>
            <label className="block text-sm text-gray-300 mb-1">{field.label}</label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="text-blue-400" size={20} />
          <h2 className="text-lg font-semibold text-white">{extensionName}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
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
              <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                {field.description}
              </p>
            )}
          </div>
        ))}

        {Object.keys(activeSchema).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Settings size={48} className="mx-auto mb-3 opacity-50" />
            <p>Esta extensión no tiene opciones configurables.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 flex items-center justify-between">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RotateCcw size={16} />
          Restablecer
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
            hasChanges && !isSaving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          )}
        >
          <Save size={16} />
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
