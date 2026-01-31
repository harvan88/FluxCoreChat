import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button, Checkbox, Input } from '../ui';
import { useAccountDeletion } from '../../hooks/useAccountDeletion';
import type { Account } from '../../types';

interface AccountDeletionModalProps {
  account: Account;
  sessionAccountId?: string | null;
  onClose: () => void;
}

export function AccountDeletionModal({ account, sessionAccountId, onClose }: AccountDeletionModalProps) {
  const effectiveSessionAccountId = sessionAccountId ?? account.id;
  const {
    job,
    error,
    isRequesting,
    isConfirming,
    selectedDataHandling,
    setSelectedDataHandling,
    isPasswordVerified,
    passwordError,
    requestDeletion,
    confirmDeletion,
    verifyPassword,
    resetPasswordVerification,
  } = useAccountDeletion({
    accountId: account.id,
    sessionAccountId: effectiveSessionAccountId,
    accountName: account.displayName,
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [finalConsent, setFinalConsent] = useState(false);
  const [view, setView] = useState<'intro' | 'options' | 'confirm'>('intro');

  useEffect(() => {
    setFinalConsent(false);
    setPasswordInput('');
    resetPasswordVerification();
    setView('intro');
  }, [account.id, job?.id, resetPasswordVerification]);

  const handleVerifyPassword = async () => {
    const success = await verifyPassword(passwordInput);
    if (!success) {
      setPasswordInput('');
    }
    return success;
  };

  useEffect(() => {
    if (job) {
      setView('confirm');
    }
  }, [job]);

  const handleRequestWithPreference = async () => {
    try {
      await requestDeletion();
      setView('confirm');
    } catch (err) {
      // errors are surfaced via hook state; stay/return to options for claridad
      setView('options');
    }
  };

  const handleFinalDeletion = async () => {
    if (!passwordInput) {
      await handleVerifyPassword();
      return;
    }

    let verified = isPasswordVerified;
    if (!verified) {
      verified = await handleVerifyPassword();
    }
    if (!verified) return;

    try {
      await confirmDeletion();
      onClose();
    } catch {
      // El hook ya muestra el error correspondiente
    }
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <div className="flex items-center gap-2 rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-secondary">Eliminar cuenta</p>
            <h2 className="text-lg font-semibold text-primary">{account.displayName}</h2>
          </div>
          <button className="text-secondary hover:text-primary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {view === 'intro' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-primary">Estás a punto de eliminar tu cuenta</h3>
                <p className="mt-2 text-sm text-secondary leading-relaxed">
                  Estás a punto de eliminar tu cuenta de forma permanente.
                  <br />
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" onClick={() => setView('options')}>
                  Continuar
                </Button>
                <Button variant="ghost" className="flex-1" onClick={onClose}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {view === 'options' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-primary">Antes de continuar</h3>
                <p className="mt-2 text-sm text-secondary">¿Deseás conservar una copia de tus datos?</p>
              </div>
              <div className="space-y-2">
                {[
                  {
                    value: 'download_snapshot' as const,
                    title: 'Descargar mis datos',
                    description: 'Te enviaremos un archivo con la información antes de borrar todo.',
                  },
                  {
                    value: 'delete_all' as const,
                    title: 'Eliminar todo sin conservar datos',
                    description: 'Se eliminará todo de inmediato sin generar respaldo.',
                  },
                ].map((option) => {
                  const isActive = selectedDataHandling === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedDataHandling(option.value)}
                      className={`w-full rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-accent ${
                        isActive
                          ? 'border-accent bg-accent/5 text-primary'
                          : 'border-subtle text-secondary hover:border-accent/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{option.title}</p>
                        <span
                          className={`h-3.5 w-3.5 rounded-full border ${
                            isActive ? 'border-accent bg-accent' : 'border-muted'
                          }`}
                        />
                      </div>
                      <p className="text-xs mt-1">{option.description}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" onClick={handleRequestWithPreference} disabled={isRequesting}>
                  {isRequesting ? <Loader2 size={16} className="animate-spin" /> : 'Continuar'}
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => setView('intro')}>
                  Volver
                </Button>
              </div>
            </div>
          )}

          {view === 'confirm' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-semibold text-primary">Confirmación final</h3>
                <p className="mt-2 text-sm text-secondary">
                  Para continuar, escribí tu contraseña. Si sos owner o administrador, se utilizará la contraseña de tu sesión actual.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Contraseña</label>
                <Input
                  type="password"
                  value={passwordInput}
                  onChange={(event) => {
                    setPasswordInput(event.target.value);
                    if (isPasswordVerified) {
                      resetPasswordVerification();
                    }
                  }}
                  placeholder="••••••••"
                  error={passwordError || undefined}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleFinalDeletion();
                    }
                  }}
                />
                {isPasswordVerified && <p className="text-xs text-success">Contraseña verificada.</p>}
              </div>
              <Checkbox
                checked={finalConsent}
                onChange={(event) => setFinalConsent(event.target.checked)}
                label="Confirmo que entiendo que esta acción es irreversible"
              />
              {!job && (
                <Button variant="ghost" className="w-full" onClick={() => setView('options')}>
                  Volver a elegir qué hacer con mis datos
                </Button>
              )}
              <Button
                variant="danger"
                className="w-full"
                disabled={!finalConsent || !passwordInput || isConfirming || !job}
                onClick={handleFinalDeletion}
              >
                {isConfirming ? <Loader2 size={16} className="animate-spin" /> : 'Eliminar cuenta definitivamente'}
              </Button>
            </div>
          )}

          {renderError()}
        </div>
      </div>
    </div>
  );
}

export default AccountDeletionModal;
