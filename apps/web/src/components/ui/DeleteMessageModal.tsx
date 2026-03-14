interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: 'self' | 'all') => void;
  messageCount?: number;
  canDeleteForAll?: boolean;
}

export function DeleteMessageModal({
  isOpen,
  onClose,
  onConfirm,
  messageCount = 1,
  canDeleteForAll = false,
}: DeleteMessageModalProps) {
  if (!isOpen) return null;

  const handleDeleteForSelf = () => {
    onConfirm('self');
    onClose();
  };

  const handleDeleteForAll = () => {
    onConfirm('all');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-overlay-dark flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 border border-subtle">
        {/* Header */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-primary">
            {messageCount === 1 ? '¿Quieres eliminar este mensaje?' : `¿Quieres eliminar estos ${messageCount} mensajes?`}
          </h3>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {/* Opción: Eliminar para mí */}
            <button
              onClick={handleDeleteForSelf}
              className="w-full text-left px-3 py-2 text-primary hover:bg-hover rounded transition-colors"
            >
              Eliminar para mí
            </button>

            {/* Opción: Eliminar para todos (si está permitido) */}
            {canDeleteForAll && (
              <button
                onClick={handleDeleteForAll}
                className="w-full text-left px-3 py-2 text-error hover:bg-error/10 rounded transition-colors"
              >
                Eliminar para todos
              </button>
            )}
          </div>

          {/* Nota informativa */}
          {!canDeleteForAll && (
            <div className="mt-4 p-3 bg-hover rounded-lg border border-subtle">
              <div className="text-sm text-secondary">
                <strong>Nota:</strong> Solo puedes eliminar para todos los mensajes que tú has enviado.
              </div>
            </div>
          )}

          {/* Footer unificado */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-primary border border-subtle rounded-lg hover:bg-hover transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
