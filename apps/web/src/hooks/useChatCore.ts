/**
 * useChatCore - Lógica compartida para chat (autenticado y público)
 * Unifica la lógica de manejo de mensajes, envío y estado
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Message } from '../types';

interface UseChatCoreOptions {
  conversationId: string;
  // Modo autenticado
  accountId?: string;
  // Modo público
  visitorToken?: string;
  // Callbacks específicos
  onSendMessage?: (content: string) => Promise<void>;
  onReceiveMessage?: (message: Message) => void;
}

export function useChatCore({
  accountId,
  visitorToken,
  onSendMessage,
  onReceiveMessage,
}: UseChatCoreOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Determinar modo de operación
  const isPublicMode = !accountId && !!visitorToken;
  const isAuthenticatedMode = !!accountId && !visitorToken;

  // Auto-scroll a nuevos mensajes
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Lógica de envío unificada
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      if (onSendMessage) {
        await onSendMessage(content.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar mensaje');
    } finally {
      setIsSending(false);
    }
  }, [onSendMessage, isSending]);

  // Lógica de recepción unificada
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    onReceiveMessage?.(message);
  }, [onReceiveMessage]);

  // Determinar ownership del mensaje
  const getMessageOwnership = useCallback((message: Message) => {
    if (isPublicMode) {
      // En modo público, usar visitor actor ID
      const visitorActorId = localStorage.getItem('fluxcore_visitor_actor_id');
      return message.fromActorId === visitorActorId;
    }
    
    if (isAuthenticatedMode) {
      // En modo autenticado, usar account store
      const activeActorId = localStorage.getItem('fluxcore_active_actor_id');
      return message.fromActorId === activeActorId;
    }
    
    return false;
  }, [isPublicMode, isAuthenticatedMode]);

  return {
    // Estado
    messages,
    isConnected,
    isSending,
    error,
    
    // Refs
    messagesEndRef,
    isAtBottomRef,
    
    // Acciones
    sendMessage,
    addMessage,
    getMessageOwnership,
    setError,
    
    // Meta
    isPublicMode,
    isAuthenticatedMode,
  };
}

export type { UseChatCoreOptions };
