
import { StandardComposer } from './StandardComposer';
import { FluxCoreComposer } from '../../extensions/fluxcore/components/FluxCoreComposer';
import { useExtensions } from '../../hooks/useExtensions';
import type { UploadAssetFn, UploadAudioFn } from './composerUploadTypes';

type UserActivityType = 'typing' | 'recording' | 'idle' | 'cancel';

export function ChatComposer(props: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  isSending: boolean;
  onSend: (overrideContent?: { text: string; media?: any[] }) => Promise<void>;

  accountId?: string;
  conversationId?: string;
  relationshipId?: string;

  uploadAsset: UploadAssetFn;
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
