/**
 * V2-1: useChat Hook
 * 
 * Gestiona mensajes de una conversación con conexión a API real.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UseChatOptions {
  conversationId: string;
  accountId: string;
  onNewMessage?: (message: Message) => void;
}

interface SendMessageParams {
  content: { text?: string; type?: string };
  generatedBy?: 'human' | 'ai';
  replyToId?: string;
}

export function useChat({ conversationId, accountId, onNewMessage }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const getAuthToken = () => localStorage.getItem('fluxcore_token');

  // Cargar mensajes desde API
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      
      // Normalizar mensajes
      const normalizedMessages: Message[] = (Array.isArray(data) ? data : data.data || []).map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        senderAccountId: msg.senderAccountId,
        content: typeof msg.content === 'string' ? { text: msg.content } : msg.content,
        type: msg.senderAccountId === accountId ? 'outgoing' : 'incoming',
        generatedBy: msg.generatedBy || 'human',
        status: msg.status || 'synced',
        replyToId: msg.replyToId,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      }));

      setMessages(normalizedMessages);
    } catch (err: any) {
      setError(err.message);
      console.error('[useChat] Failed to load messages:', err);
      
      // Fallback: mantener mensajes locales si hay error
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, accountId]);

  // Enviar mensaje
  const sendMessage = useCallback(async (params: SendMessageParams): Promise<Message | null> => {
    if (!conversationId || !accountId) return null;

    setIsSending(true);
    setError(null);

    // Crear mensaje local optimista
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderAccountId: accountId,
      content: params.content,
      type: 'outgoing',
      generatedBy: params.generatedBy || 'human',
      status: 'pending_backend',
      replyToId: params.replyToId,
      createdAt: new Date().toISOString(),
    };

    // Añadir mensaje optimista
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          conversationId,
          senderAccountId: accountId,
          content: params.content,
          type: 'outgoing',
          generatedBy: params.generatedBy || 'human',
          replyToId: params.replyToId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const savedMessage: Message = {
        id: data.id || data.data?.id,
        conversationId,
        senderAccountId: accountId,
        content: params.content,
        type: 'outgoing',
        generatedBy: params.generatedBy || 'human',
        status: 'synced',
        replyToId: params.replyToId,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      // Reemplazar mensaje temporal con el real
      setMessages(prev => prev.map(m => 
        m.id === tempId ? savedMessage : m
      ));

      return savedMessage;
    } catch (err: any) {
      setError(err.message);
      
      // Marcar mensaje como fallido
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, status: 'failed' as const } : m
      ));

      return null;
    } finally {
      setIsSending(false);
    }
  }, [conversationId, accountId]);

  // Añadir mensaje recibido (desde WebSocket)
  const addReceivedMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Evitar duplicados
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
    onNewMessage?.(message);
  }, [onNewMessage]);

  // Actualizar estado de mensaje
  const updateMessageStatus = useCallback((messageId: string, status: Message['status']) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, status } : m
    ));
  }, []);

  // Editar mensaje
  const editMessage = useCallback(async (messageId: string, newContent: { text: string }) => {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: newContent, updatedAt: new Date().toISOString() } : m
      ));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  // Eliminar mensaje
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  // Reintentar mensaje fallido
  const retryMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.status !== 'failed') return null;

    // Eliminar mensaje fallido
    setMessages(prev => prev.filter(m => m.id !== messageId));

    // Reenviar
    return sendMessage({
      content: { text: message.content.text },
      generatedBy: message.generatedBy,
      replyToId: message.replyToId,
    });
  }, [messages, sendMessage]);

  // Cargar mensajes iniciales
  useEffect(() => {
    if (conversationId && !loadedRef.current) {
      loadedRef.current = true;
      loadMessages();
    }
  }, [conversationId, loadMessages]);

  // Reset cuando cambia conversación
  useEffect(() => {
    loadedRef.current = false;
    setMessages([]);
  }, [conversationId]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    addReceivedMessage,
    updateMessageStatus,
    editMessage,
    deleteMessage,
    retryMessage,
    refresh: loadMessages,
  };
}
