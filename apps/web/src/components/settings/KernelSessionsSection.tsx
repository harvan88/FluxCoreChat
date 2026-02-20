import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity, AlertCircle, ChevronRight, Loader2, RefreshCcw, Shield } from 'lucide-react';
import { useKernelSessions } from '../../hooks/useKernelSessions';

interface KernelSessionsSectionProps {
  onBack: () => void;
}

const statusStyles: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-100 border-amber-200',
  active: 'text-emerald-600 bg-emerald-100 border-emerald-200',
  invalidated: 'text-slate-500 bg-slate-100 border-slate-200',
};

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activa',
  invalidated: 'Invalidada',
};

export function KernelSessionsSection({ onBack }: KernelSessionsSectionProps) {
  const {
    sessions,
    isLoading,
    error,
    refresh,
    lastSyncedAt,
    hasSessions,
    selectedAccountId,
  } = useKernelSessions();

  const lastSyncText = useMemo(() => {
    if (!lastSyncedAt) return '——';
    return formatDistanceToNow(lastSyncedAt, { addSuffix: true, locale: es });
  }, [lastSyncedAt]);

  const handleRefresh = () => {
    void refresh();
  };

  if (!selectedAccountId) {
    return (
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={onBack}
          className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
        >
          <ChevronRight size={20} className="rotate-180" />
          <span className="font-medium">Estado del Kernel</span>
        </button>

        <div className="p-8 text-center space-y-3">
          <Shield className="mx-auto text-muted" size={32} />
          <p className="text-muted text-sm">
            Selecciona una cuenta para visualizar las sesiones activas del Kernel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
      >
        <ChevronRight size={20} className="rotate-180" />
        <span className="font-medium">Estado del Kernel</span>
      </button>

      <div className="p-4 space-y-6">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <Shield size={18} /> Sesiones soberanas
            </h2>
            <p className="text-sm text-muted">Account ID: {selectedAccountId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-subtle rounded-md text-primary hover:bg-hover disabled:opacity-50"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refrescar
            </button>
            <span className="text-xs text-muted">Última sync: {lastSyncText}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 px-3 py-2 rounded-md">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {isLoading && !hasSessions ? (
          <div className="flex items-center justify-center py-12 text-muted gap-2">
            <Loader2 size={18} className="animate-spin" />
            Cargando sesiones...
          </div>
        ) : null}

        {!isLoading && !hasSessions && !error ? (
          <div className="py-12 text-center text-sm text-muted space-y-3">
            <Activity className="mx-auto text-muted" size={28} />
            <p>No hay sesiones activas ni pendientes.</p>
            <p className="text-xs">Cuando el kernel procese señales Identity.* las verás aquí en tiempo real.</p>
          </div>
        ) : null}

        {hasSessions && (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="border border-subtle rounded-lg p-4 bg-surface-hover/30 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-muted">{session.sessionId}</span>
                    <span className="text-sm text-primary font-semibold">Actor: {session.actorId}</span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      statusStyles[session.status] ?? 'text-muted border-subtle'
                    }`}
                  >
                    {statusLabel[session.status] ?? session.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-secondary">
                  <div>
                    <p className="text-xs text-muted uppercase">Método</p>
                    <p>{session.method || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted uppercase">Dispositivo</p>
                    <p>{session.deviceHash || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted uppercase">Scopes</p>
                    <p>{session.scopes.length > 0 ? session.scopes.join(', ') : '—'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-muted">
                  <span>Entry point: {session.entryPoint || '—'}</span>
                  <span>
                    Última actividad:{' '}
                    {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
