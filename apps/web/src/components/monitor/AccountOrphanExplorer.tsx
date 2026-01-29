import { useEffect } from 'react';
import { RefreshCw, Copy, AlertTriangle } from 'lucide-react';
import { usePanelStore } from '../../store/panelStore';
import { useAccountDeletionMonitorStore } from '../../store/accountDeletionMonitorStore';

export function AccountOrphanExplorer() {
  const openTab = usePanelStore((state) => state.openTab);
  const {
    orphans,
    isFetchingOrphans,
    orphanError,
    fetchOrphans,
    setAuditPrefillAccountId,
  } = useAccountDeletionMonitorStore((state) => ({
    orphans: state.orphans,
    isFetchingOrphans: state.isFetchingOrphans,
    orphanError: state.orphanError,
    fetchOrphans: state.fetchOrphans,
    setAuditPrefillAccountId: state.setAuditPrefillAccountId,
  }));

  useEffect(() => {
    fetchOrphans().catch(() => undefined);
  }, [fetchOrphans]);

  const handleAuditId = (accountId: string) => {
    setAuditPrefillAccountId(accountId);
    openTab('dashboard', {
      type: 'monitoring',
      identity: 'monitoring-data-audit',
      title: 'Account Data Audit',
      icon: 'Database',
      closable: true,
      context: { view: 'audit' },
    });
  };

  const handleCopyId = async (accountId: string) => {
    try {
      await navigator.clipboard.writeText(accountId);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = accountId;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="h-full w-full bg-base text-primary flex flex-col">
      <div className="border-b border-subtle px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Orphan Explorer</h1>
          <p className="text-sm text-secondary">
            Tablas que aún contienen referencias a cuentas inexistentes.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-70"
          onClick={() => fetchOrphans().catch(() => undefined)}
          disabled={isFetchingOrphans}
        >
          {isFetchingOrphans ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refrescar
        </button>
      </div>

      <div className="p-5 space-y-4 overflow-auto">
        {orphanError && (
          <div className="border border-error/40 bg-error/5 text-error text-sm rounded-lg px-3 py-2">
            {orphanError}
          </div>
        )}

        <section className="border border-subtle rounded-xl bg-surface">
          <div className="p-4 border-b border-subtle flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Referencias detectadas</h2>
              <p className="text-sm text-secondary">
                Selecciona un ID para abrir la auditoría detallada.
              </p>
            </div>
            <span className="text-sm text-secondary">
              {isFetchingOrphans ? 'Analizando...' : `${orphans.length} tablas con referencias`}
            </span>
          </div>

          {orphans.length === 0 ? (
            <div className="p-6 text-center text-secondary">
              {isFetchingOrphans ? 'Buscando registros huérfanos…' : 'Sin registros. Todo limpio 👌'}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary text-xs uppercase border-b border-subtle">
                    <th className="px-4 py-2">Tabla</th>
                    <th className="px-4 py-2">Columna</th>
                    <th className="px-4 py-2 text-right"># Huérfanos</th>
                    <th className="px-4 py-2">IDs detectados</th>
                  </tr>
                </thead>
                <tbody>
                  {orphans.map((orphan) => (
                    <tr key={`${orphan.tableName}-${orphan.columnName}`} className="border-b border-subtle/60">
                      <td className="px-4 py-2 font-medium">{orphan.tableName}</td>
                      <td className="px-4 py-2">{orphan.columnName}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{orphan.orphanCount}</td>
                      <td className="px-4 py-2">
                        {orphan.sampleIds.length === 0 ? (
                          <span className="text-xs text-muted">Sin muestras</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {orphan.sampleIds.map((id) => (
                              <div
                                key={id}
                                className="inline-flex items-center gap-1 rounded-full border border-subtle px-2 py-1 text-xs text-secondary bg-base"
                              >
                                <span>{id.slice(0, 10)}…</span>
                                <button
                                  className="text-[10px] text-muted hover:text-primary"
                                  onClick={() => handleCopyId(id)}
                                >
                                  <Copy size={10} />
                                </button>
                                <button
                                  className="text-[10px] text-accent hover:text-primary"
                                  onClick={() => handleAuditId(id)}
                                >
                                  Auditar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="border border-amber-400/50 rounded-xl p-4 bg-amber-500/5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-amber-500">Sugerencia operativa</div>
            <p className="text-sm text-secondary">
              Cuando todos los conteos lleguen a cero, ejecuta una última auditoría por cuenta para confirmar que
              no queden datos residuales en almacenamiento local o extensiones.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
