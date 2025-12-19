import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  AudioLines,
  Bot,
  BotMessageSquare,
  BotOff,
  File,
  Images,
  Loader2,
  Mic,
  MoveUp,
  Paperclip,
  SmilePlus,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { AttachmentPanel, type AttachmentAction } from './AttachmentPanel';
import { AudioRecorderPanel } from './AudioRecorderPanel';
import { CameraCaptureModal } from './CameraCaptureModal';
import { EmojiPanel } from './EmojiPanel';
import { useAutomation, type AutomationMode } from '../../hooks/useAutomation';

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

type ComposerMediaItem = {
  type: 'image' | 'document' | 'audio' | 'video';
  url: string;
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  waveformData?: any;
};

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
}) {
  const MAX_MESSAGE_CHARS = 4000;

  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [queuedMedia, setQueuedMedia] = useState<ComposerMediaItem[]>([]);
  const [isAIModeOpen, setIsAIModeOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isAudioRecorderOpen, setIsAudioRecorderOpen] = useState(false);
  const [wasTextTruncated, setWasTextTruncated] = useState(false);

  const { currentMode, isLoading: isAutomationLoading, loadMode, setRule } = useAutomation(props.accountId ?? null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const openGalleryRef = useRef<(() => void) | null>(null);
  const openDocumentRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!props.accountId) return;
    void loadMode(props.relationshipId);
  }, [props.accountId, props.relationshipId, loadMode]);

  const effectiveAIMode: AutomationMode = props.accountId ? currentMode : 'disabled';
  const isAutomaticMode = effectiveAIMode === 'automatic';
  const hasQueuedMedia = queuedMedia.length > 0;
  const hasText = props.value.trim().length > 0;
  const canSend = !props.disabled && !props.isSending && !isAutomaticMode && (hasText || hasQueuedMedia);
  const canOpenAIModeSelector = !!props.accountId && !props.disabled;

  const handleChangeValue = (nextValue: string) => {
    if (nextValue.length > MAX_MESSAGE_CHARS) {
      setWasTextTruncated(true);
      props.onChange(nextValue.slice(0, MAX_MESSAGE_CHARS));
      return;
    }

    if (wasTextTruncated) setWasTextTruncated(false);
    props.onChange(nextValue);
  };

  const insertEmojiAtCursor = (emoji: string) => {
    const el = textareaRef.current;
    const currentValue = props.value;

    if (!el) {
      handleChangeValue(`${currentValue}${emoji}`);
      return;
    }

    const start = el.selectionStart ?? currentValue.length;
    const end = el.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${emoji}${currentValue.slice(end)}`;
    const nextCursor = start + emoji.length;

    handleChangeValue(nextValue);

    requestAnimationFrame(() => {
      const nextEl = textareaRef.current;
      if (!nextEl) return;
      const cursorPos = Math.min(nextCursor, nextEl.value.length);
      nextEl.focus();
      nextEl.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const enqueueMedia = (item: ComposerMediaItem) => {
    setQueuedMedia((prev) => [...prev, item]);
  };

  const removeQueuedMedia = (index: number) => {
    setQueuedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!canSend) return;
    const media = hasQueuedMedia ? queuedMedia : undefined;
    await props.onSend({ text: props.value, ...(media ? { media } : {}) });
    setQueuedMedia([]);
    setIsAttachmentOpen(false);
    setIsAIModeOpen(false);
    setIsEmojiOpen(false);
    setIsAudioRecorderOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const setAIMode = async (mode: AutomationMode) => {
    if (!props.accountId) return;
    await setRule(mode, { relationshipId: props.relationshipId });
    await loadMode(props.relationshipId);
    setIsAIModeOpen(false);
  };

  const AIIcon =
    effectiveAIMode === 'automatic'
      ? Bot
      : effectiveAIMode === 'supervised'
        ? BotMessageSquare
        : BotOff;

  const aiColorClassName =
    effectiveAIMode === 'automatic'
      ? 'text-success'
      : effectiveAIMode === 'supervised'
        ? 'text-warning'
        : 'text-muted';

  const handleSelectAttachment = (action: AttachmentAction) => {
    setIsAttachmentOpen(false);
    setIsEmojiOpen(false);
    props.onClearUploadError();

    switch (action) {
      case 'camera':
        setIsCameraOpen(true);
        break;
      case 'gallery':
      case 'receipt':
        openGalleryRef.current?.();
        break;
      case 'document':
        openDocumentRef.current?.();
        break;
      case 'audio':
        if (props.disabled || props.isUploading || props.isSending) break;
        setIsAudioRecorderOpen(true);
        setIsAIModeOpen(false);
        setIsEmojiOpen(false);
        break;
      default:
        break;
    }
  };

  const renderAudioRecorderMode = () => (
    <AudioRecorderPanel
      open={isAudioRecorderOpen}
      disabled={props.disabled || props.isUploading || props.isSending}
      onDiscard={() => {
        setIsAudioRecorderOpen(false);
      }}
      onSend={async (file) => {
        const res = await props.uploadAudio({ file });
        if (!res.success || !res.data?.attachment) return;

        await props.onSend({
          text: '',
          media: [
            {
              type: 'audio',
              url: res.data.attachment.url,
              attachmentId: res.data.attachment.id,
              filename: res.data.attachment.filename,
              mimeType: res.data.attachment.mimeType,
              size: res.data.attachment.sizeBytes,
              waveformData: res.data.waveformData,
            },
          ],
        });

        setIsAudioRecorderOpen(false);
        setIsAttachmentOpen(false);
        setIsAIModeOpen(false);
        setIsEmojiOpen(false);
      }}
    />
  );

  const renderAIModeSelector = () => (
    <div className="bg-surface border border-default rounded-2xl px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 text-center">
          <div className="text-sm text-primary font-semibold">Modos de respuesta IA</div>
          <div className="text-xs text-secondary">Fluxcore by Claude Sonnet4.5</div>
        </div>
        <div className="text-xs text-secondary">Créditos 250</div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => void setAIMode('supervised')}
          className={clsx(
            'rounded-2xl p-4 border transition-colors flex flex-col items-center justify-center gap-3',
            effectiveAIMode === 'supervised'
              ? 'bg-elevated border-strong text-primary'
              : 'bg-elevated border-subtle text-secondary hover:bg-hover hover:text-primary'
          )}
          disabled
          title="Solo Premium"
        >
          <BotMessageSquare className="w-6 h-6 text-warning" />
          <span className="text-xs">Supervisado</span>
        </button>

        <button
          type="button"
          onClick={() => void setAIMode('automatic')}
          className={clsx(
            'rounded-2xl p-4 border transition-colors flex flex-col items-center justify-center gap-3',
            effectiveAIMode === 'automatic'
              ? 'bg-elevated border-strong text-primary'
              : 'bg-elevated border-subtle text-secondary hover:bg-hover hover:text-primary'
          )}
          disabled={!props.accountId || isAutomationLoading}
        >
          <Bot className="w-6 h-6 text-success" />
          <span className="text-xs">Automático</span>
        </button>

        <button
          type="button"
          onClick={() => void setAIMode('disabled')}
          className={clsx(
            'rounded-2xl p-4 border transition-colors flex flex-col items-center justify-center gap-3',
            effectiveAIMode === 'disabled'
              ? 'bg-elevated border-strong text-primary'
              : 'bg-elevated border-subtle text-secondary hover:bg-hover hover:text-primary'
          )}
          disabled={!props.accountId || isAutomationLoading}
        >
          <BotOff className="w-6 h-6 text-muted" />
          <span className="text-xs">Desactivado</span>
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setIsAIModeOpen(false)}
          className="px-4 py-2 text-sm rounded-full bg-hover text-primary hover:bg-active transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );

  const renderAutomaticMode = () => (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => void setAIMode('disabled')}
        disabled={!props.accountId || props.disabled || isAutomationLoading}
        className={clsx(
          'px-5 h-12 rounded-full border transition-colors flex-shrink-0',
          props.disabled || !props.accountId
            ? 'bg-active border-default text-muted cursor-not-allowed opacity-60'
            : 'bg-surface border-default text-primary hover:bg-hover'
        )}
      >
        Desactivar
      </button>

      <div className="flex-1 min-w-0 bg-surface border border-default rounded-full px-4 h-12 flex items-center justify-center">
        <div className="text-sm text-primary text-center truncate">
          Fluxcore responderá automáticamente por usted usando Claude Sonnet4.5
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!canOpenAIModeSelector) return;
          setIsAIModeOpen(true);
          setIsAttachmentOpen(false);
          setIsEmojiOpen(false);
          setIsAudioRecorderOpen(false);
        }}
        disabled={!canOpenAIModeSelector}
        className={clsx(
          'w-12 h-12 rounded-full flex items-center justify-center transition-colors flex-shrink-0 border',
          !canOpenAIModeSelector
            ? 'bg-active border-default text-muted cursor-not-allowed opacity-60'
            : 'bg-surface border-default hover:bg-hover'
        )}
        title="Modo IA"
      >
        <AIIcon size={20} className={aiColorClassName} />
      </button>
    </div>
  );

  const renderManualMode = () => (
    <div>
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0 bg-surface border border-default rounded-full px-2 sm:px-3 py-2 flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              if (props.disabled) return;
              setIsEmojiOpen((v) => !v);
              setIsAttachmentOpen(false);
              setIsAIModeOpen(false);
              setIsAudioRecorderOpen(false);
            }}
            className={clsx(
              'p-1.5 sm:p-2 rounded-full transition-colors flex-shrink-0',
              props.disabled ? 'text-muted cursor-not-allowed opacity-60' : 'text-secondary hover:text-primary hover:bg-hover'
            )}
            disabled={props.disabled}
            title="Emojis"
          >
            <SmilePlus size={20} />
          </button>

          <textarea
            ref={textareaRef}
            value={props.value}
            onChange={(e) => handleChangeValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            disabled={props.isSending || props.disabled}
            className="flex-1 min-w-0 bg-transparent text-primary placeholder:text-muted resize-none focus:outline-none text-sm max-h-32"
            rows={1}
          />

          <button
            type="button"
            onClick={() => {
              if (props.isUploading) return;
              setIsAttachmentOpen((v) => !v);
              setIsAIModeOpen(false);
              setIsEmojiOpen(false);
              setIsAudioRecorderOpen(false);
            }}
            className={clsx(
              'p-1.5 sm:p-2 rounded-full transition-colors flex-shrink-0',
              props.isUploading || props.disabled
                ? 'text-muted cursor-not-allowed opacity-60'
                : 'text-secondary hover:text-primary hover:bg-hover'
            )}
            title="Adjuntar"
            disabled={props.isUploading || props.disabled}
          >
            <Paperclip size={20} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (props.isUploading) return;
              if (props.disabled || props.isSending) return;
              setIsAudioRecorderOpen(true);
              setIsAttachmentOpen(false);
              setIsAIModeOpen(false);
              setIsEmojiOpen(false);
            }}
            className={clsx(
              'p-1.5 sm:p-2 rounded-full transition-colors flex-shrink-0',
              props.isUploading || props.disabled
                ? 'text-muted cursor-not-allowed opacity-60'
                : 'text-secondary hover:text-primary hover:bg-hover'
            )}
            title="Audio"
            disabled={props.isUploading || props.disabled}
          >
            <Mic size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (canSend) {
              void handleSend();
              return;
            }

            if (!canOpenAIModeSelector) return;
            setIsAIModeOpen(true);
            setIsAttachmentOpen(false);
            setIsEmojiOpen(false);
            setIsAudioRecorderOpen(false);
          }}
          disabled={props.disabled || props.isSending || (!canSend && !canOpenAIModeSelector)}
          className={clsx(
            'w-12 h-12 rounded-full flex items-center justify-center transition-colors flex-shrink-0 border',
            canSend && !props.isSending
              ? 'bg-accent border-accent text-inverse hover:bg-accent-hover'
              : 'bg-surface border-default hover:bg-hover',
            props.disabled ? 'opacity-60 cursor-not-allowed' : ''
          )}
          title={canSend ? 'Enviar' : 'Modo IA'}
        >
          {props.isSending ? (
            <Loader2 className="animate-spin" size={20} />
          ) : canSend ? (
            <MoveUp size={20} />
          ) : (
            <AIIcon size={20} className={aiColorClassName} />
          )}
        </button>
      </div>

      {(wasTextTruncated || props.value.length >= MAX_MESSAGE_CHARS * 0.9) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-xs text-muted">
            {wasTextTruncated
              ? `El mensaje fue recortado a ${MAX_MESSAGE_CHARS} caracteres para evitar errores.`
              : 'Estás cerca del límite de caracteres.'}
          </div>
          <div className="text-xs text-muted">{props.value.length}/{MAX_MESSAGE_CHARS}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="px-4 py-3 sm:py-4 bg-active border-t border-subtle flex-shrink-0 relative">
      <CameraCaptureModal
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onSend={async (file) => {
          const res = await props.uploadFile({ file, type: 'image' });
          if (!res.success) {
            return { ok: false, error: res.error || 'Error al subir imagen' };
          }

          if (res.success && res.data?.attachment) {
            enqueueMedia({
              type: 'image',
              url: res.data.attachment.url,
              attachmentId: res.data.attachment.id,
              filename: res.data.attachment.filename,
              mimeType: res.data.attachment.mimeType,
              size: res.data.attachment.sizeBytes,
            });
          }

          return { ok: true };
        }}
      />

      <AttachmentPanel
        open={isAttachmentOpen}
        onClose={() => setIsAttachmentOpen(false)}
        onSelect={handleSelectAttachment}
      />

      <EmojiPanel
        open={isEmojiOpen}
        onClose={() => setIsEmojiOpen(false)}
        onSelect={(emoji) => {
          insertEmojiAtCursor(emoji);
        }}
      />

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={(el) => {
          openGalleryRef.current = () => el?.click();
        }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = '';

          const res = await props.uploadFile({ file, type: 'image' });
          if (res.success && res.data?.attachment) {
            enqueueMedia({
              type: 'image',
              url: res.data.attachment.url,
              attachmentId: res.data.attachment.id,
              filename: res.data.attachment.filename,
              mimeType: res.data.attachment.mimeType,
              size: res.data.attachment.sizeBytes,
            });
          }
        }}
      />

      <input
        type="file"
        accept="application/pdf,text/plain,application/msword"
        className="hidden"
        ref={(el) => {
          openDocumentRef.current = () => el?.click();
        }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = '';

          const res = await props.uploadFile({ file, type: 'document' });
          if (res.success && res.data?.attachment) {
            enqueueMedia({
              type: 'document',
              url: res.data.attachment.url,
              attachmentId: res.data.attachment.id,
              filename: res.data.attachment.filename,
              mimeType: res.data.attachment.mimeType,
              size: res.data.attachment.sizeBytes,
            });
          }
        }}
      />

      {props.isUploading && (
        <div className="mb-2">
          <div className="h-1 w-full bg-elevated rounded-full overflow-hidden border border-subtle">
            <div className="h-full bg-accent" style={{ width: `${props.uploadProgress}%` }} />
          </div>
          <div className="mt-1 text-xs text-muted">Subiendo... {props.uploadProgress}%</div>
        </div>
      )}

      {queuedMedia.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto">
          {queuedMedia.map((m, index) => {
            const Icon = m.type === 'image' ? Images : m.type === 'audio' ? AudioLines : File;
            return (
              <div
                key={`${m.attachmentId}-${index}`}
                className="flex items-center gap-2 px-3 py-2 bg-active border border-subtle rounded-full min-w-0"
              >
                <Icon className="w-4 h-4 text-secondary flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-primary truncate max-w-[180px]">{m.filename}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeQueuedMedia(index)}
                  className="p-1 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors flex-shrink-0"
                  aria-label="Quitar adjunto"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isAIModeOpen
        ? renderAIModeSelector()
        : isAudioRecorderOpen
          ? renderAudioRecorderMode()
          : isAutomaticMode
            ? renderAutomaticMode()
            : renderManualMode()}
    </div>
  );

}
