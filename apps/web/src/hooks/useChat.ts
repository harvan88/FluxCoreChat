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

    const token = getAuthToken();
    if (!token) {
      // Sin token, no intentar cargar
      setMessages([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
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
      console.error('[useChat] Failed to load messages:', err);
      
      // Modo demo: cargar mensajes mock cuando la API falla
      if (import.meta.env.DEV) {
        console.log('[useChat] Loading demo messages...');
        const demoMessages: Message[] = [
          {
            id: 'demo-1',
            conversationId,
            senderAccountId: 'contact-1',
            content: { text: '¡Hola! ¿Cómo estás?' },
            type: 'incoming',
            generatedBy: 'human',
            status: 'synced',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'demo-2',
            conversationId,
            senderAccountId: accountId,
            content: { text: '¡Muy bien! Trabajando en el proyecto.' },
            type: 'outgoing',
            generatedBy: 'human',
            status: 'synced',
            createdAt: new Date(Date.now() - 3500000).toISOString(),
          },
          {
            id: 'demo-3',
            conversationId,
            senderAccountId: 'contact-1',
            content: { text: '¿Cómo va todo?' },
            type: 'incoming',
            generatedBy: 'human',
            status: 'synced',
            createdAt: new Date(Date.now() - 1800000).toISOString(),
          },
        ];
        setMessages(demoMessages);
        setError(null); // Clear error in demo mode
      } else {
        // Production: show error
        if (err.message?.includes('fetch')) {
          setError('No se puede conectar al servidor');
        } else {
          setError(err.message || 'Error al cargar mensajes');
        }
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
      const token = getAuthToken();
      
      // Modo demo sin token: simular envío local
      if (!token && import.meta.env.DEV) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const savedMessage: Message = {
          ...optimisticMessage,
          id: `msg-${Date.now()}`,
          status: 'synced',
        };
        
        setMessages(prev => prev.map(m => 
          m.id === tempId ? savedMessage : m
        ));
        
        return savedMessage;
      }

      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      // En modo demo, simular éxito local
      if (import.meta.env.DEV) {
        const savedMessage: Message = {
          ...optimisticMessage,
          id: `msg-${Date.now()}`,
          status: 'synced',
        };
        
        setMessages(prev => prev.map(m => 
          m.id === tempId ? savedMessage : m
        ));
        
        return savedMessage;
      }

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
