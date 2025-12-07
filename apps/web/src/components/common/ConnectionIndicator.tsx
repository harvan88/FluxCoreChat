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

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {/* Connection icon */}
      <div
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          isOnline
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
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
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
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
          className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sincronizar al conectar"
        >
          <Cloud size={16} />
        </button>
      )}

      {/* Details */}
      {showDetails && (
        <div className="text-xs text-gray-500">
          {queueStats.failed > 0 && (
            <span className="text-red-400 mr-2">
              {queueStats.failed} fallidos
            </span>
          )}
          {status === 'syncing' && (
            <span className="text-blue-400">
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
        isOnline ? 'bg-green-500' : 'bg-red-500'
      )}
      title={isOnline ? 'Conectado' : 'Sin conexión'}
    />
  );
}
