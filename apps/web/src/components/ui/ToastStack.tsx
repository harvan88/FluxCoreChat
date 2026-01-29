import { X } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';

export function ToastStack() {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'rounded-xl border px-4 py-3 shadow-lg backdrop-blur flex items-start gap-3 text-sm',
            toast.type === 'success' && 'border-success/40 bg-success/10 text-success',
            toast.type === 'error' && 'border-error/40 bg-error/10 text-error',
            toast.type === 'info' && 'border-info/40 bg-info/10 text-info',
          )}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium">{toast.title}</p>
            {toast.description && <p className="opacity-90 text-xs mt-0.5">{toast.description}</p>}
          </div>
          <button
            aria-label="Cerrar notificación"
            className="text-secondary hover:text-primary transition-colors"
            onClick={() => removeToast(toast.id)}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
