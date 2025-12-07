/**
 * ChatView - Vista de conversación activa
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type { Message } from '../../types';
import { AISuggestionCard, useAISuggestions, type AISuggestion } from '../extensions';

interface ChatViewProps {
  conversationId: string;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // COR-043/COR-044: AI Suggestions
  const { 
    suggestions, 
    isGenerating, 
    addSuggestion, 
    removeSuggestion 
  } = useAISuggestions(conversationId);

  // Load mock messages
  useEffect(() => {
    const mockMessages: Message[] = [
      {
        id: '1',
        conversationId,
        senderAccountId: 'other',
        content: { text: '¡Hola! ¿Cómo estás?' },
        type: 'incoming',
        generatedBy: 'human',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '2',
        conversationId,
        senderAccountId: 'me',
        content: { text: '¡Hola! Muy bien, gracias. ¿Y tú?' },
        type: 'outgoing',
        generatedBy: 'human',
        createdAt: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        id: '3',
        conversationId,
        senderAccountId: 'other',
        content: { text: 'Todo bien por aquí. ¿Qué tal el proyecto?' },
        type: 'incoming',
        generatedBy: 'human',
        createdAt: new Date(Date.now() - 3400000).toISOString(),
      },
    ];
    setMessages(mockMessages);
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const textToSend = text || message;
    if (!textToSend.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      senderAccountId: 'me',
      content: { text: textToSend },
      type: 'outgoing',
      generatedBy: text ? 'ai' : 'human', // Si viene de sugerencia, es IA
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage('');
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              'flex',
              msg.type === 'outgoing' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={clsx(
                'max-w-[70%] rounded-2xl px-4 py-2',
                msg.type === 'outgoing'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-gray-700 text-white rounded-bl-md'
              )}
            >
              <p className="text-sm">{msg.content.text}</p>
              <div
                className={clsx(
                  'text-xs mt-1',
                  msg.type === 'outgoing' ? 'text-blue-200' : 'text-gray-400'
                )}
              >
                {formatTime(msg.createdAt)}
                {msg.generatedBy === 'ai' && (
                  <span className="ml-2 bg-purple-500/30 px-1.5 py-0.5 rounded text-purple-200">
                    IA
                  </span>
                )}
              </div>
            </div>
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
