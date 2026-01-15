import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface DeleteFooterProps {
  isConfirming: boolean;
  actionLabel: string;
  confirmLabel?: string;
  confirmMessage?: string;
  onRequestDelete: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function DeleteFooter({
  isConfirming,
  actionLabel,
  confirmLabel = 'Eliminar definitivamente',
  confirmMessage = '¿Confirmar eliminación?',
  onRequestDelete,
  onConfirm,
  onCancel,
  children,
}: DeleteFooterProps) {
  return (
    <div className="border-t border-subtle p-4 bg-surface flex flex-wrap items-center gap-3 justify-start">
      {isConfirming ? (
        <>
          <span className="text-sm text-muted">{confirmMessage}</span>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-md bg-error px-3 py-1.5 text-sm font-medium text-inverse shadow-sm transition-colors hover:bg-error/90"
          >
            <Trash2 size={16} className="text-inverse" />
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-md bg-elevated px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-hover"
          >
            Cancelar
          </button>
        </>
      ) : (
        <button
          onClick={onRequestDelete}
          className="inline-flex items-center gap-1.5 rounded-md bg-error px-3 py-1.5 text-sm font-medium text-inverse shadow-sm transition-colors hover:bg-error/90"
          title={actionLabel}
        >
          <Trash2 size={16} className="text-inverse" />
          {actionLabel}
        </button>
      )}
      {children}
    </div>
  );
}
