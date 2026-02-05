import clsx from 'clsx';
import {
  AudioLines,
  Camera,
  File,
  Images,
  MapPin,
  ReceiptText,
  UserRound,
  Zap,
} from 'lucide-react';

export type AttachmentAction =
  | 'document'
  | 'camera'
  | 'gallery'
  | 'audio'
  | 'receipt'
  | 'location'
  | 'quick_reply'
  | 'contact';

const items: Array<{
  id: AttachmentAction;
  label: string;
  Icon: typeof File;
  colorClassName: string;
  enabled: boolean;
}> = [
    { id: 'document', label: 'Documento', Icon: File, colorClassName: 'text-info', enabled: true },
    { id: 'camera', label: 'Cámara', Icon: Camera, colorClassName: 'text-accent', enabled: true },
    { id: 'gallery', label: 'Galería', Icon: Images, colorClassName: 'text-error', enabled: true },
    { id: 'audio', label: 'Audio', Icon: AudioLines, colorClassName: 'text-error', enabled: true },
    { id: 'receipt', label: 'Recibo', Icon: ReceiptText, colorClassName: 'text-error', enabled: true },
    { id: 'location', label: 'Ubicación', Icon: MapPin, colorClassName: 'text-success', enabled: false },
    { id: 'quick_reply', label: 'Respuesta rápida', Icon: Zap, colorClassName: 'text-warning', enabled: true },
    { id: 'contact', label: 'Contacto', Icon: UserRound, colorClassName: 'text-info', enabled: false },
  ];

export function AttachmentPanel(props: {
  open: boolean;
  onClose: () => void;
  onSelect: (action: AttachmentAction) => void;
}) {
  if (!props.open) return null;

  return (
    <div className="absolute left-0 right-0 bottom-full mb-2">
      <div className="bg-base border border-default rounded-xl p-3">
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
              <item.Icon className={clsx('w-5 h-5', item.enabled ? item.colorClassName : 'text-muted')} />
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
