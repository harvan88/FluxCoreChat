import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../../../services/api';
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
// Imports ajustados para ubicación en extensions/fluxcore/components
import { AttachmentPanel, type AttachmentAction } from '../../../components/chat/AttachmentPanel';
import { AudioRecorderPanel } from '../../../components/chat/AudioRecorderPanel';
import { CameraCaptureModal } from '../../../components/chat/CameraCaptureModal';
import { EmojiPanel } from '../../../components/chat/EmojiPanel';
import { TemplateQuickPicker } from '../../../components/chat/TemplateQuickPicker';
import { useAutomation, type AutomationMode } from '../../../hooks/useAutomation';
import type { ComposerMediaItem, UploadAssetFn, UploadAudioFn, ComposerUploadResult } from '../../../components/chat/composerUploadTypes';
import type { Template } from '../../../components/templates/types';

type UserActivityType = 'typing' | 'recording' | 'idle' | 'cancel';

export function FluxCoreComposer(props: {
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
    const MAX_MESSAGE_CHARS = 4000;

    const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
    const [isQuickPickerOpen, setIsQuickPickerOpen] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [queuedMedia, setQueuedMedia] = useState<ComposerMediaItem[]>([]);
    const [isAIModeOpen, setIsAIModeOpen] = useState(false);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [isAudioRecorderOpen, setIsAudioRecorderOpen] = useState(false);
    const [wasTextTruncated, setWasTextTruncated] = useState(false);

    // Hook de automatización (Propiedad de FluxCore)
    const { currentMode, isLoading: isAutomationLoading, loadMode, setRule } = useAutomation(props.accountId ?? null, props.relationshipId);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const openGalleryRef = useRef<(() => void) | null>(null);
    const openDocumentRef = useRef<(() => void) | null>(null);

    const effectiveAIMode: AutomationMode = props.accountId ? currentMode : 'disabled';
    const isAutomaticMode = effectiveAIMode === 'automatic';
    const hasQueuedMedia = queuedMedia.length > 0;
    const hasText = props.value.trim().length > 0;
    const canSend = !props.disabled && !props.isSending && !isAutomaticMode && (hasText || hasQueuedMedia);
    const canOpenAIModeSelector = !!props.accountId && !props.disabled;

    useEffect(() => {
        if (isAudioRecorderOpen) {
            props.onUserActivity?.('recording');
        } else if (hasText) {
            props.onUserActivity?.('typing');
        } else {
            props.onUserActivity?.('idle');
        }
    }, [isAudioRecorderOpen, hasText]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

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
        if (!el) {
            handleChangeValue(`${props.value}${emoji}`);
            return;
        }
        const start = el.selectionStart ?? props.value.length;
        const end = el.selectionEnd ?? props.value.length;
        const nextValue = `${props.value.slice(0, start)}${emoji}${props.value.slice(end)}`;
        handleChangeValue(nextValue);
    };

    const enqueueMedia = (item: ComposerMediaItem) => {
        setQueuedMedia((prev) => [...prev, item]);
    };

    const buildMediaFromResult = (
        result: ComposerUploadResult,
        type: ComposerMediaItem['type'],
    ): ComposerMediaItem | null => {
        if (!result.success || !result.asset) {
            return null;
        }

        return {
            id: result.asset.assetId,
            assetId: result.asset.assetId,
            type,
            name: result.asset.name,
            mimeType: result.asset.mimeType,
            sizeBytes: result.asset.sizeBytes,
            previewUrl: result.previewUrl,
            waveformData: result.waveformData,
        };
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
        setIsQuickPickerOpen(false);
        props.onUserActivity?.('cancel');
    };

    const handleQuickSelect = async (template: Template) => {
        setIsQuickPickerOpen(false);
        if (!props.accountId || !props.conversationId) return;

        try {
            await api.executeTemplate(props.accountId, template.id, {
                conversationId: props.conversationId,
            });
            // La UI se actualizará via WebSocket o refresh del padre
        } catch (err) {
            console.error('Failed to execute template:', err);
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
                setIsQuickPickerOpen(false);
                break;
            case 'quick_reply':
                setIsQuickPickerOpen(true);
                break;
        }
    };

    const renderAudioRecorderMode = () => (
        <AudioRecorderPanel
            open={isAudioRecorderOpen}
            disabled={props.disabled || props.isUploading || props.isSending}
            onDiscard={() => setIsAudioRecorderOpen(false)}
            onSend={async (file) => {
                const result = await props.uploadAudio({ file });
                if (!result.success || !result.asset) return;
                await props.onSend({
                    text: '',
                    media: [{
                        type: 'audio',
                        assetId: result.asset.assetId,
                        name: result.asset.name,
                        mimeType: result.asset.mimeType,
                        sizeBytes: result.asset.sizeBytes,
                        waveformData: result.waveformData,
                    }],
                });
                setIsAudioRecorderOpen(false);
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
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
                {/* Botones de modo */}
                <button type="button" onClick={() => setAIMode('supervised')} disabled className="rounded-2xl p-4 border flex flex-col items-center justify-center gap-3 bg-elevated border-subtle text-secondary cursor-not-allowed">
                    <BotMessageSquare className="w-6 h-6 text-warning" />
                    <span className="text-xs">Supervisado</span>
                </button>
                <button type="button" onClick={() => setAIMode('automatic')} disabled={!props.accountId || isAutomationLoading} className={clsx('rounded-2xl p-4 border flex flex-col items-center justify-center gap-3', effectiveAIMode === 'automatic' ? 'bg-elevated border-strong text-primary' : 'bg-elevated border-subtle hover:bg-hover')}>
                    <Bot className="w-6 h-6 text-success" />
                    <span className="text-xs">Automático</span>
                </button>
                <button type="button" onClick={() => setAIMode('disabled')} disabled={!props.accountId || isAutomationLoading} className={clsx('rounded-2xl p-4 border flex flex-col items-center justify-center gap-3', effectiveAIMode === 'disabled' ? 'bg-elevated border-strong text-primary' : 'bg-elevated border-subtle hover:bg-hover')}>
                    <BotOff className="w-6 h-6 text-muted" />
                    <span className="text-xs">Desactivado</span>
                </button>
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={() => setIsAIModeOpen(false)} className="px-4 py-2 text-sm rounded-full bg-hover text-primary hover:bg-active">Cerrar</button>
            </div>
        </div>
    );

    const renderAutomaticMode = () => (
        <div className="flex items-center gap-3">
            <button onClick={() => setAIMode('disabled')} disabled={!props.accountId || props.disabled} className="px-5 h-12 rounded-full border bg-surface border-default text-primary hover:bg-hover">Desactivar</button>
            <div className="flex-1 min-w-0 bg-surface border border-default rounded-full px-4 h-12 flex items-center justify-center">
                <div className="text-sm text-primary text-center truncate">Fluxcore responderá automáticamente</div>
            </div>
            <button onClick={() => { if (canOpenAIModeSelector) setIsAIModeOpen(true); }} className="w-12 h-12 rounded-full flex items-center justify-center border bg-surface border-default hover:bg-hover">
                <AIIcon size={20} className={aiColorClassName} />
            </button>
        </div>
    );

    const renderManualMode = () => (
        <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0 bg-surface border border-default rounded-full px-3 py-2 flex items-center gap-2">
                <button onClick={() => setIsEmojiOpen(!isEmojiOpen)} className="text-secondary hover:text-primary"><SmilePlus size={20} /></button>
                <textarea ref={textareaRef} value={props.value} onChange={(e) => handleChangeValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Escribe un mensaje..." disabled={props.disabled} className="flex-1 bg-transparent resize-none focus:outline-none text-sm max-h-32" rows={1} />
                <button onClick={() => setIsAttachmentOpen(!isAttachmentOpen)} className="text-secondary hover:text-primary"><Paperclip size={20} /></button>
                <button onClick={() => setIsAudioRecorderOpen(true)} className="text-secondary hover:text-primary"><Mic size={20} /></button>
            </div>
            <button onClick={() => {
                if (canSend) handleSend();
                else if (canOpenAIModeSelector) setIsAIModeOpen(true);
            }} disabled={props.disabled || props.isSending} className={clsx('w-12 h-12 rounded-full flex items-center justify-center transition-colors', canSend ? 'bg-accent text-inverse' : 'bg-surface border border-default text-muted')}>
                {props.isSending ? <Loader2 className="animate-spin" size={20} /> : canSend ? <MoveUp size={20} /> : <AIIcon size={20} className={aiColorClassName} />}
            </button>
        </div>
    );

    return (
        <div className="px-4 py-3 sm:py-4 bg-active border-t border-subtle flex-shrink-0 relative">
            <CameraCaptureModal open={isCameraOpen} onClose={() => setIsCameraOpen(false)} onSend={async (file) => {
                const result = await props.uploadAsset({ file, type: 'image' });
                const media = buildMediaFromResult(result, 'image');
                if (media) {
                    enqueueMedia(media);
                    return { ok: true };
                }
                return { ok: false };
            }} />
            <AttachmentPanel open={isAttachmentOpen} onClose={() => setIsAttachmentOpen(false)} onSelect={handleSelectAttachment} />
            <EmojiPanel open={isEmojiOpen} onClose={() => setIsEmojiOpen(false)} onSelect={insertEmojiAtCursor} />

            {isQuickPickerOpen && props.accountId && (
                <TemplateQuickPicker
                    accountId={props.accountId}
                    onSelect={handleQuickSelect}
                    onClose={() => setIsQuickPickerOpen(false)}
                />
            )}
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

                    const result = await props.uploadAsset({ file, type: 'image' });
                    const media = buildMediaFromResult(result, 'image');
                    if (media) {
                        enqueueMedia(media);
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

                    const result = await props.uploadAsset({ file, type: 'document' });
                    const media = buildMediaFromResult(result, 'document');
                    if (media) {
                        enqueueMedia(media);
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
                                key={`${m.id}-${index}`}
                                className="flex items-center gap-2 px-3 py-2 bg-active border border-subtle rounded-full min-w-0"
                            >
                                <Icon className="w-4 h-4 text-secondary flex-shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-xs text-primary truncate max-w-[180px]">{m.name}</div>
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

            {isAIModeOpen ? renderAIModeSelector() : isAudioRecorderOpen ? renderAudioRecorderMode() : isAutomaticMode ? renderAutomaticMode() : renderManualMode()}
        </div>
    );
}
