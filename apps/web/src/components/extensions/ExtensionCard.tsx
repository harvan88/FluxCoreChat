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
      'bg-elevated rounded-xl border overflow-hidden transition-all',
      isEnabled ? 'border-success/30' : 'border-subtle',
      isLoading && 'opacity-50 pointer-events-none'
    )}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
          isEnabled ? 'bg-success/20' : 'bg-hover'
        )}>
          {extension.icon || '🧩'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-primary font-medium truncate">{extension.name}</h3>
            <span className="text-xs text-muted">v{extension.version}</span>
          </div>
          <p className="text-sm text-secondary mt-0.5 line-clamp-2">
            {extension.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted">por {extension.author}</span>
            {isEnabled && (
              <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                Activa
              </span>
            )}
            {isInstalled && !isEnabled && (
              <span className="text-xs bg-hover text-secondary px-2 py-0.5 rounded-full">
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
                ? 'text-success hover:bg-success/20' 
                : 'text-secondary hover:bg-hover'
            )}
            title={isEnabled ? 'Desactivar' : 'Activar'}
          >
            {isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          </button>
        )}
      </div>

      {/* Permissions */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Shield size={12} />
          <span>Permisos:</span>
          <span className="text-secondary">
            {extension.permissions.slice(0, 3).join(', ')}
            {extension.permissions.length > 3 && ` +${extension.permissions.length - 3}`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-base/50 border-t border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isInstalled && onInstall && (
            <button
              onClick={onInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/80 text-inverse text-sm rounded-lg transition-colors"
            >
              <Download size={14} />
              Instalar
            </button>
          )}

          {isInstalled && onUninstall && (
            <button
              onClick={onUninstall}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-error/20 hover:bg-error/30 text-error text-sm rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Desinstalar
            </button>
          )}

          {isInstalled && onConfigure && (
            <button
              onClick={onConfigure}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated hover:bg-hover text-primary text-sm rounded-lg transition-colors"
            >
              <Settings size={14} />
              Configurar
            </button>
          )}
        </div>

        <button
          className="p-1.5 text-secondary hover:text-primary transition-colors"
          title="Ver detalles"
        >
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}
