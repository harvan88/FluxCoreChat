import { useCallback, useEffect, useState, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatUnified } from '../../../hooks/useChatUnified';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useAssetUpload } from '../../../hooks/useAssetUpload';
import { MessageBubble } from '../../../components/chat/MessageBubble';
import { ChatComposer } from '../../../components/chat/ChatComposer';
import { PublicProfileComposer } from './PublicProfileComposer';
import { ChatHeroHeader } from '../identity/ChatHeroHeader';
import type { Message } from '../../../types';

interface ProfileChatBlockProps {
    alias: string;
    conversationId?: string;
    accountId?: string;
    profile: {
        id: string;
        displayName: string;
        alias: string;
        avatarUrl: string | null;
        bio?: string | null;
    };
}

const SUPPORTED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm',
    'audio/ogg;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
];

export function ProfileChatBlock({
    alias,
    conversationId,
    accountId,
    profile,
}: ProfileChatBlockProps) {
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastMessageRef = useRef<HTMLDivElement>(null);

    const isPublicMode = !accountId;
    const isAuthenticatedMode = !!accountId;

    const {
        messages,
        isLoading,
        isSending,
        sendMessage,
        addReceivedMessage,
        updateMessage,
        getMessageOwnership,
        conversationId: resolvedConversationId,
        publicSession,
    } = useChatUnified({
        conversationId,
        accountId: accountId || undefined,
        publicAlias: isPublicMode ? alias : undefined,
    });

    const {
        upload: uploadAssetRequest,
        error: uploadError,
    } = useAssetUpload({
        accountId,
        allowedMimeTypes: SUPPORTED_MIME_TYPES,
        maxSizeBytes: 50 * 1024 * 1024,
    });

    const shouldUseRealtime = isAuthenticatedMode || (isPublicMode && !!publicSession?.publicToken && !!resolvedConversationId);

    const { subscribeConversation, unsubscribeConversation } = useWebSocket({
        autoConnect: shouldUseRealtime,
        includeSelectedAccountId: !isPublicMode,
        accountIdOverride: isAuthenticatedMode ? (accountId || null) : null,
        authTokenOverride: isPublicMode ? (publicSession?.publicToken || null) : null,
        onMessage: (wsMessage) => {
            console.log('[ProfileChatBlock] WebSocket message recibido:', wsMessage);
            if (wsMessage.type === 'message:new') {
                console.log('[ProfileChatBlock] message:new - conversationId:', wsMessage.data?.conversationId, 'expected:', resolvedConversationId);
                if (wsMessage.data?.conversationId !== resolvedConversationId) {
                    console.log('[ProfileChatBlock] Ignorando mensaje - conversationId mismatch');
                    return;
                }
                console.log('[ProfileChatBlock] Añadiendo mensaje recibido:', wsMessage.data);
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

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const currentScroll = target.scrollTop;
        const threshold = 200; // Un poco más de margen para la transición
        const newProgress = Math.min(1, currentScroll / threshold);
        setProgress(newProgress);
    };

    useEffect(() => {
        console.log('[ProfileChatBlock] Mensajes actualizados:', { 
            cantidad: messages.length, 
            isLoading, 
            messages: messages.map(m => ({ id: m.id, content: m.content, type: m.type }))
        });
    }, [messages, isLoading]);

    const handleSend = useCallback(async (overrideContent?: { text: string; media?: any[] }) => {
        const text = overrideContent?.text || message;
        if (!text.trim() && !overrideContent?.media?.length) {
            console.log('[ProfileChatBlock] handleSend: No hay texto ni media');
            return;
        }

        console.log('[ProfileChatBlock] Enviando mensaje:', { text, overrideContent });
        console.log('[ProfileChatBlock] Estado completo:', { 
            isLoading, 
            resolvedConversationId, 
            shouldUseRealtime,
            isPublicMode,
            accountId,
            publicSession: publicSession ? 'exists' : 'null'
        });

        try {
            console.log('[ProfileChatBlock] Llamando a sendMessage...');
            await sendMessage({
                content: {
                    text,
                    media: overrideContent?.media,
                },
                generatedBy: 'human',
            });
            console.log('[ProfileChatBlock] Mensaje enviado exitosamente');
            setMessage('');
            console.log('[ProfileChatBlock] Input limpiado');
        } catch (err) {
            console.error('[ProfileChatBlock] Send error:', err);
            console.error('[ProfileChatBlock] Error completo:', err instanceof Error ? err.stack : err);
        }
    }, [message, sendMessage, isLoading, resolvedConversationId, shouldUseRealtime, isPublicMode, accountId, publicSession]);

    const uploadAssetForComposer = useCallback(async ({ file }: { file: File; type: 'image' | 'document' | 'video' }) => {
        const asset = await uploadAssetRequest(file);
        return {
            success: !!asset,
            asset: asset || undefined,
            error: uploadError || undefined,
        };
    }, [uploadAssetRequest, uploadError]);

    // Hook para obtener dimensiones reales del viewport y altura del input
    const [viewportDimensions] = useState({
        height: window.innerHeight,
        width: window.innerWidth
    });
    const [inputHeight, setInputHeight] = useState(60);

    // Actualizar altura del input cuando cambia el viewport
    useEffect(() => {
        const updateInputHeight = () => {
            // El input tiene una altura base, pero puede ajustarse según el viewport
            const baseHeight = 60;
            const maxHeight = Math.min(80, viewportDimensions.height * 0.1); // Máximo 10% del viewport
            setInputHeight(Math.max(baseHeight, maxHeight));
        };

        updateInputHeight();
        window.addEventListener('resize', updateInputHeight);
        return () => window.removeEventListener('resize', updateInputHeight);
    }, [viewportDimensions.height]);

    return (
        <div className="relative w-full h-[100dvh] overflow-hidden shadow-[0_32px_120px_rgba(0,0,0,0.8)]">
            
            {/* 1. Header Absoluto - Parte Superior */}
            <div className="absolute top-0 left-0 right-0 z-40 bg-base">
                <ChatHeroHeader profile={profile} progress={progress} />
            </div>

            {/* 2. Input Absoluto - Parte Inferior (Límite) */}
            <div className="absolute bottom-0 left-0 right-0 z-50 bg-base border-t border-white/10">
                {isPublicMode ? (
                    <PublicProfileComposer
                        value={message}
                        onChange={setMessage}
                        onSend={handleSend}
                        disabled={isLoading}
                        isSending={isSending}
                        placeholder={`Mensaje privado para ${profile.displayName.split(' ')[0]}...`}
                    />
                ) : (
                    <div className="bg-surface/20 backdrop-blur-xl">
                        <div className="bg-surface/40 border-t border-white/10 shadow-lg">
                            <ChatComposer
                                value={message}
                                onChange={setMessage}
                                disabled={isLoading}
                                isSending={isSending}
                                onSend={handleSend}
                                accountId={accountId}
                                uploadAsset={uploadAssetForComposer}
                                uploadAudio={uploadAssetForComposer}
                                onUserActivity={() => {}}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Espacio Variable entre Header e Input - Usa viewport dinámico real */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="absolute top-0 left-0 right-0 overflow-y-auto scroll-smooth px-4 md:px-8 space-y-4 md:space-y-8 scrollbar-hide bg-base"
                style={{
                    top: `${progress ? 120 : 400}px`, // Altura dinámica del header
                    bottom: `${inputHeight}px`, // Altura real del input
                    height: `calc(100dvh - ${progress ? 120 : 400}px - ${inputHeight}px)` // Viewport dinámico real
                }}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-accent/20 rounded-full" />
                                <div className="absolute inset-0 border-4 border-t-accent rounded-full animate-spin" />
                            </div>
                            <p className="text-sm font-bold text-muted uppercase tracking-widest animate-pulse">Sincronizando...</p>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-24 h-24 mb-8 bg-accent/5 rounded-[2.5rem] flex items-center justify-center border border-accent/10 shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
                            <MessageCircle className="text-accent" size={42} />
                        </div>
                        <h3 className="text-3xl font-black text-primary mb-3 tracking-tighter">Inicia la charla</h3>
                        <p className="text-base text-secondary/60 max-w-[320px] font-medium leading-relaxed">
                            {profile.displayName} está disponible. Rompe el hielo enviando el primer mensaje.
                        </p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, idx) => (
                            <div key={msg.id} ref={idx === messages.length - 1 ? lastMessageRef : null}>
                                <MessageBubble
                                    message={msg}
                                    isOwn={getMessageOwnership(msg)}
                                    isAI={msg.generatedBy === 'ai'}
                                    viewerAccountId={accountId || publicSession?.ownerAccountId || profile.id}
                                    viewerActorId={isPublicMode ? publicSession?.visitorActorId : undefined}
                                    viewerActorType={isPublicMode ? 'visitor' : 'user'}
                                />
                            </div>
                        ))}
                        <div className="h-4" />
                    </>
                )}
            </div>
        </div>
    );
}
