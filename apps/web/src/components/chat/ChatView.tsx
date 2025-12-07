/**
 * ChatView - Vista de conversación activa
 * V2-1: Conectado a API real
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Sparkles, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { Message } from '../../types';
import { AISuggestionCard, useAISuggestions, type AISuggestion } from '../extensions';
import { MessageBubble } from './MessageBubble';
import { useChat } from '../../hooks/useChat';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ChatViewProps {
  conversationId: string;
  accountId?: string; // Cuenta actual del usuario
  relationshipId?: string;
}

export function ChatView({ conversationId, accountId = 'me' }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // V2-1: useChat para cargar/enviar mensajes
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    addReceivedMessage,
    updateMessageStatus,
    deleteMessage,
    retryMessage,
  } = useChat({ conversationId, accountId });
  
  // COR-043/COR-044: AI Suggestions
  const { 
    suggestions, 
    isGenerating, 
    addSuggestion, 
    removeSuggestion 
  } = useAISuggestions(conversationId);

  // V2-1.3: WebSocket para tiempo real
  useWebSocket({
    onMessage: (msg) => {
      if (msg.type === 'message:new' && msg.data?.conversationId === conversationId) {
        addReceivedMessage(msg.data as Message);
      }
      if (msg.type === 'message:status') {
        updateMessageStatus(msg.messageId, msg.status);
      }
    },
    onSuggestion: (suggestion) => {
      if (suggestion.conversationId === conversationId) {
        addSuggestion(suggestion);
      }
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string, isAI = false) => {
    const textToSend = text || message;
    if (!textToSend.trim()) return;

    await sendMessage({
      content: { text: textToSend },
      generatedBy: isAI ? 'ai' : 'human',
      replyToId: replyingTo?.id,
    });

    setMessage('');
    setReplyingTo(null);
  };

  // COR-044: Handlers para sugerencias de IA
  const handleApproveSuggestion = (suggestionId: string, text: string) => {
    handleSend(text);
    removeSuggestion(suggestionId);
  };

  const handleDiscardSuggestion = (suggestionId: string) => {
    removeSuggestion(suggestionId);
  };

  // Simular sugerencia de IA para demo
  const simulateAISuggestion = () => {
    const mockSuggestion: AISuggestion = {
      id: `sug-${Date.now()}`,
      conversationId,
      extensionId: 'core-ai',
      originalMessageId: messages[messages.length - 1]?.id || '',
      suggestedText: '¡El proyecto va muy bien! Estamos avanzando según lo planificado. ¿Te gustaría que te cuente los detalles?',
      confidence: 0.92,
      reasoning: 'Basado en el contexto de la conversación sobre el proyecto, sugiero una respuesta positiva con oferta de más información.',
      alternatives: [
        'Todo marcha según lo previsto con el proyecto.',
        'El proyecto avanza perfectamente. ¿Quieres saber más?',
      ],
      createdAt: new Date().toISOString(),
    };
    addSuggestion(mockSuggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Scroll a mensaje específico
  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Obtener mensaje de reply
  const getReplyMessage = (replyToId?: string) => {
    if (!replyToId) return undefined;
    return messages.find(m => m.id === replyToId);
  };

  return (
    <div className="flex-1 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">JP</span>
          </div>
          <div>
            <div className="text-white font-medium">Juan Pérez</div>
            <div className="text-xs text-gray-400">En línea</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Demo: Simular sugerencia de IA */}
          <button 
            onClick={simulateAISuggestion}
            className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition-colors"
            title="Simular sugerencia de IA (Demo)"
          >
            <Sparkles size={20} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <Phone size={20} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <Video size={20} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} id={`msg-${msg.id}`}>
            <MessageBubble
              message={msg}
              isOwn={msg.senderAccountId === accountId || msg.type === 'outgoing'}
              replyToMessage={getReplyMessage(msg.replyToId)}
              onReply={() => setReplyingTo(msg)}
              onEdit={msg.senderAccountId === accountId ? () => {
                setMessage(msg.content.text || '');
              } : undefined}
              onDelete={msg.senderAccountId === accountId ? () => deleteMessage(msg.id) : undefined}
              onRetry={msg.status === 'failed' ? () => retryMessage(msg.id) : undefined}
              onScrollToMessage={scrollToMessage}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* COR-043/COR-044: AI Suggestions */}
      {isGenerating && (
        <AISuggestionCard
          suggestion={{} as AISuggestion}
          onApprove={() => {}}
          onDiscard={() => {}}
          isLoading={true}
        />
      )}
      {suggestions.map((suggestion) => (
        <AISuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onApprove={(text) => handleApproveSuggestion(suggestion.id, text)}
          onDiscard={() => handleDiscardSuggestion(suggestion.id)}
          onRegenerate={simulateAISuggestion}
        />
      ))}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center gap-2">
          <div className="flex-1 text-sm">
            <span className="text-gray-400">Respondiendo a: </span>
            <span className="text-white truncate">{replyingTo.content.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-end gap-3">
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Paperclip size={20} />
          </button>
          <div className="flex-1 bg-gray-700 rounded-2xl px-4 py-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              className="w-full bg-transparent text-white resize-none focus:outline-none text-sm max-h-32"
              rows={1}
            />
          </div>
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Smile size={20} />
          </button>
          <button
            onClick={() => handleSend()}
            disabled={!message.trim()}
            className={clsx(
              'p-3 rounded-full transition-colors',
              message.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            )}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
