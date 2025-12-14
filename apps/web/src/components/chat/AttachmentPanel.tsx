import clsx from 'clsx';

export type AttachmentAction =
  | 'document'
  | 'camera'
  | 'gallery'
  | 'audio'
  | 'receipt'
  | 'location'
  | 'quick_reply'
  | 'contact';

const items: Array<{ id: AttachmentAction; label: string; icon: string; enabled: boolean }> = [
  { id: 'document', label: 'Documento', icon: '📄', enabled: true },
  { id: 'camera', label: 'Cámara', icon: '📷', enabled: true },
  { id: 'gallery', label: 'Galería', icon: '🖼️', enabled: true },
  { id: 'audio', label: 'Audio', icon: '🎤', enabled: true },
  { id: 'receipt', label: 'Recibo', icon: '🧾', enabled: true },
  { id: 'location', label: 'Ubicación', icon: '📍', enabled: false },
  { id: 'quick_reply', label: 'Quick Reply', icon: '⚡', enabled: false },
  { id: 'contact', label: 'Contacto', icon: '👤', enabled: false },
];

export function AttachmentPanel(props: {
  open: boolean;
  onClose: () => void;
  onSelect: (action: AttachmentAction) => void;
}) {
  if (!props.open) return null;

  return (
    <div className="absolute left-4 right-4 bottom-[88px]">
      <div className="bg-surface border border-subtle rounded-xl p-3 shadow-lg">
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => item.enabled && props.onSelect(item.id)}
              disabled={!item.enabled}
              className={clsx(
                'flex flex-col items-center justify-center gap-1',
                'rounded-lg p-2 transition-colors',
                item.enabled
                  ? 'bg-elevated hover:bg-hover text-primary'
                  : 'bg-elevated text-muted opacity-60 cursor-not-allowed'
              )}
              title={item.label}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs text-secondary truncate w-full text-center">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={props.onClose}
            className="px-3 py-1.5 text-xs rounded-md bg-hover text-primary hover:bg-active transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
