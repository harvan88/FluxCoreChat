import { useRef, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { MessageBubble } from '../../../components/chat/MessageBubble';
import { ChatComposer } from '../../../components/chat/ChatComposer';
import { PublicProfileComposer } from './PublicProfileComposer';
import { ChatHeroHeader } from '../identity/ChatHeroHeader';
import { useUnifiedChat } from '../../hooks/useUnifiedChat';
import type { Message } from '../../../types';

interface ProfileChatBlockMobileProps {
    targetAlias: string;
    conversationId?: string;
    accountId?: string;
    profile: {
        id: string;
        displayName: string;
        alias: string;
        avatarUrl: string | null;
        bio?: string | null;
    };
    initialText?: string;
}

export function ProfileChatBlockMobile({
    targetAlias,
    conversationId,
    accountId,
    profile,
    initialText,
}: ProfileChatBlockMobileProps) {
    const {
        message,
        setMessage,
        messages,
        isLoading,
        isSending,
        progress,
        scrollContainerRef,
        handleScroll,
        handleSend,
        uploadAsset,
        uploadAudio,
        isUploading,
        uploadProgress,
        onClearUploadError,
        getMessageOwnership,
        isPublicMode,
        publicSession,
        error,
    } = useUnifiedChat({ alias: targetAlias, conversationId, accountId, initialText });

    const lastMessageRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]);

    return (
        <div className="flex flex-col h-full w-full bg-base overflow-hidden overscroll-none">
            
            {/* 1. Dynamic Header */}
            <header className="flex-shrink-0 z-40 bg-base">
                <ChatHeroHeader profile={profile} progress={progress} />
            </header>

            {/* 2. Chat Area - Natural Scroll */}
            <main 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-grow overflow-y-auto px-4 py-6 space-y-4 scroll-smooth scrollbar-hide overscroll-contain"
            >
                {/* ... (el resto del contenido se mantiene igual) ... */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                            <p className="text-xs font-bold text-muted uppercase tracking-widest">Sincronizando...</p>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 mb-6 bg-accent/5 rounded-[2rem] flex items-center justify-center border border-accent/10 sm:shadow-lg">
                            <MessageCircle className="text-accent" size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-primary mb-2 tracking-tight">Inicia la charla</h3>
                        <p className="text-sm text-secondary/60 max-w-[260px] font-medium">
                            {profile.displayName} está disponible. Rompe el hielo enviando el primer mensaje.
                        </p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg: Message, idx: number) => (
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
                        {/* Keyboard spacer */}
                        <div className="h-4" />
                    </>
                )}
                {error && (
                    <div className="mx-4 mb-4 p-3 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="mt-0.5 text-error">⚠️</div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-error uppercase tracking-widest mb-0.5">Error de conexión</p>
                            <p className="text-xs text-error/80 font-medium leading-tight">{error}</p>
                        </div>
                    </div>
                )}
            </main>

            {/* 3. Input Area */}
            <footer className="flex-shrink-0 z-50 bg-base border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
                {isPublicMode ? (
                    <PublicProfileComposer
                        value={message}
                        onChange={setMessage}
                        onSend={handleSend}
                        disabled={isLoading}
                        isSending={isSending}
                        placeholder={`Mensaje para ${profile.displayName.split(' ')[0]}...`}
                    />
                ) : (
                    <div className="bg-surface/20 backdrop-blur-xl">
                        <ChatComposer
                            value={message}
                            onChange={setMessage}
                            disabled={isLoading}
                            isSending={isSending}
                            onSend={handleSend}
                            accountId={accountId}
                            uploadAsset={async (args) => uploadAsset(args)}
                            uploadAudio={async (args) => uploadAudio(args)}
                            isUploading={isUploading}
                            uploadProgress={uploadProgress}
                            onClearUploadError={onClearUploadError}
                            onUserActivity={() => {}}
                        />
                    </div>
                )}
            </footer>
        </div>
    );
}
