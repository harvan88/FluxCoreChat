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
  fromActorId?: string;
  generatedBy?: 'human' | 'ai' | 'system';
  replyToId?: string;
}

export function useChat({ conversationId, accountId, onNewMessage }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const pendingSignaturesRef = useRef<Map<string, string>>(new Map());

  const getAuthToken = () => localStorage.getItem('fluxcore_token');

  const buildSignature = useCallback((payload: {
    senderAccountId: string;
    content?: { text?: string } | null;
    replyToId?: string | null;
    generatedBy?: Message['generatedBy'];
  }) => {
    const text = (payload.content?.text ?? '').trim(); // 🔥 CORRECCIÓN: Usar texto normalizado
    const replyTo = payload.replyToId ?? '';
    const generatedBy = payload.generatedBy ?? 'human';
    return `${payload.senderAccountId}:${text}:${replyTo}:${generatedBy}`;
  }, []);

  // Cargar mensajes
  const loadMessages = useCallback(async () => {
    if (!conversationId || !accountId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setIsLoading(false);
        return;
      }

      // Cargar últimos 50 mensajes (con accountId para filtro de visibilidad)
      const msgParams = new URLSearchParams({ limit: '50' });
      if (accountId) msgParams.set('accountId', accountId);
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages?${msgParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Manejar diferentes códigos de error
      if (response.status === 404) {
        // Conversación no existe, mostrar vacío sin error
        setMessages([]);
        setIsLoading(false);
        return;
      }

      if (response.status === 401) {
        setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudieron cargar los mensajes`);
      }

      const data = await response.json();
      
      // Normalizar mensajes
      const messageList = Array.isArray(data) ? data : (data.data || data.messages || []);
      const normalizedMessages: Message[] = messageList.map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        senderAccountId: msg.senderAccountId,
        fromActorId: msg.fromActorId,
        content: typeof msg.content === 'string' ? 
          (msg.content.startsWith('{') ? JSON.parse(msg.content) : { text: msg.content }) : 
          msg.content,
        type: (msg.type === 'incoming' && msg.senderAccountId === accountId)
          ? 'incoming'
          : (msg.senderAccountId === accountId ? 'outgoing' : 'incoming'),
        generatedBy: msg.generatedBy || 'human',
        status: msg.status || 'synced',
        replyToId: msg.replyToId,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      }));

      setMessages(normalizedMessages);
    } catch (err: any) {
      console.error('[useChat] Failed to load messages:', err);
      
      // NO MOCK DATA - Mostrar error real
      setMessages([]); // Limpiar mensajes previos
      if (err.message?.includes('fetch')) {
        setError('No se puede conectar al servidor');
      } else {
        setError(err.message || 'Error al cargar mensajes');
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, accountId]);

  // Enviar mensaje
  const sendMessage = useCallback(async (params: SendMessageParams): Promise<Message | null> => {
    if (!conversationId || !accountId) return null;

    setIsSending(true);
    setError(null);

    // Verificar token antes de enviar
    const token = getAuthToken();
    if (!token) {
      // En producción, no permitir envío sin token
      if (!import.meta.env.DEV) {
        setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setIsSending(false);
        return null;
      }
    }

    try {
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        conversationId,
        senderAccountId: accountId,
        fromActorId: params.fromActorId,
        content: params.content,
        type: 'outgoing',
        generatedBy: params.generatedBy || 'human',
        status: 'pending_backend',
        replyToId: params.replyToId,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, optimisticMessage]);
      const signature = buildSignature(optimisticMessage);
      pendingSignaturesRef.current.set(signature, tempId);

      // Modo demo sin token: simular envío local
      if (!token && import.meta.env.DEV) {
        // Simular delay de red (solo entorno dev sin token)
        await new Promise(resolve => setTimeout(resolve, 300));
        pendingSignaturesRef.current.delete(signature);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: `msg-${Date.now()}`, status: 'synced' } : m));
        return optimisticMessage;
      }

      console.log(`[useChat] 📤 Sending message:`, {
        conversationId,
        senderAccountId: accountId,
        fromActorId: params.fromActorId,
        content: params.content.text?.substring(0, 50),
        type: 'outgoing',
        token: token ? 'present' : 'missing'
      });

      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          // RESTORED: Enviar senderAccountId explícitamente (cuenta seleccionada en UI)
          senderAccountId: accountId,
          fromActorId: params.fromActorId,
          content: params.content,
          type: 'outgoing',
          generatedBy: params.generatedBy || 'human',
          replyToId: params.replyToId,
          // Idempotency key para prevenir duplicados
          requestId: `msg-${Date.now()}-${accountId}`,
        }),
      });

      console.log(`[useChat] 📡 API response status:`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[useChat] ❌ API Error ${response.status}:`, errorText);
        pendingSignaturesRef.current.delete(signature);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
      }

      // El backend ya certificó el mensaje y FluxCore lo emitirá por WebSocket.
      return optimisticMessage;
    } catch (err: any) {
      setError(err.message);

      return null;
    } finally {
      setIsSending(false);
    }
  }, [conversationId, accountId]);

  // Añadir mensaje recibido (desde WebSocket)
  const addReceivedMessage = useCallback((message: Message) => {
    const signature = buildSignature(message);
    const pendingId = pendingSignaturesRef.current.get(signature);

    setMessages(prev => {
      const withoutPending = pendingId ? prev.filter(m => m.id !== pendingId) : prev;
      if (withoutPending.some(m => m.id === message.id)) {
        return withoutPending;
      }
      return [...withoutPending, message];
    });

    if (pendingId) {
      pendingSignaturesRef.current.delete(signature);
    }

    onNewMessage?.(message);
  }, [buildSignature, onNewMessage]);

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

  // Sobrescribir mensaje (eliminar para todos) u ocultar (eliminar para mí)
  const deleteMessage = useCallback(async (messageId: string, scope: 'self' | 'all' = 'self') => {
    try {
      const params = new URLSearchParams({ scope });
      if (accountId) params.set('accountId', accountId);
      const response = await fetch(`${API_URL}/messages/${messageId}?${params}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to overwrite message');
      }

      // 🔄 Solo eliminar localmente si es 'self' (eliminar para mí)
      // Para 'all' (eliminar para todos), esperar la notificación WebSocket
      if (scope === 'self') {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        console.log(`[useChat] Message ${messageId} hidden locally (scope=self)`);
      } else {
        console.log(`[useChat] Message ${messageId} overwrite sent (scope=all), waiting for WebSocket update`);
      }
      
      return true;
    } catch (err: any) {
      console.error('[useChat] overwriteMessage error:', err.message);
      setError(err.message);
      return false;
    }
  }, [accountId]);

  // Mantener método legacy por compatibilidad
  const deleteMessageLegacy = deleteMessage; // Alias si es necesario para compatibilidad

  // Reintentar mensaje fallido
  const retryMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.status !== 'failed') return null;

    // Eliminar mensaje fallido
    setMessages(prev => prev.filter(m => m.id !== messageId));

    // Reenviar
    return sendMessage({
      content: { text: message.content.text },
      fromActorId: message.fromActorId,
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
    pendingSignaturesRef.current.clear();
  }, [conversationId]);

  return {
    messages,
    setMessages,
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
