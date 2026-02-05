import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../../services/api';
import {
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
import { TemplateQuickPicker } from './TemplateQuickPicker';
import type { ComposerMediaItem, UploadAssetFn, UploadAudioFn, ComposerUploadResult } from './composerUploadTypes';
import type { Template } from '../templates/types';

type UserActivityType = 'typing' | 'recording' | 'idle' | 'cancel';

export function StandardComposer(props: {
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
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [isAudioRecorderOpen, setIsAudioRecorderOpen] = useState(false);
    const [wasTextTruncated, setWasTextTruncated] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const openGalleryRef = useRef<(() => void) | null>(null);
    const openDocumentRef = useRef<(() => void) | null>(null);

    const hasQueuedMedia = queuedMedia.length > 0;
    const hasText = props.value.trim().length > 0;
    const canSend = !props.disabled && !props.isSending && (hasText || hasQueuedMedia);

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

    const handleSelectAttachment = (action: AttachmentAction) => {
        setIsAttachmentOpen(false);
        setIsEmojiOpen(false);
        setIsQuickPickerOpen(false);
        props.onClearUploadError();

        switch (action) {
            case 'camera': setIsCameraOpen(true); break;
            case 'gallery': case 'receipt': openGalleryRef.current?.(); break;
            case 'document': openDocumentRef.current?.(); break;
            case 'audio':
                if (props.disabled || props.isUploading || props.isSending) break;
                setIsAudioRecorderOpen(true);
                break;
            case 'quick_reply':
                setIsQuickPickerOpen(true);
                break;
        }
    };

    return (
        <div className="px-4 py-3 sm:py-4 bg-active border-t border-subtle flex-shrink-0 relative">
            <CameraCaptureModal
                open={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onSend={async (file) => {
                    const result = await props.uploadAsset({ file, type: 'image' });
                    const media = buildMediaFromResult(result, 'image');
                    if (media) {
                        enqueueMedia(media);
                        return { ok: true };
                    }
                    return { ok: false, error: result.error || 'Error' };
                }}
            />

            <AttachmentPanel open={isAttachmentOpen} onClose={() => setIsAttachmentOpen(false)} onSelect={handleSelectAttachment} />
            <EmojiPanel open={isEmojiOpen} onClose={() => setIsEmojiOpen(false)} onSelect={insertEmojiAtCursor} />

            {isQuickPickerOpen && props.accountId && (
                <TemplateQuickPicker
                    accountId={props.accountId}
                    onSelect={handleQuickSelect}
                    onClose={() => setIsQuickPickerOpen(false)}
                />
            )}

            <input type="file" accept="image/*" className="hidden" ref={(el) => { openGalleryRef.current = () => el?.click(); }} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const result = await props.uploadAsset({ file, type: 'image' });
                    const media = buildMediaFromResult(result, 'image');
                    if (media) {
                        enqueueMedia(media);
                    }
                }
                e.target.value = '';
            }} />

            <input type="file" accept="application/pdf,text/plain,application/msword" className="hidden" ref={(el) => { openDocumentRef.current = () => el?.click(); }} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const result = await props.uploadAsset({ file, type: 'document' });
                    const media = buildMediaFromResult(result, 'document');
                    if (media) {
                        enqueueMedia(media);
                    }
                }
                e.target.value = '';
            }} />

            {props.isUploading && (
                <div className="mb-2 text-xs text-muted">Subiendo... {props.uploadProgress}%</div>
            )}

            {queuedMedia.length > 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto">
                    {queuedMedia.map((m, index) => (
                        <div key={`${m.id}-${index}`} className="flex items-center gap-2 px-3 py-2 bg-active border border-subtle rounded-full">
                            <span className="text-xs truncate max-w-[150px]">{m.name}</span>
                            <button onClick={() => removeQueuedMedia(index)}><X size={14} /></button>
                        </div>
                    ))}
                </div>
            )}

            {isAudioRecorderOpen ? (
                <AudioRecorderPanel
                    open={true}
                    disabled={props.disabled}
                    onDiscard={() => setIsAudioRecorderOpen(false)}
                    onSend={async (file) => {
                        const result = await props.uploadAudio({ file });
                        if (result.success && result.asset) {
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
                        }
                    }}
                />
            ) : (
                <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0 bg-surface border border-default rounded-full px-3 py-2 flex items-center gap-2">
                        <button type="button" onClick={() => setIsEmojiOpen(!isEmojiOpen)} className="text-secondary hover:text-primary"><SmilePlus size={20} /></button>
                        <textarea
                            ref={textareaRef}
                            value={props.value}
                            onChange={(e) => handleChangeValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe un mensaje..."
                            disabled={props.disabled}
                            className="flex-1 bg-transparent resize-none focus:outline-none text-sm max-h-32"
                            rows={1}
                        />
                        <button type="button" onClick={() => setIsAttachmentOpen(!isAttachmentOpen)} className="text-secondary hover:text-primary"><Paperclip size={20} /></button>
                        <button type="button" onClick={() => setIsAudioRecorderOpen(true)} className="text-secondary hover:text-primary"><Mic size={20} /></button>
                    </div>
                    <button
                        onClick={() => handleSend()}
                        disabled={!canSend || props.isSending}
                        className={clsx(
                            'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                            canSend ? 'bg-accent text-inverse hover:bg-accent-hover' : 'bg-surface border border-default text-muted'
                        )}
                    >
                        {props.isSending ? <Loader2 className="animate-spin" size={20} /> : <MoveUp size={20} />}
                    </button>
                </div>
            )}
        </div>
    );
}
