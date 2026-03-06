import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, WifiOff, MessageCircle } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { MessageBubble } from '../components/chat/MessageBubble';
import type { Message } from '../types';
import type { PublicProfile } from './hooks/usePublicChat';

interface PublicChatContainerProps {
  profile: PublicProfile;
  messages: Message[];
  isConnected: boolean;
  onSendMessage: (text: string) => void;
}

export function PublicChatContainer({
  profile,
  messages,
  isConnected,
  onSendMessage,
}: PublicChatContainerProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || !isConnected) return;

    setIsSending(true);
    onSendMessage(trimmed);
    setInputValue('');

    // Brief sending state for UX feedback
    setTimeout(() => setIsSending(false), 300);

    // Refocus input
    inputRef.current?.focus();
  }, [inputValue, isConnected, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Avatar
              name={profile.displayName}
              src={profile.avatarUrl || undefined}
              size="2xl"
            />
            <h2 className="text-lg font-semibold text-primary mt-4">
              {profile.displayName}
            </h2>
            <p className="text-sm text-muted mt-1 max-w-xs">
              Envía un mensaje para iniciar la conversación
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} id={`msg-${msg.id}`}>
            <MessageBubble
              message={msg}
              isOwn={msg.type === 'outgoing'}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Connection warning */}
      {!isConnected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-warning/10 border-t border-warning/20">
          <WifiOff size={14} className="text-warning" />
          <span className="text-xs text-warning">Reconectando...</span>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-subtle bg-surface px-4 py-3">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            disabled={!isConnected || isSending}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-subtle bg-base px-4 py-2.5 text-sm
                       text-primary placeholder:text-muted
                       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       max-h-32 overflow-y-auto"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || !isConnected || isSending}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent text-inverse
                       flex items-center justify-center
                       hover:bg-accent/90 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
