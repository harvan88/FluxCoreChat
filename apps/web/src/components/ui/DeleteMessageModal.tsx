import { XIcon, TrashIcon, ShieldAlertIcon } from '../../lib/icon-library';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Eliminar mensaje{messageCount > 1 ? 's' : ''}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            ¿Qué quieres hacer con el{messageCount > 1 ? 's' : ''} mensaje{messageCount > 1 ? 's' : ''} seleccionado{messageCount > 1 ? 's' : ''}?
          </p>

          <div className="space-y-3">
            {/* Opción: Eliminar para mí */}
            <button
              onClick={handleDeleteForSelf}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrashIcon size={20} className="text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Eliminar para mí</div>
                <div className="text-sm text-gray-500">
                  Ocultar el{messageCount > 1 ? 's' : ''} mensaje{messageCount > 1 ? 's' : ''} solo para ti. 
                  Otras personas seguirán viéndolo{messageCount > 1 ? 's' : ''}.
                </div>
              </div>
            </button>

            {/* Opción: Eliminar para todos (si está permitido) */}
            {canDeleteForAll && (
              <button
                onClick={handleDeleteForAll}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-red-200 hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <ShieldAlertIcon size={20} className="text-red-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-red-900">Eliminar para todos</div>
                  <div className="text-sm text-red-600">
                    Redactar el{messageCount > 1 ? 's' : ''} mensaje{messageCount > 1 ? 's' : ''} para todos. 
                    Esta acción no se puede deshacer.
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Nota informativa */}
          {!canDeleteForAll && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <strong>Nota:</strong> Solo puedes eliminar para todos los mensajes que tú has enviado.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
