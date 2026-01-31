import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Copy, Trash2, Loader2 } from 'lucide-react';
import { useAccountDeletionMonitorStore, type AccountDeletionLogFilters } from '../../store/accountDeletionMonitorStore';
import { useUIStore } from '../../store/uiStore';
import { useAccounts } from '../../store/accountStore';

interface FilterState {
  accountId: string;
  jobId: string;
  status: string;
}

const DEFAULT_FILTERS: FilterState = {
  accountId: '',
  jobId: '',
  status: '',
};

const copyViaFallback = (content: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const succeeded = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!succeeded) {
    throw new Error('Fallback copy failed');
  }
};

export function MonitoringHub() {
  const { accounts } = useAccounts();
  const selectedAccountId = useUIStore((state) => state.selectedAccountId);

  const {
    logs,
    isFetchingLogs,
    fetchError,
    fetchLogs,
    pushLog,
    clearLogs,
  } = useAccountDeletionMonitorStore();

  const [filters, setFilters] = useState<FilterState>(() => ({
    ...DEFAULT_FILTERS,
    accountId: selectedAccountId ?? '',
  }));
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return [...logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [logs]);

  const convertFilters = useCallback((): AccountDeletionLogFilters => {
    return {
      accountId: filters.accountId || undefined,
      jobId: filters.jobId || undefined,
      status: filters.status || undefined,
      limit: 200,
    };
  }, [filters]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, accountId: selectedAccountId ?? '' }));
  }, [selectedAccountId]);

  useEffect(() => {
    fetchLogs({ accountId: selectedAccountId ?? undefined, limit: 200 }).catch(() => undefined);
  }, [selectedAccountId, fetchLogs]);

  const handleRefresh = useCallback(async () => {
    await fetchLogs(convertFilters());
  }, [fetchLogs, convertFilters]);

  const handleCopy = useCallback(async (payload: unknown) => {
    const content = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        copyViaFallback(content);
      }
      setCopyFeedback('Copiado al portapapeles');
    } catch (error) {
      console.warn('[MonitoringHub] clipboard copy failed', error);
      try {
        copyViaFallback(content);
        setCopyFeedback('Copiado al portapapeles');
      } catch (fallbackError) {
        console.warn('[MonitoringHub] fallback copy failed', fallbackError);
        setCopyFeedback('No se pudo copiar, usa Cmd/Ctrl + C');
      }
    } finally {
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }, []);

  const handleDownload = useCallback(() => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'account-deletion-logs.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const handleClearLocalLogs = useCallback(() => {
    clearLogs(filters.accountId || undefined);
    pushLog({
      type: 'info',
      message: 'Logs locales limpiados',
      accountId: filters.accountId || undefined,
      source: 'local',
    });
  }, [clearLogs, pushLog, filters.accountId]);

  return (
    <div className="h-full w-full bg-base text-primary flex flex-col">
      <div className="border-b border-subtle px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Monitoring Hub</h1>
          <p className="text-sm text-secondary">Logs de eliminación de cuentas y estado del portal de descargas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-subtle px-3 py-2 text-sm hover:bg-hover"
            onClick={handleClearLocalLogs}
          >
            <Trash2 size={14} /> Limpiar locales
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-subtle px-3 py-2 text-sm hover:bg-hover"
            onClick={handleDownload}
          >
            <Download size={14} /> Descargar JSON
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-3 py-2 text-sm hover:opacity-90"
            onClick={handleRefresh}
            disabled={isFetchingLogs}
          >
            {isFetchingLogs ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Actualizar
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4 overflow-auto">
        <section className="border border-subtle rounded-xl p-4 bg-surface">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Filtros</h2>
              <p className="text-sm text-secondary">Refina la consulta para traer logs históricos del backend.</p>
            </div>
            {copyFeedback && <span className="text-xs text-secondary">{copyFeedback}</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs uppercase text-secondary">Cuenta</label>
              <select
                className="w-full mt-1 rounded-lg border border-subtle bg-base px-3 py-2 text-sm"
                value={filters.accountId}
                onChange={(event) => setFilters((prev) => ({ ...prev, accountId: event.target.value }))}
              >
                <option value="">Todas</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName || account.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-secondary">Job ID</label>
              <input
                className="w-full mt-1 rounded-lg border border-subtle bg-base px-3 py-2 text-sm"
                value={filters.jobId}
                onChange={(event) => setFilters((prev) => ({ ...prev, jobId: event.target.value }))}
                placeholder="UUID del job"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-secondary">Status</label>
              <input
                className="w-full mt-1 rounded-lg border border-subtle bg-base px-3 py-2 text-sm"
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                placeholder="completed | failed | ..."
              />
            </div>
            <div className="flex items-end">
              <button
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white py-2 text-sm hover:opacity-90"
                onClick={handleRefresh}
                disabled={isFetchingLogs}
              >
                {isFetchingLogs ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Buscar
              </button>
            </div>
          </div>
          {fetchError && <p className="text-xs text-error mt-2">{fetchError}</p>}
        </section>

        <section className="border border-subtle rounded-xl bg-surface">
          <div className="p-4 border-b border-subtle flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Logs ({filteredLogs.length})</h2>
              <p className="text-sm text-secondary">Incluye eventos locales y registros del backend.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-subtle px-3 py-2 text-xs hover:bg-hover"
              onClick={() => handleCopy(filteredLogs)}
            >
              <Copy size={14} /> Copiar todo
            </button>
          </div>
          <div className="overflow-auto max-h-[55vh]">
            {filteredLogs.length === 0 ? (
              <div className="text-sm text-secondary p-4">No hay logs disponibles.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary text-xs uppercase border-b border-subtle">
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Cuenta</th>
                    <th className="px-4 py-2">Job</th>
                    <th className="px-4 py-2">Origen</th>
                    <th className="px-4 py-2">Mensaje</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-subtle/60">
                      <td className="px-4 py-2 whitespace-nowrap text-secondary">
                        {log.timestamp.toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        {log.accountId ? log.accountId.slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {log.jobId ? log.jobId.slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="px-4 py-2 capitalize">{log.source}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{log.message}</div>
                        {log.data ? (
                          <pre className="mt-1 text-xs text-secondary bg-base rounded-lg p-2 overflow-auto max-h-32">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          className="inline-flex items-center gap-1 rounded-lg border border-subtle px-2 py-1 text-xs hover:bg-hover"
                          onClick={() => handleCopy(log)}
                        >
                          <Copy size={12} /> Copiar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
