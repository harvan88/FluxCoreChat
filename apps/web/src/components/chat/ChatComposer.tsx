
import { StandardComposer } from './StandardComposer';
import { FluxCoreComposer } from '../../extensions/fluxcore/components/FluxCoreComposer';
import { useExtensions } from '../../hooks/useExtensions';

// Definición de tipos duplicada para compatibilidad externa si alguien importa tipos de aquí
// Idealmente mover a un archivo de tipos compartido.
type UploadFileFn = (args: { file: File; type: 'image' | 'document' | 'video' }) => Promise<{
  success: boolean;
  error?: string;
  data?: {
    attachment?: {
      id: string;
      url: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
    };
  };
}>;

type UploadAudioFn = (args: { file: File }) => Promise<{
  success: boolean;
  error?: string;
  data?: {
    attachment?: {
      id: string;
      url: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
    };
    waveformData?: any;
  };
}>;

type UserActivityType = 'typing' | 'recording' | 'idle' | 'cancel';

export function ChatComposer(props: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  isSending: boolean;
  onSend: (overrideContent?: { text: string; media?: any[] }) => Promise<void>;

  accountId?: string;
  relationshipId?: string;

  uploadFile: UploadFileFn;
  uploadAudio: UploadAudioFn;
  isUploading: boolean;
  uploadProgress: number;
  onClearUploadError: () => void;
  onUserActivity?: (activity: UserActivityType) => void;
}) {
  const { installations } = useExtensions(props.accountId ?? null);

  // Lógica de inyección: Si FluxCore está instalado y habilitado, toma el control.
  const isFluxCoreEnabled = installations.some(
    (i) => i.extensionId === '@fluxcore/fluxcore' && i.enabled
  );

  if (isFluxCoreEnabled) {
    return <FluxCoreComposer {...props} />;
  }

  return <StandardComposer {...props} />;
}
