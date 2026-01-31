import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertCircle, Download, RefreshCw, Copy, Clock, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface StatusResponse {
  jobId: string;
  accountId: string;
  status: string;
  phase: string;
  snapshotReadyAt?: string | null;
  downloadAvailable: boolean;
  expiresAt: string;
  completedAt?: string | null;
}

const resolveApiBase = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  try {
    const url = new URL(window.location.origin);
    if (!url.port || url.port === '3000') {
      return url.origin;
    }
    url.port = '3000';
    return url.origin;
  } catch {
    return window.location.origin;
  }
};

const API_BASE = resolveApiBase();

export function AccountDeletionPortalPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get('token') || '';
  const jobIdFromQuery = params.get('jobId');
  const jobIdFromPath = useMemo(() => {
    const match = window.location.pathname.match(/\/account-deletions\/([^/?]+)/);
    return match?.[1] ?? null;
  }, []);
  const jobId = jobIdFromQuery || jobIdFromPath || '';

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const statusUrl = `${API_BASE}/account-deletions/${jobId}/status?token=${encodeURIComponent(token)}`;
  const downloadUrl = `${API_BASE}/account-deletions/${jobId}/download?token=${encodeURIComponent(token)}`;

  const expiresAt = status?.expiresAt ? new Date(status.expiresAt) : null;
  const completedAt = status?.completedAt ? new Date(status.completedAt) : null;
  const snapshotReadyAt = status?.snapshotReadyAt ? new Date(status.snapshotReadyAt) : null;

  const refreshStatus = async () => {
    if (!jobId || !token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(statusUrl);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.message || 'No se pudo consultar el estado');
      }
      setStatus(data.data as StatusResponse);
    } catch (err: any) {
      setError(err?.message || 'No se pudo consultar el estado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!status?.downloadAvailable) return;
    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'No se pudo iniciar la descarga');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fluxcore-snapshot-${jobId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar la descarga');
    } finally {
      setIsDownloading(false);
    }
  };

  const copyLink = async (type: 'status' | 'download') => {
    const url = type === 'status' ? window.location.href : downloadUrl;
    try {
      await navigator.clipboard.writeText(url);
    } catch (err: any) {
      setError(err?.message || 'No se pudo copiar el enlace');
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderStatusBadge = () => {
    if (!status) return null;
    if (!status.downloadAvailable) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-warning">
          <Clock size={14} /> Preparando snapshot…
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle2 size={14} /> Snapshot listo para descargar
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-base text-primary flex flex-col">
      <header className="border-b border-subtle p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Portal seguro de descargas</h1>
            <p className="text-sm text-secondary">
              Acceso protegido al respaldo de la cuenta. Guarda este enlace: funcionará durante 48 horas.
            </p>
          </div>
          <div className="text-right text-xs text-secondary">
            <p>ID del job: <span className="text-primary font-mono">{jobId}</span></p>
            {expiresAt && <p>Expira: {expiresAt.toLocaleString()}</p>}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {error && (
            <div className="border border-error/40 bg-error/10 text-error text-sm rounded-lg p-3 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <section className="border border-subtle rounded-lg p-4 space-y-3 bg-surface">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  Estado actual
                  {renderStatusBadge()}
                </h2>
                <p className="text-xs text-secondary mt-1">
                  {status?.status === 'external_cleanup' && 'Limpiando integraciones externas…'}
                  {status?.status === 'local_cleanup' && 'Limpiando datos locales…'}
                  {status?.status === 'completed' && 'Proceso finalizado. Puedes descargar el snapshot.'}
                  {!status && 'Consultando estado…'}
                </p>
              </div>
              <button
                type="button"
                onClick={refreshStatus}
                disabled={isLoading}
                className={clsx(
                  'inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors',
                  isLoading && 'opacity-60 cursor-not-allowed'
                )}
              >
                <RefreshCw size={14} className={clsx(isLoading && 'animate-spin')} /> Actualizar
              </button>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-secondary">
              <div>
                <dt className="uppercase tracking-wide text-muted">Snapshot listo</dt>
                <dd className="text-primary">
                  {snapshotReadyAt ? snapshotReadyAt.toLocaleString() : 'En preparación'}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide text-muted">Eliminación completada</dt>
                <dd className="text-primary">
                  {completedAt ? completedAt.toLocaleString() : 'Proceso en ejecución'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="border border-subtle rounded-lg p-4 space-y-3 bg-surface">
            <h2 className="text-sm font-semibold">Descarga protegida</h2>
            <p className="text-xs text-secondary">
              Cuando el snapshot esté listo, podrás descargarlo directamente desde este portal. No necesitas estar autenticado.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!status?.downloadAvailable || isDownloading}
                className={clsx(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors',
                  status?.downloadAvailable
                    ? 'border-accent text-primary hover:bg-accent/10'
                    : 'border-subtle text-muted cursor-not-allowed',
                  isDownloading && 'opacity-60'
                )}
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Descargar snapshot ZIP
              </button>
              <button
                type="button"
                onClick={() => copyLink('download')}
                disabled={!status?.downloadAvailable}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs border border-subtle rounded-md text-secondary hover:text-primary"
              >
                <Copy size={14} /> Copiar enlace directo
              </button>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default AccountDeletionPortalPage;
