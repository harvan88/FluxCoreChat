/**
 * V2-5: ConnectionIndicator Component
 * 
 * Muestra el estado de conexión y sincronización.
 */

import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import clsx from 'clsx';
import { useConnectionStatus, useSync, useSyncQueueStats } from '../../hooks/useOfflineFirst';

interface ConnectionIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export function ConnectionIndicator({ showDetails = false, className }: ConnectionIndicatorProps) {
  const status = useConnectionStatus();
  const { sync, isSyncing } = useSync();
  const queueStats = useSyncQueueStats();

  const isOnline = status === 'online';
  const hasPending = queueStats.pending > 0;

  // Sistema canónico de diseño
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {/* Connection icon */}
      <div
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          isOnline
            ? 'bg-success/20 text-success'
            : 'bg-error/20 text-error'
        )}
      >
        {isOnline ? (
          <>
            <Wifi size={14} />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff size={14} />
            <span>Offline</span>
          </>
        )}
      </div>

      {/* Sync status */}
      {hasPending && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning/20 text-warning text-xs font-medium">
          {isSyncing ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Sincronizando...</span>
            </>
          ) : (
            <>
              <CloudOff size={14} />
              <span>{queueStats.pending} pendientes</span>
            </>
          )}
        </div>
      )}

      {/* Sync button (when offline with pending) */}
      {!isOnline && hasPending && !isSyncing && (
        <button
          onClick={() => sync()}
          disabled={!isOnline}
          className="p-1.5 text-muted hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sincronizar al conectar"
        >
          <Cloud size={16} />
        </button>
      )}

      {/* Details */}
      {showDetails && (
        <div className="text-xs text-muted">
          {queueStats.failed > 0 && (
            <span className="text-error mr-2">
              {queueStats.failed} fallidos
            </span>
          )}
          {status === 'syncing' && (
            <span className="text-accent">
              Sincronizando...
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Mini indicator for header
 */
export function ConnectionDot() {
  const status = useConnectionStatus();
  const isOnline = status === 'online';

  return (
    <div
      className={clsx(
        'w-2 h-2 rounded-full',
        isOnline ? 'bg-success' : 'bg-error'
      )}
      title={isOnline ? 'Conectado' : 'Sin conexión'}
    />
  );
}
