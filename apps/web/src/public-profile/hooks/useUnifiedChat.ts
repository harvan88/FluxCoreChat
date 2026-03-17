import { useCallback, useEffect, useState, useRef } from 'react';
import { useChatUnified } from '../../hooks/useChatUnified';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAssetUpload } from '../../hooks/useAssetUpload';
import type { Message } from '../../types';

const SUPPORTED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm',
    'audio/ogg;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
];

interface UseUnifiedChatOptions {
    alias: string;
    conversationId?: string;
    accountId?: string;
}

export function useUnifiedChat({
    alias,
    conversationId: initialConversationId,
    accountId,
}: UseUnifiedChatOptions) {
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const isPublicMode = !accountId;
    const isAuthenticatedMode = !!accountId;

    // 1. Core Chat Logic
    const {
        messages,
        isLoading,
        isSending,
        sendMessage: sendMessageCore,
        addReceivedMessage,
        updateMessage,
        getMessageOwnership,
        conversationId: resolvedConversationId,
        publicSession,
        error: chatError,
    } = useChatUnified({
        conversationId: initialConversationId,
        accountId: accountId || undefined,
        publicAlias: isPublicMode ? alias : undefined,
    });

    // 2. Asset Upload Logic
    const {
        upload: uploadAssetRequest,
        status: assetUploadStatus,
        progress: assetProgress,
        error: uploadError,
        reset: resetUpload,
    } = useAssetUpload({
        accountId,
        allowedMimeTypes: SUPPORTED_MIME_TYPES,
        maxSizeBytes: 50 * 1024 * 1024,
    });

    const isUploading = assetUploadStatus === 'creating_session' || assetUploadStatus === 'uploading' || assetUploadStatus === 'committing';
    const uploadProgress = assetProgress?.percentage ?? 0;
    const onClearUploadError = resetUpload;
    
    // Real-time readiness
    const shouldUseRealtime = isAuthenticatedMode || (isPublicMode && !!publicSession?.publicToken && !!resolvedConversationId);

    // 3. WebSocket Realtime Logic
    const { subscribeConversation, unsubscribeConversation } = useWebSocket({
        autoConnect: shouldUseRealtime,
        includeSelectedAccountId: !isPublicMode,
        accountIdOverride: isAuthenticatedMode ? (accountId || null) : null,
        authTokenOverride: isPublicMode ? (publicSession?.publicToken || null) : null,
        onMessage: (wsMessage: any) => {
            if (wsMessage.type === 'message:new') {
                if (wsMessage.data?.conversationId !== resolvedConversationId) return;
                addReceivedMessage(wsMessage.data as Message);
            }

            if (wsMessage.type === 'message:updated') {
                if (wsMessage.data?.conversationId !== resolvedConversationId) return;
                updateMessage(wsMessage.data.id, {
                    content: wsMessage.data.content,
                    overwrittenAt: wsMessage.data.overwrittenAt,
                    overwrittenBy: wsMessage.data.overwrittenBy,
                });
            }
        },
    });

    useEffect(() => {
        if (!shouldUseRealtime || !resolvedConversationId) return;
        subscribeConversation(resolvedConversationId);
        return () => {
            unsubscribeConversation(resolvedConversationId);
        };
    }, [resolvedConversationId, shouldUseRealtime, subscribeConversation, unsubscribeConversation]);

    // 4. Message Sending wrapper
    const handleSend = useCallback(async (overrideContent?: { text: string; media?: any[] }) => {
        const text = overrideContent?.text || message;
        if (!text.trim() && !overrideContent?.media?.length) return;

        try {
            await sendMessageCore({
                content: {
                    text,
                    media: overrideContent?.media,
                },
                generatedBy: 'human',
            });
            setMessage('');
        } catch (err) {
            console.error('[useUnifiedChat] Send error:', err);
        }
    }, [message, sendMessageCore]);

    // 5. Asset upload for composer
    const uploadAssetForComposer = useCallback(async ({ file }: { file: File }) => {
        const asset = await uploadAssetRequest(file);
        return {
            success: !!asset,
            asset: asset || undefined,
            error: uploadError || undefined,
        };
    }, [uploadAssetRequest, uploadError]);

    // 6. Scroll & Header Progress logic
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const currentScroll = target.scrollTop;
        const threshold = 200;
        const newProgress = Math.min(1, currentScroll / threshold);
        setProgress(newProgress);
    }, []);

    return {
        // State
        message,
        setMessage,
        messages,
        isLoading,
        isSending,
        progress,
        error: chatError || uploadError,
        
        // Refs & Event Handlers
        scrollContainerRef,
        handleScroll,
        handleSend,
        
        // Asset/Upload
        uploadAsset: async ({ file }: { file: File }) => {
            const asset = await uploadAssetRequest(file);
            return {
                success: !!asset,
                asset: asset || undefined,
                error: uploadError || undefined,
            };
        },
        uploadAudio: uploadAssetForComposer,
        isUploading,
        uploadProgress,
        onClearUploadError,
        
        // Utils
        getMessageOwnership,
        isPublicMode,
        resolvedConversationId,
        publicSession,
    };
}
