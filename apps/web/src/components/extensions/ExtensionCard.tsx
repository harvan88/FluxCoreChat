/**
 * COR-041: ExtensionCard Component
 * 
 * Muestra información de una extensión con acciones disponibles.
 */

import { 
  Download, 
  Trash2, 
  Settings, 
  ToggleLeft, 
  ToggleRight,
  Shield,
  ExternalLink
} from 'lucide-react';
import clsx from 'clsx';
import type { Extension, ExtensionInstallation } from '../../hooks/useExtensions';

interface ExtensionCardProps {
  extension: Extension & { installation?: ExtensionInstallation };
  onInstall?: () => void;
  onUninstall?: () => void;
  onToggle?: (enabled: boolean) => void;
  onConfigure?: () => void;
  isLoading?: boolean;
}

export function ExtensionCard({
  extension,
  onInstall,
  onUninstall,
  onToggle,
  onConfigure,
  isLoading = false,
}: ExtensionCardProps) {
  const isInstalled = extension.status !== 'available';
  const isEnabled = extension.status === 'enabled';

  return (
    <div className={clsx(
      'bg-gray-800 rounded-xl border overflow-hidden transition-all',
      isEnabled ? 'border-green-500/30' : 'border-gray-700',
      isLoading && 'opacity-50 pointer-events-none'
    )}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
          isEnabled ? 'bg-green-500/20' : 'bg-gray-700'
        )}>
          {extension.icon || '🧩'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">{extension.name}</h3>
            <span className="text-xs text-gray-500">v{extension.version}</span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">
            {extension.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">por {extension.author}</span>
            {isEnabled && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                Activa
              </span>
            )}
            {isInstalled && !isEnabled && (
              <span className="text-xs bg-gray-600 text-gray-400 px-2 py-0.5 rounded-full">
                Desactivada
              </span>
            )}
          </div>
        </div>

        {/* Toggle (if installed) */}
        {isInstalled && onToggle && (
          <button
            onClick={() => onToggle(!isEnabled)}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              isEnabled 
                ? 'text-green-400 hover:bg-green-500/20' 
                : 'text-gray-400 hover:bg-gray-700'
            )}
            title={isEnabled ? 'Desactivar' : 'Activar'}
          >
            {isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          </button>
        )}
      </div>

      {/* Permissions */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Shield size={12} />
          <span>Permisos:</span>
          <span className="text-gray-400">
            {extension.permissions.slice(0, 3).join(', ')}
            {extension.permissions.length > 3 && ` +${extension.permissions.length - 3}`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isInstalled && onInstall && (
            <button
              onClick={onInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Download size={14} />
              Instalar
            </button>
          )}

          {isInstalled && onUninstall && (
            <button
              onClick={onUninstall}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Desinstalar
            </button>
          )}

          {isInstalled && onConfigure && (
            <button
              onClick={onConfigure}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              <Settings size={14} />
              Configurar
            </button>
          )}
        </div>

        <button
          className="p-1.5 text-gray-400 hover:text-white transition-colors"
          title="Ver detalles"
        >
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}
