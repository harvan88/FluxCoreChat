import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Loader2, Shield, CheckCircle2 } from 'lucide-react';
import { Button, Card, Checkbox, DoubleConfirmationDeleteButton } from '../ui';
import { useAccountDeletion } from '../../hooks/useAccountDeletion';

interface AccountDeletionWizardProps {
  accountId?: string;
  sessionAccountId?: string;
  accountName?: string | null;
}

export function AccountDeletionWizard({ accountId, sessionAccountId, accountName }: AccountDeletionWizardProps) {
  const {
    job,
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

  useEffect(() => {
    setLocalConsent(Boolean(job?.snapshotAcknowledgedAt));
  }, [job?.snapshotAcknowledgedAt]);

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
      const canConfirm = hasDownloaded && hasConsent;

      return (
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            disabled={isDownloadingSnapshot}
            onClick={() => {
              downloadSnapshot().catch(() => {
                // error already tracked in hook
              });
            }}
          >
            {isDownloadingSnapshot ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Download size={16} className="mr-2" />
            )}
            Descargar snapshot
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
            label="Confirmo que descargué y revisé mi snapshot"
          />
          <div className="text-xs text-secondary space-y-1">
            {hasDownloaded ? (
              <p>
                Última descarga registrada el {new Date(job.snapshotDownloadedAt!).toLocaleString()}
                {job.snapshotDownloadCount ? ` · ${job.snapshotDownloadCount} descarga(s)` : ''}
              </p>
            ) : (
              <p>Debes descargar el snapshot antes de continuar.</p>
            )}
            {hasConsent && <p>Consentimiento registrado el {new Date(job.snapshotAcknowledgedAt!).toLocaleString()}.</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-secondary flex-1">
              Esta acción eliminará definitivamente todos los datos restantes.
            </span>
            <DoubleConfirmationDeleteButton
              onConfirm={confirmDeletion}
              disabled={!canConfirm || isConfirming}
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
        <div className="flex items-center gap-2 text-secondary text-sm">
          <Loader2 size={16} className="animate-spin" />
          Proceso en curso. Te notificaremos cuando finalice.
        </div>
      );
    }

    if (job.status === 'completed') {
      return (
        <div className="flex items-center gap-2 text-success text-sm">
          <CheckCircle2 size={16} />
          Cuenta eliminada definitivamente.
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
          title="2. Generar y descargar snapshot"
          description="Descarga el respaldo completo antes de continuar."
          status={job?.status === 'snapshot_ready' ? 'done' : job ? 'progress' : 'pending'}
        />
        <WizardStep
          title="3. Confirmar eliminación"
          description="Una vez confirmado, el proceso no se puede revertir."
          status={job?.status === 'completed' ? 'done' : job?.status ? 'progress' : 'pending'}
        />
      </div>

      <div className="rounded-lg border border-subtle bg-elevated/60 p-3 flex items-center gap-3 text-sm text-secondary">
        <span className="font-medium text-primary">Estado:</span>
        <span>{statusLabel}</span>
        {job?.snapshotReadyAt && (
          <span className="text-muted">Snapshot listo el {new Date(job.snapshotReadyAt).toLocaleString()}</span>
        )}
      </div>

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
