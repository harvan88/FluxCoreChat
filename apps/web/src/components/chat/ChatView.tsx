/**
 * ChatView - Vista de conversación activa
 * V2-1: Conectado a API real
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Loader2, X } from 'lucide-react';
import clsx from 'clsx';
import type { Message } from '../../types';
import { AISuggestionCard, useAISuggestions, type AISuggestion } from '../extensions';
import { MessageBubble } from './MessageBubble';
import { AttachmentPanel, type AttachmentAction } from './AttachmentPanel';
import { useConnectionStatus, useOfflineMessages } from '../../hooks/useOfflineFirst';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../db';
import { Avatar } from '../ui/Avatar';

interface ChatViewProps {
  conversationId: string;
  accountId?: string; // Cuenta actual del usuario
  relationshipId?: string;
}

export function ChatView({ conversationId, accountId, relationshipId }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const pendingConversationScrollRef = useRef(false);

  const openCameraRef = useRef<(() => void) | null>(null);
  const openGalleryRef = useRef<(() => void) | null>(null);
  const openDocumentRef = useRef<(() => void) | null>(null);
  const openAudioRef = useRef<(() => void) | null>(null);
  
  // Obtener nombre del contacto desde las conversaciones cargadas
  const conversations = useUIStore((state) => state.conversations);
  const currentConversation = conversations.find(c => c.id === conversationId);
  const contactName = (currentConversation as any)?.contactName || `Chat ${conversationId?.slice(0, 8)}`;
  const contactAvatar = (currentConversation as any)?.contactAvatar;
  
  // V2-1: useOfflineMessages para persistencia local + sync
  const { messages, isLoading, error, sendMessage: sendMsg, refresh } = useOfflineMessages(conversationId);

  // PC-9: uploads (con progress)
  const {
    uploadFile,
    uploadAudio,
    isUploading: isUploadingAttachment,
    progress: uploadProgress,
    error: uploadError,
    clearError: clearUploadError,
  } = useFileUpload();

  // C3: Estado de conexión offline-first (online/offline/syncing)
  const syncConnectionStatus = useConnectionStatus();
  
  // COR-043/COR-044: AI Suggestions
  const { 
    suggestions, 
    isGenerating, 
    addSuggestion, 
    removeSuggestion 
  } = useAISuggestions(conversationId);

  // V2-1.3: WebSocket para tiempo real
  const { status: wsStatus, lastError: wsLastError, reconnectAttempts: wsReconnectAttempts, connect: connectWS, subscribe, unsubscribe } = useWebSocket({
    onMessage: (msg) => {
      if (msg.type === 'message:new' && msg.data?.conversationId === conversationId) {
        // Solo refresh si el mensaje NO es nuestro (evitar duplicados)
        const incomingAccountId = msg.data?.senderAccountId;
        if (incomingAccountId !== accountId) {
          refresh();
        }
      }
    },
    onSuggestion: (suggestion) => {
      if (suggestion.conversationId === conversationId) {
        addSuggestion(suggestion);
      }
    },
  });

  // Suscribirse a cambios en la relación
  useEffect(() => {
    const activeRelationshipId = (currentConversation as any)?.relationshipId || relationshipId;
    if (activeRelationshipId) {
      subscribe(activeRelationshipId);
      return () => {
        unsubscribe(activeRelationshipId);
      };
    }
  }, [conversationId, relationshipId, currentConversation, subscribe, unsubscribe]);

  useEffect(() => {
    pendingConversationScrollRef.current = true;
    isAtBottomRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    let raf: number | null = null;

    const scrollToBottom = (behavior: ScrollBehavior) => {
      const el = messagesContainerRef.current;
      if (!el) return;
      raf = requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior });
      });
    };

    if (pendingConversationScrollRef.current) {
      if (messages.length > 0 && messages[0]?.conversationId !== conversationId) {
        return;
      }
      pendingConversationScrollRef.current = false;
      scrollToBottom('auto');
    } else if (isAtBottomRef.current) {
      scrollToBottom('auto');
    }

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [messages, conversationId]);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 80;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom <= threshold;
  };

  const handleSend = async (overrideContent?: { text: string; media?: any[] }) => {
    const content = overrideContent ?? { text: message };
    const hasText = typeof content.text === 'string' && content.text.trim().length > 0;
    const hasMedia = Array.isArray(content.media) && content.media.length > 0;
    if (!hasText && !hasMedia) return;

    if (isSending) return;
    
    if (!accountId) {
      console.error('[ChatView] Cannot send: no accountId');
      return;
    }

    try {
      setIsSending(true);
      setSendError(null);
      await sendMsg(accountId, {
        text: content.text || '',
        ...(hasMedia ? { media: content.media } : {}),
      } as any);
      setMessage('');
      setReplyingTo(null);
    } catch (err) {
      console.error('[ChatView] Send error:', err);
      setSendError(err instanceof Error ? err.message : 'Error al enviar mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const getConnectionLabel = () => {
    if (syncConnectionStatus === 'offline') return 'Sin conexión';
    if (wsStatus === 'error') return 'Sin conexión';
    if (wsStatus === 'connecting' || wsStatus === 'disconnected') return 'Conectando...';
    if (syncConnectionStatus === 'syncing') return 'Sincronizando...';
    return 'En línea';
  };

  const getConnectionDotClass = () => {
    if (syncConnectionStatus === 'offline') return 'bg-error';
    if (wsStatus === 'error') return 'bg-error';
    if (wsStatus === 'connecting' || wsStatus === 'disconnected') return 'bg-warning';
    if (syncConnectionStatus === 'syncing') return 'bg-warning';
    return 'bg-success';
  };

  // COR-044: Handlers para sugerencias de IA
  const handleApproveSuggestion = (suggestionId: string, text: string) => {
    handleSend({ text });
    removeSuggestion(suggestionId);
  };

  const handleDiscardSuggestion = (suggestionId: string) => {
    removeSuggestion(suggestionId);
  };

  // NOTA: Simulación de IA removida - conectar a API real

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectAttachment = (action: AttachmentAction) => {
    setIsAttachmentOpen(false);
    clearUploadError();

    switch (action) {
      case 'camera':
        openCameraRef.current?.();
        break;
      case 'gallery':
      case 'receipt':
        openGalleryRef.current?.();
        break;
      case 'document':
        openDocumentRef.current?.();
        break;
      case 'audio':
        openAudioRef.current?.();
        break;
      default:
        break;
    }
  };

  const handleUploadedMediaSend = async (mediaItem: any) => {
    const caption = message;
    await handleSend({ text: caption || '', media: [mediaItem] });
  };

  // Scroll a mensaje específico
  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Delete message
  const handleDelete = async (messageId: string) => {
    try {
      await db.messages.delete(messageId);
      refresh();
    } catch (err) {
      console.error('[ChatView] Delete error:', err);
    }
  };

  return (
    <div className="h-full bg-base flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-surface border-b border-subtle px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar 
            src={contactAvatar} 
            name={contactName} 
            size="md"
            status="online"
          />
          <div>
            <div className="text-primary font-medium">
              {contactName}
            </div>
            <div className="text-xs text-muted flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5">
                <span className={clsx('w-2 h-2 rounded-full', getConnectionDotClass())} />
                <span>{getConnectionLabel()}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors">
            <Phone size={20} />
          </button>
          <button className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors">
            <Video size={20} />
          </button>
          <button className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 flex-shrink-0">
          <Loader2 className="animate-spin text-muted" size={32} />
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mx-4 mt-3 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm flex items-start justify-between gap-3">
          <div className="min-w-0">{uploadError}</div>
          <button
            onClick={() => clearUploadError()}
            className="p-1 text-error hover:text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* WebSocket status banner (errores visibles + reintentar) */}
      {(wsStatus === 'error' || wsStatus === 'disconnected' || wsStatus === 'connecting' || syncConnectionStatus === 'offline') && (
        <div className="mx-4 mt-3 p-3 bg-elevated border border-subtle rounded-lg flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-primary font-medium">{getConnectionLabel()}</div>
            <div className="text-xs text-muted break-words">
              {syncConnectionStatus === 'offline'
                ? 'Tu dispositivo está offline. Los mensajes quedarán en cola hasta que vuelva la conexión.'
                : wsLastError || 'Conexión inestable. Intentando reconectar...'}
              {wsReconnectAttempts > 0 ? ` (reintento ${wsReconnectAttempts}/5)` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => connectWS()}
              className="px-3 py-1.5 text-xs rounded-md bg-hover text-primary hover:bg-active transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* Send error (feedback visual mínimo) */}
      {sendError && (
        <div className="mx-4 mt-3 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm flex items-start justify-between gap-3">
          <div className="min-w-0">{sendError}</div>
          <button
            onClick={() => setSendError(null)}
            className="p-1 text-error hover:text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      {/* No account warning */}
      {!accountId && !isLoading && (
        <div className="mx-4 mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm">
          ⚠️ No se ha seleccionado una cuenta. Por favor recarga la página o inicia sesión de nuevo.
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 min-h-0 overflow-y-auto p-4"
      >
        {!isLoading && messages.length === 0 && !isGenerating && suggestions.length === 0 ? (
          <div className="min-h-full flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium text-primary mb-2">No hay mensajes aún</h3>
            <p className="text-sm text-secondary">Envía el primer mensaje para iniciar la conversación</p>
          </div>
        ) : (
          <div className="min-h-full flex flex-col justify-end space-y-3">
            {messages.map((msg) => {
              // Convert LocalMessage to Message for MessageBubble
              const messageForBubble: Message = {
                id: msg.id,
                conversationId: msg.conversationId,
                senderAccountId: msg.senderAccountId,
                content: msg.content,
                type: msg.type,
                generatedBy: msg.generatedBy || 'human',
                status: msg.syncState === 'synced' ? 'synced' : 'pending_backend',
                createdAt: msg.localCreatedAt.toISOString(),
              };
              
              return (
                <div key={msg.id} id={`msg-${msg.id}`}>
                  <MessageBubble
                    message={messageForBubble}
                    isOwn={msg.senderAccountId === accountId}
                    onReply={() => setReplyingTo(messageForBubble)}
                    onEdit={msg.senderAccountId === accountId ? () => {
                      setMessage(msg.content.text || '');
                    } : undefined}
                    onDelete={msg.senderAccountId === accountId ? () => handleDelete(msg.id) : undefined}
                    onScrollToMessage={scrollToMessage}
                  />
                </div>
              );
            })}

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
                // onRegenerate removed - will connect to real AI API
              />
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-surface border-t border-subtle flex items-center gap-2 flex-shrink-0">
          <div className="flex-1 text-sm">
            <span className="text-muted">Respondiendo a: </span>
            <span className="text-primary truncate">{replyingTo.content.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-muted hover:text-primary transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-surface border-t border-subtle flex-shrink-0 relative">
        <AttachmentPanel
          open={isAttachmentOpen}
          onClose={() => setIsAttachmentOpen(false)}
          onSelect={handleSelectAttachment}
        />

        {/* Hidden file inputs */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={(el) => {
            openCameraRef.current = () => el?.click();
          }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = '';
            const res = await uploadFile({ file, type: 'image' });
            if (res.success && res.data?.attachment) {
              await handleUploadedMediaSend({
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
          accept="image/*"
          className="hidden"
          ref={(el) => {
            openGalleryRef.current = () => el?.click();
          }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = '';
            const res = await uploadFile({ file, type: 'image' });
            if (res.success && res.data?.attachment) {
              await handleUploadedMediaSend({
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
            const res = await uploadFile({ file, type: 'document' });
            if (res.success && res.data?.attachment) {
              await handleUploadedMediaSend({
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
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          ref={(el) => {
            openAudioRef.current = () => el?.click();
          }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = '';
            const res = await uploadAudio({ file });
            if (res.success && res.data?.attachment) {
              await handleUploadedMediaSend({
                type: 'audio',
                url: res.data.attachment.url,
                attachmentId: res.data.attachment.id,
                filename: res.data.attachment.filename,
                mimeType: res.data.attachment.mimeType,
                size: res.data.attachment.sizeBytes,
                waveformData: res.data.waveformData,
              });
            }
          }}
        />

        {isUploadingAttachment && (
          <div className="mb-2">
            <div className="h-1 w-full bg-elevated rounded-full overflow-hidden border border-subtle">
              <div
                className="h-full bg-accent"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-muted">Subiendo... {uploadProgress}%</div>
          </div>
        )}

        <div className="flex items-end gap-3">
          <button
            onClick={() => {
              if (isUploadingAttachment) return;
              setIsAttachmentOpen((v) => !v);
            }}
            className={clsx(
              'p-2 transition-colors',
              isUploadingAttachment
                ? 'text-muted cursor-not-allowed opacity-60'
                : 'text-muted hover:text-primary'
            )}
            title="Adjuntar"
            disabled={isUploadingAttachment}
          >
            <Paperclip size={20} />
          </button>
          <div className="flex-1 bg-elevated rounded-xl px-4 py-2.5 border border-subtle focus-within:border-accent transition-colors">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              disabled={isSending || !accountId}
              className="w-full bg-transparent text-primary placeholder:text-muted resize-none focus:outline-none text-sm max-h-32"
              rows={1}
            />
          </div>
          <button className="p-2 text-muted hover:text-primary transition-colors">
            <Smile size={20} />
          </button>
          <button
            onClick={() => handleSend()}
            disabled={!accountId || isSending || !message.trim()}
            className={clsx(
              'p-3 rounded-full transition-colors',
              accountId && message.trim() && !isSending
                ? 'bg-accent text-inverse hover:bg-accent-hover'
                : 'bg-elevated text-muted cursor-not-allowed'
            )}
          >
            {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
