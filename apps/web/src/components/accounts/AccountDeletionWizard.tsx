import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Download, Loader2, Shield, CheckCircle2, Link, Copy } from 'lucide-react';
import { Button, Card, Checkbox, DoubleConfirmationDeleteButton } from '../ui';
import { useAccountDeletion } from '../../hooks/useAccountDeletion';
import { useUIStore } from '../../store/uiStore';

interface AccountDeletionWizardProps {
  accountId?: string;
  sessionAccountId?: string;
  accountName?: string | null;
}

export function AccountDeletionWizard({ accountId, sessionAccountId, accountName }: AccountDeletionWizardProps) {
  const {
    job,
    snapshotDownloadUrl,
    snapshotPortalUrl,
    snapshotPortalPath,
    snapshotTokenExpiresAt,
    error,
    isLoadingJob,
    isRequesting,
    isGeneratingSnapshot,
    isConfirming,
    isAcknowledgingSnapshot,
    isDownloadingSnapshot,
    isBackgroundProcessing,
    requestDeletion,
    generateSnapshot,
    acknowledgeSnapshot,
    downloadSnapshot,
    confirmDeletion,
  } = useAccountDeletion({ accountId, sessionAccountId, accountName });

  const [localConsent, setLocalConsent] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'status' | 'download' | null>(null);
  const pushToast = useUIStore((state) => state.pushToast);
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  useEffect(() => {
    setLocalConsent(Boolean(job?.snapshotAcknowledgedAt));
  }, [job?.snapshotAcknowledgedAt]);

  useEffect(() => {
    if (!copiedLink) return;
    const timeout = setTimeout(() => setCopiedLink(null), 2000);
    return () => clearTimeout(timeout);
  }, [copiedLink]);

  const handleOpenLink = useCallback((url: string | null) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleCopyLink = useCallback(
    async (type: 'status' | 'download') => {
      const url = type === 'status' ? snapshotPortalUrl : snapshotDownloadUrl;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        setCopiedLink(type);
      } catch (err: any) {
        pushToast({
          type: 'error',
          title: 'No se pudo copiar',
          description: err?.message || 'Intenta copiar manualmente el enlace.',
        });
      }
    },
    [snapshotDownloadUrl, snapshotPortalUrl, pushToast]
  );

  const statusLabel = useMemo(() => {
    if (!job) return 'Sin iniciar';
    switch (job.status) {
      case 'pending':
      case 'snapshot':
        return 'Esperando snapshot';
      case 'snapshot_ready':
        return 'Snapshot listo';
      case 'external_cleanup':
        return 'Limpiando integraciones externas';
      case 'local_cleanup':
        return 'Eliminando datos locales';
      case 'completed':
        return 'Cuenta eliminada';
      case 'failed':
        return 'Proceso fallido';
      default:
        return job.status;
    }
  }, [job]);

  useEffect(() => {
    if (!snapshotPortalPath || redirectedRef.current) return;
    if (!job) return;
    if (['external_cleanup', 'local_cleanup', 'completed'].includes(job.status)) {
      redirectedRef.current = true;
      navigate(snapshotPortalPath, { replace: true });
    }
  }, [job, snapshotPortalPath, navigate]);

  const stepSnapshotStatus = useMemo<'pending' | 'progress' | 'done'>(() => {
    if (!job) return 'pending';
    if (['external_cleanup', 'local_cleanup', 'completed', 'failed'].includes(job.status)) {
      return 'done';
    }
    return job.status === 'snapshot_ready' ? 'done' : 'progress';
  }, [job]);

  const stepConfirmStatus = useMemo<'pending' | 'progress' | 'done'>(() => {
    if (!job) return 'pending';
    if (job.status === 'completed') return 'done';
    if (['external_cleanup', 'local_cleanup'].includes(job.status)) return 'progress';
    if (job.status === 'failed') return 'progress';
    return job.status === 'snapshot_ready' ? 'progress' : 'pending';
  }, [job]);

  const renderPortalLinks = useCallback(() => {
    if (!snapshotPortalUrl && !snapshotDownloadUrl) return null;
    const expirationLabel = snapshotTokenExpiresAt
      ? `Disponible hasta ${snapshotTokenExpiresAt.toLocaleString()}`
      : 'Disponible durante 48 horas tras confirmar la eliminación';

    return (
      <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-primary font-semibold">Portal seguro de respaldo</p>
            <p className="text-xs text-secondary">{expirationLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Button
            variant="ghost"
            size="sm"
            disabled={!snapshotPortalUrl}
            onClick={() => handleOpenLink(snapshotPortalUrl)}
            className="flex items-center gap-1"
          >
            <Link size={14} /> Abrir portal
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!snapshotPortalUrl}
            onClick={() => handleCopyLink('status')}
            className="flex items-center gap-1"
          >
            <Copy size={14} /> {copiedLink === 'status' ? 'Copiado' : 'Copiar portal'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!snapshotDownloadUrl}
            onClick={() => handleOpenLink(snapshotDownloadUrl)}
            className="flex items-center gap-1"
          >
            <Download size={14} /> Descargar desde portal
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!snapshotDownloadUrl}
            onClick={() => handleCopyLink('download')}
            className="flex items-center gap-1"
          >
            <Copy size={14} /> {copiedLink === 'download' ? 'Copiado' : 'Copiar descarga'}
          </Button>
        </div>
      </div>
    );
  }, [snapshotPortalUrl, snapshotDownloadUrl, snapshotTokenExpiresAt, handleOpenLink, handleCopyLink, copiedLink]);

  if (!accountId) {
    return null;
  }

  const renderControls = () => {
    if (!job) {
      return (
        <Button variant="danger" onClick={requestDeletion} disabled={isRequesting} className="w-full">
          {isRequesting ? <Loader2 size={16} className="animate-spin" /> : 'Solicitar eliminación irrevocable'}
        </Button>
      );
    }

    if (job.status === 'pending' || job.status === 'snapshot') {
      return (
        <Button variant="secondary" onClick={generateSnapshot} disabled={isGeneratingSnapshot} className="w-full">
          {isGeneratingSnapshot ? <Loader2 size={16} className="animate-spin" /> : 'Generar snapshot completo'}
        </Button>
      );
    }

    if (job.status === 'snapshot_ready') {
      const hasDownloaded = Boolean(job.snapshotDownloadedAt);
      const hasConsent = Boolean(job.snapshotAcknowledgedAt);
      const canConfirm = (localConsent || hasConsent) && !isConfirming;

      return (
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            disabled={isDownloadingSnapshot}
            onClick={() => {
              downloadSnapshot().catch(() => {
                // handled in hook
              });
            }}
          >
            {isDownloadingSnapshot ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Download size={16} className="mr-2" />
            )}
            Descargar snapshot (opcional)
          </Button>
          <Checkbox
            checked={localConsent}
            disabled={isAcknowledgingSnapshot || hasConsent}
            onChange={(event) => {
              const nextChecked = event.target.checked;
              setLocalConsent(nextChecked);
              if (nextChecked && !hasConsent) {
                acknowledgeSnapshot({ consent: true }).catch(() => {
                  setLocalConsent(Boolean(job?.snapshotAcknowledgedAt));
                });
              }
            }}
            label="Confirmo que entendí el contenido de mi respaldo"
          />
          <div className="text-xs text-secondary space-y-1">
            {hasDownloaded ? (
              <p>
                Última descarga registrada el {new Date(job.snapshotDownloadedAt!).toLocaleString()}
                {job.snapshotDownloadCount ? ` · ${job.snapshotDownloadCount} descarga(s)` : ''}
              </p>
            ) : (
              <p>Puedes descargar ahora o usar el portal seguro una vez confirmes la eliminación.</p>
            )}
            {hasConsent && <p>Consentimiento registrado el {new Date(job.snapshotAcknowledgedAt!).toLocaleString()}.</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-secondary flex-1">
              Esta acción eliminará definitivamente todos los datos restantes. Podrás descargar tu respaldo luego desde el portal seguro.
            </span>
            <DoubleConfirmationDeleteButton
              onConfirm={confirmDeletion}
              disabled={!canConfirm}
              className="ml-auto"
            />
          </div>
          {isConfirming && (
            <div className="text-sm text-secondary flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Confirmando eliminación…
            </div>
          )}
        </div>
      );
    }

    if (job.status === 'external_cleanup' || job.status === 'local_cleanup') {
      return (
        <div className="flex flex-col gap-2 text-secondary text-sm">
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Proceso en curso. Te notificaremos cuando finalice.
          </div>
          {renderPortalLinks()}
        </div>
      );
    }

    if (job.status === 'completed') {
      return (
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 size={16} />
            Cuenta eliminada definitivamente.
          </div>
          {renderPortalLinks()}
        </div>
      );
    }

    if (job.status === 'failed') {
      return (
        <div className="flex items-center gap-2 text-error text-sm">
          <AlertCircle size={16} />
          El proceso falló. Contacta a soporte para reintentarlo.
        </div>
      );
    }

    return null;
  };

  return (
    <Card variant="bordered" className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Shield size={24} className="text-warning flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-primary font-semibold">Eliminar cuenta</h3>
          <p className="text-sm text-secondary">
            Este flujo elimina permanentemente todos los datos de {accountName || 'la cuenta seleccionada'}. Generamos un
            snapshot descargable y luego ejecutamos la limpieza en background.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-subtle divide-y divide-subtle">
        <WizardStep
          title="1. Solicitar eliminación"
          description="Confirma que eres el propietario o tienes permiso ACCOUNT_DELETE_FORCE."
          status={job ? 'done' : 'pending'}
        />
        <WizardStep
          title="2. Generar y preparar snapshot"
          description="Descarga ahora o guarda el enlace seguro que activaremos tras la confirmación."
          status={stepSnapshotStatus}
        />
        <WizardStep
          title="3. Confirmar eliminación"
          description="Una vez confirmado, tu cuenta se bloqueará y podrás usar el portal por 48h."
          status={stepConfirmStatus}
        />
      </div>

      <div className="rounded-lg border border-subtle bg-elevated/60 p-3 flex items-center gap-3 text-sm text-secondary">
        <span className="font-medium text-primary">Estado:</span>
        <span>{statusLabel}</span>
        {job?.snapshotReadyAt && (
          <span className="text-muted">Snapshot listo el {new Date(job.snapshotReadyAt).toLocaleString()}</span>
        )}
      </div>

      {renderPortalLinks()}

      {isBackgroundProcessing && (
        <div className="p-3 rounded-lg border border-info/40 bg-info/10 text-info text-sm flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Eliminación en curso. Puedes seguir usando FluxCore mientras limpiamos los datos.
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg border border-error/40 bg-error/10 text-error text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {isLoadingJob && (
        <div className="text-sm text-secondary flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Actualizando estado…
        </div>
      )}

      {renderControls()}
    </Card>
  );
}

interface WizardStepProps {
  title: string;
  description: string;
  status: 'pending' | 'progress' | 'done';
}

function WizardStep({ title, description, status }: WizardStepProps) {
  const getIcon = () => {
    if (status === 'done') return <CheckCircle2 size={18} className="text-success" />;
    if (status === 'progress') return <Loader2 size={18} className="animate-spin text-accent" />;
    return <Shield size={18} className="text-muted" />;
  };

  return (
    <div className="flex items-start gap-3 p-3">
      {getIcon()}
      <div className="flex-1">
        <div className="text-sm text-primary font-semibold">{title}</div>
        <p className="text-xs text-secondary mt-1">{description}</p>
      </div>
    </div>
  );
}
