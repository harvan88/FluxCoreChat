/**
 * UnifiedChatView - Vista unificada para chat (autenticado y público)
 * Usa autenticación pública por actor para unificar ambos modos
 */

import { AlertTriangle, Building2, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useAssetUpload } from '../../hooks/useAssetUpload';
import { useChatUnified } from '../../hooks/useChatUnified';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/authStore';
import type { Message } from '../../types';
import { Avatar } from '../ui/Avatar';
import { ChatComposer } from './ChatComposer';
import { MessageBubble } from './MessageBubble';
import { ParticipantsActivityBar } from './ParticipantsActivityBar';

const CHAT_SUPPORTED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'audio/ogg;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3',
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const CHAT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

interface UnifiedChatViewProps {
  conversationId: string;
  accountId?: string;
  relationshipId?: string;
  publicAlias?: string;
  profile?: {
    id: string;
    displayName: string;
    alias: string;
    avatarUrl: string | null;
  };
}

export function UnifiedChatView({
  conversationId,
  accountId,
  relationshipId,
  publicAlias,
  profile,
}: UnifiedChatViewProps) {
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const currentUserId = useAuthStore((state) => state.user?.id ?? null);

  const isPublicMode = !accountId && !!publicAlias;
  const isAuthenticatedMode = !!accountId && !publicAlias;

  const {
    messages,
    isLoading,
    isSending: chatIsSending,
    error,
    sendMessage,
    addReceivedMessage,
    updateMessage,
    getMessageOwnership,
    conversationId: resolvedConversationId,
    publicSession,
  } = useChatUnified({
    conversationId,
    accountId: accountId || undefined,
    publicAlias: publicAlias || undefined,
  });

  const {
    upload: uploadAssetRequest,
    status: assetUploadStatus,
    progress: assetProgress,
    error: uploadError,
    reset: resetUpload,
  } = useAssetUpload({
    accountId,
    allowedMimeTypes: CHAT_SUPPORTED_MIME_TYPES,
    maxSizeBytes: CHAT_MAX_UPLOAD_BYTES,
  });

  const isUploadingAttachment = assetUploadStatus === 'creating_session' || assetUploadStatus === 'uploading' || assetUploadStatus === 'committing';
  const uploadProgress = assetProgress?.percentage ?? 0;
  const shouldUseRealtime = isAuthenticatedMode || (isPublicMode && !!publicSession?.publicToken && !!resolvedConversationId);

  const { reportActivity, subscribeConversation, unsubscribeConversation } = useWebSocket({
    autoConnect: shouldUseRealtime,
    includeSelectedAccountId: !isPublicMode,
    accountIdOverride: isAuthenticatedMode ? (accountId || null) : null,
    authTokenOverride: isPublicMode ? (publicSession?.publicToken || null) : null,
    onMessage: (wsMessage) => {
      if (wsMessage.type === 'message:new') {
        if (wsMessage.data?.conversationId !== resolvedConversationId) return;
        addReceivedMessage(wsMessage.data as Message);
      }
      
      // 🔄 Manejar mensajes actualizados (sobrescritos/eliminados para todos)
      if (wsMessage.type === 'message:updated') {
        if (wsMessage.data?.conversationId !== resolvedConversationId) return;
        const wsData = wsMessage.data;
        console.log('[UnifiedChatView] Message updated (overwritten):', wsData);
        
        // Merge parcial: solo actualizar contenido sobrescrito, preservar estructura original
        updateMessage(wsData.id, {
          content: wsData.content,
          overwrittenAt: wsData.overwrittenAt,
          overwrittenBy: wsData.overwrittenBy,
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

  const handleSend = useCallback(async (overrideContent?: { text: string; media?: any[] }) => {
    const messageText = overrideContent?.text || message;
    if (!messageText.trim() && !overrideContent?.media?.length) {
      return;
    }

    try {
      setSendError(null);
      
      await sendMessage({
        content: {
          text: messageText,
          media: overrideContent?.media,
        },
        generatedBy: 'human',
        replyToId: replyingTo?.id,
      });
      
      setMessage('');
      setReplyingTo(null);
    } catch (err) {
      console.error('[UnifiedChatView] Send error:', err);
      setSendError(err instanceof Error ? err.message : 'Error al enviar mensaje');
    }
  }, [message, sendMessage, replyingTo]);

  const performAssetUpload = useCallback(async ({ file }: { file: File }) => {
    return await uploadAssetRequest(file);
  }, [uploadAssetRequest]);

  const uploadAssetForComposer = useCallback(async ({ file }: { file: File; type: 'image' | 'document' | 'video' }) => {
    if (!currentUserId || !accountId) {
      return { success: false, error: 'No hay sesión activa para subir archivos' };
    }

    const previewUrl = file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : undefined;
    const asset = await performAssetUpload({ file });

    if (!asset) {
      return {
        success: false,
        error: uploadError || 'No se pudo subir el archivo',
      };
    }

    return {
      success: true,
      asset,
      previewUrl,
    };
  }, [accountId, currentUserId, performAssetUpload, uploadError]);

  const uploadAudioForComposer = useCallback(async ({ file }: { file: File }) => {
    if (!currentUserId || !accountId) {
      return { success: false, error: 'No hay sesión activa para grabar audio' };
    }

    const asset = await performAssetUpload({ file });
    return {
      success: !!asset,
      asset: asset ?? undefined,
    };
  }, [accountId, currentUserId, performAssetUpload]);

  const handleUserActivity = useCallback((activity: 'typing' | 'recording' | 'idle' | 'cancel') => {
    if (!accountId || !resolvedConversationId) return;
    reportActivity({
      accountId,
      conversationId: resolvedConversationId,
      activity,
    });
  }, [accountId, reportActivity, resolvedConversationId]);

  const clearSendError = useCallback(() => {
    setSendError(null);
    resetUpload();
  }, [resetUpload]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (isPublicMode && profile) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="bg-surface border-b border-subtle px-4 py-3 flex items-center gap-3">
          <Avatar
            name={profile.displayName}
            src={profile.avatarUrl || undefined}
            size="md"
          />
          <div>
            <h2 className="font-semibold text-primary">{profile.displayName}</h2>
            <p className="text-sm text-muted">@{profile.alias}</p>
          </div>
          <div className="ml-auto">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
        </div>

        {(sendError || error) && (
          <div className="mx-4 mt-3 p-3 bg-error-muted border border-error-muted rounded-lg text-error text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">{sendError || error}</div>
            <button
              onClick={clearSendError}
              className="p-1 text-error hover:text-primary transition-colors"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-accent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-14 h-14 mb-4 bg-elevated border border-subtle rounded-2xl flex items-center justify-center">
                <MessageCircle className="text-muted" size={28} />
              </div>
              <Avatar
                name={profile.displayName}
                src={profile.avatarUrl || undefined}
                size="2xl"
              />
              <h2 className="text-lg font-semibold text-primary mt-4">
                {profile.displayName}
              </h2>
              <p className="text-sm text-muted mt-1">
                Envía un mensaje para iniciar la conversación
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} id={`msg-${msg.id}`}>
                <MessageBubble
                  message={msg}
                  isOwn={getMessageOwnership(msg)}
                  isAI={msg.generatedBy === 'ai'}
                  onReply={() => setReplyingTo(msg)}
                />
              </div>
            ))
          )}
        </div>

        <div className="border-t border-subtle p-4">
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="flex-1 resize-none rounded-lg border border-subtle bg-base px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              rows={1}
              disabled={chatIsSending}
            />
            <button
              onClick={() => handleSend()}
              disabled={!message.trim() || chatIsSending}
              className="px-4 py-2 rounded-lg bg-accent text-inverse text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chatIsSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modo autenticado (ChatView completo)
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="bg-surface border-b border-subtle px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 size={20} className="text-muted" />
          <div>
            <h2 className="font-semibold text-primary">Conversación</h2>
            <p className="text-sm text-muted">{accountId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </div>
      </div>

      {(sendError || error) && (
        <div className="mx-4 mt-3 p-3 bg-error-muted border border-error-muted rounded-lg text-error text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">{sendError || error}</div>
          <button
            onClick={clearSendError}
            className="p-1 text-error hover:text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!accountId && (
        <div className="mx-4 mt-3 p-3 bg-warning-muted border border-warning-muted rounded-lg text-warning text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="min-w-0">No se ha seleccionado una cuenta. Por favor recarga la página o inicia sesión de nuevo.</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 mb-4 bg-elevated border border-subtle rounded-2xl flex items-center justify-center">
              <MessageCircle className="text-muted" size={28} />
            </div>
            <h3 className="text-lg font-medium text-primary mb-2">No hay mensajes aún</h3>
            <p className="text-sm text-secondary">Envía el primer mensaje para iniciar la conversación</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} id={`msg-${msg.id}`}>
              <MessageBubble
                message={msg}
                isOwn={getMessageOwnership(msg)}
                onReply={() => setReplyingTo(msg)}
              />
            </div>
          ))
        )}
      </div>

      <ParticipantsActivityBar activities={{}} />

      {replyingTo && (
        <div className="mx-4 mb-3 p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <span className="text-muted">Respondiendo a: </span>
            <span className="text-primary truncate">{replyingTo.content.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-muted hover:text-primary transition-colors"
            aria-label="Cancelar respuesta"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <ChatComposer
        value={message}
        onChange={setMessage}
        disabled={!accountId}
        isSending={chatIsSending}
        onSend={handleSend}
        accountId={accountId || ''}
        conversationId={resolvedConversationId}
        relationshipId={relationshipId}
        uploadAsset={uploadAssetForComposer}
        uploadAudio={uploadAudioForComposer}
        isUploading={isUploadingAttachment}
        uploadProgress={uploadProgress}
        onClearUploadError={clearSendError}
        onUserActivity={handleUserActivity}
      />
    </div>
  );
}
