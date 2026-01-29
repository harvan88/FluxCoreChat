import { AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';

export function AccountDeletionBanner() {
  const banner = useUIStore((state) => state.accountDeletionBanner);
  const clearBanner = useUIStore((state) => state.clearAccountDeletionBanner);

  if (!banner) {
    return null;
  }

  const { status, accountName, message } = banner;

  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={18} className="text-success" />;
      case 'failed':
        return <AlertCircle size={18} className="text-error" />;
      default:
        return <Shield size={18} className="text-info" />;
    }
  };

  const getClasses = () => {
    switch (status) {
      case 'completed':
        return 'border-success/40 bg-success/10 text-success';
      case 'failed':
        return 'border-error/40 bg-error/10 text-error';
      default:
        return 'border-info/40 bg-info/10 text-info';
    }
  };

  const getText = () => {
    const name = accountName || 'la cuenta seleccionada';
    if (status === 'completed') {
      return `Eliminación completada para ${name}.`;
    }
    if (status === 'failed') {
      return message || `Eliminación fallida para ${name}.`;
    }
    return `Eliminando ${name}. Este proceso puede tardar unos minutos.`;
  };

  return (
    <div className="fixed top-4 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 px-4">
      <div className={clsx('rounded-xl border px-4 py-3 shadow-lg backdrop-blur', getClasses())}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {status === 'processing' ? <Loader2 size={18} className="animate-spin" /> : getIcon()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Eliminación de cuenta</p>
            <p className="text-sm opacity-90">{getText()}</p>
          </div>
          {status !== 'processing' && (
            <button
              onClick={clearBanner}
              className="text-secondary hover:text-primary transition-colors"
              aria-label="Cerrar banner de eliminación"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
