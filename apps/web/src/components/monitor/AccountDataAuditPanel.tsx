import { useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, Copy, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAccounts } from '../../store/accountStore';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../services/api';
import type { AccountDataReference } from '../../types';

interface ReferenceRow extends AccountDataReference {
  key: string;
}

const copyText = async (text: string) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export function AccountDataAuditPanel() {
  const { accounts } = useAccounts();
  const selectedAccountId = useUIStore((state) => state.selectedAccountId);

  const [accountIdInput, setAccountIdInput] = useState<string>(selectedAccountId ?? '');
  const [references, setReferences] = useState<ReferenceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  useEffect(() => {
    if (selectedAccountId) {
      setAccountIdInput((prev) => (prev ? prev : selectedAccountId));
    }
  }, [selectedAccountId]);

  const totalRows = useMemo(() => {
    return references.reduce((sum, ref) => sum + ref.rowCount, 0);
  }, [references]);

  const handleFetch = async () => {
    if (!accountIdInput) {
      setError('Debes seleccionar o ingresar una cuenta.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getAccountDataReferences(accountIdInput);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'No se pudo obtener la auditoría');
      }

      const rows = response.data.map((ref, index) => ({
        ...ref,
        key: `${ref.tableName}:${ref.columnName}:${index}`,
      }));
      setReferences(rows);
      setLastRun(new Date());
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al ejecutar la auditoría');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (payload: string) => {
    try {
      await copyText(payload);
      setCopyFeedback('Copiado');
    } catch (err) {
      console.warn('[AccountDataAuditPanel] copy failed', err);
      setCopyFeedback('No se pudo copiar');
    } finally {
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleCopySql = (table: string, column: string) => {
    const sqlSnippet = `SELECT * FROM "${table}" WHERE "${column}" = '${accountIdInput}';`;
    void handleCopy(sqlSnippet);
  };

  return (
    <div className="h-full w-full bg-base text-primary flex flex-col">
      <div className="border-b border-subtle px-5 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <Database size={18} />
            <span className="text-xs uppercase tracking-wide">Account Data Auditor</span>
          </div>
          <h1 className="text-xl font-semibold">Auditoría de referencias</h1>
          <p className="text-sm text-secondary">
            Consulta todas las tablas que todavía referencian una cuenta eliminada para validar el cleanup.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-70"
          onClick={handleFetch}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Ejecutar auditoría
        </button>
      </div>

      <div className="p-5 space-y-5 overflow-auto">
        <section className="border border-subtle rounded-xl p-4 bg-surface">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs uppercase text-secondary">Seleccionar cuenta</label>
              <select
                className="w-full mt-1 rounded-lg border border-subtle bg-base px-3 py-2 text-sm"
                value={accountIdInput}
                onChange={(event) => setAccountIdInput(event.target.value)}
              >
                <option value="">Selecciona desde la lista…</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName || account.username} ({account.id.slice(0, 8)}…)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-secondary">Ingresar cuenta manualmente</label>
              <input
                className="w-full mt-1 rounded-lg border border-subtle bg-base px-3 py-2 text-sm"
                value={accountIdInput}
                onChange={(event) => setAccountIdInput(event.target.value)}
                placeholder="UUID de la cuenta"
              />
            </div>
            <div className="rounded-lg border border-dashed border-subtle bg-base/60 p-3 flex flex-col justify-center">
              <span className="text-xs uppercase text-secondary">Última ejecución</span>
              <span className="text-sm text-primary">
                {lastRun ? lastRun.toLocaleString() : 'Sin ejecutar'}
              </span>
            </div>
          </div>
          {error && <p className="text-sm text-error mt-3">{error}</p>}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-subtle rounded-xl p-4 bg-surface">
            <div className="text-xs uppercase text-secondary">Tablas con referencias</div>
            <div className="text-2xl font-semibold mt-1">{references.length}</div>
            <p className="text-xs text-muted mt-1">Incluye vistas públicas con columnas account_id</p>
          </div>
          <div className="border border-subtle rounded-xl p-4 bg-surface">
            <div className="text-xs uppercase text-secondary">Referencias totales</div>
            <div className="text-2xl font-semibold mt-1">{totalRows}</div>
            <p className="text-xs text-muted mt-1">Suma de filas por tabla/columna</p>
          </div>
          <div className="border border-subtle rounded-xl p-4 bg-surface">
            <div className="flex items-center gap-2 text-xs uppercase text-secondary">
              <ShieldCheck size={14} />
              Monitoreo recomendado
            </div>
            <p className="text-sm text-primary mt-2">
              Ejecuta esta auditoría después de cada eliminación para asegurar que no queden datos huérfanos.
            </p>
          </div>
        </section>

        <section className="border border-subtle rounded-xl bg-surface">
          <div className="p-4 border-b border-subtle flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Resultados</h2>
              <p className="text-sm text-secondary">
                Cada fila representa una tabla/columna donde aún existe al menos una referencia.
              </p>
            </div>
            {copyFeedback && <span className="text-xs text-secondary">{copyFeedback}</span>}
          </div>
          {references.length === 0 ? (
            <div className="p-6 text-center text-secondary">
              {isLoading ? 'Buscando referencias…' : 'Sin datos por ahora. Ejecuta la auditoría para comenzar.'}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary text-xs uppercase border-b border-subtle">
                    <th className="px-4 py-2">Tabla</th>
                    <th className="px-4 py-2">Columna</th>
                    <th className="px-4 py-2 text-right">Filas</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {references.map((ref) => (
                    <tr key={ref.key} className="border-b border-subtle/60">
                      <td className="px-4 py-2 font-medium">{ref.tableName}</td>
                      <td className="px-4 py-2">{ref.columnName}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{ref.rowCount}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          className="inline-flex items-center gap-1 rounded-lg border border-subtle px-2 py-1 text-xs hover:bg-hover"
                          onClick={() => handleCopySql(ref.tableName, ref.columnName)}
                        >
                          <Copy size={12} /> Copiar SQL
                        </button>
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
            <div className="text-sm font-semibold text-amber-500">Nota operacional</div>
            <p className="text-sm text-secondary">
              Si encuentras referencias residuales, ejecuta el runbook de cleanup manual o reintenta la fase de
              <strong> local_cleanup</strong> desde el Monitoring Hub para el job correspondiente.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
