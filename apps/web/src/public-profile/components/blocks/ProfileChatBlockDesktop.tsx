import { useRef, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { MessageBubble } from '../../../components/chat/MessageBubble';
import { ChatComposer } from '../../../components/chat/ChatComposer';
import { PublicProfileComposer } from './PublicProfileComposer';
import { ChatHeroHeader } from '../identity/ChatHeroHeader';
import { useUnifiedChat } from '../../hooks/useUnifiedChat';
import type { Message } from '../../../types';

interface ProfileChatBlockDesktopProps {
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

export function ProfileChatBlockDesktop({
    alias,
    conversationId,
    accountId,
    profile,
}: ProfileChatBlockDesktopProps) {
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
        error,
    } = useUnifiedChat({ alias, conversationId, accountId });

    const lastMessageRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic for desktop
    useEffect(() => {
        if (messages.length > 0) {
            lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]);

    return (
        <div className="flex flex-col h-full w-full bg-base overflow-hidden border-x border-white/5 shadow-2xl">
            
            {/* 1. Header Area with dynamic progress */}
            <header className="flex-shrink-0 z-40 bg-base/80 backdrop-blur-md sticky top-0">
                <ChatHeroHeader profile={profile} progress={progress} />
            </header>

            {/* 2. Chat Messages Area */}
            <main 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-grow overflow-y-auto px-8 py-10 space-y-8 scroll-smooth scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 transition-all"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-16 h-16 border-4 border-accent/10 border-t-accent rounded-full animate-spin" />
                            <p className="text-sm font-bold text-muted uppercase tracking-widest animate-pulse">Sincronizando identidad...</p>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center opacity-80 hover:opacity-100 transition-opacity">
                        <div className="w-24 h-24 mb-10 bg-accent/5 rounded-[3rem] flex items-center justify-center border border-accent/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                            <MessageCircle className="text-accent" size={48} />
                        </div>
                        <h3 className="text-4xl font-black text-primary mb-4 tracking-tighter">Inicia la charla</h3>
                        <p className="text-lg text-secondary/60 max-w-sm font-medium leading-relaxed">
                            {profile.displayName} está disponible. Rompe el hielo enviando el primer mensaje privado.
                        </p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg: Message, idx: number) => (
                            <div 
                                key={msg.id} 
                                ref={idx === messages.length - 1 ? lastMessageRef : null}
                                className="group/msg"
                            >
                                <MessageBubble
                                    message={msg}
                                    isOwn={getMessageOwnership(msg)}
                                    isAI={msg.generatedBy === 'ai'}
                                    viewerAccountId={accountId}
                                />
                            </div>
                        ))}
                        <div className="h-8" />
                    </>
                )}
                {error && (
                    <div className="mx-8 mb-8 p-4 bg-error/10 border border-error/20 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4 max-w-2xl mx-auto">
                        <div className="mt-1 text-xl">⚠️</div>
                        <div className="flex-1">
                            <h4 className="text-sm font-black text-error uppercase tracking-widest mb-1">Error de conexión</h4>
                            <p className="text-sm text-error/80 font-medium leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}
            </main>

            {/* 3. Composer Section */}
            <footer className="flex-shrink-0 z-50 bg-base border-t border-white/10 p-4">
                <div className="max-w-4xl mx-auto">
                    {isPublicMode ? (
                        <PublicProfileComposer
                            value={message}
                            onChange={setMessage}
                            onSend={handleSend}
                            disabled={isLoading}
                            isSending={isSending}
                            placeholder={`Inicia una conversación privada con ${profile.displayName}...`}
                        />
                    ) : (
                        <div className="bg-surface/30 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/5 shadow-xl">
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
                </div>
            </footer>
        </div>
    );
}
