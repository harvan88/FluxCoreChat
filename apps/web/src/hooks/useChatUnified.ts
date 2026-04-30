/**
 * useChatUnified - Hook unificado para chat (autenticado y público)
 * Soporta ambos modos usando la misma API REST
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message } from '../types';
import { getOrCreateVisitorToken, setVisitorActorId } from '../modules/visitor-token';
import { useAccountStore } from '../store/accountStore';

import { getApiUrl } from '../utils/urls';

const API_URL = getApiUrl();

interface UseChatUnifiedOptions {
  conversationId?: string;
  accountId?: string;
  publicAlias?: string;
  onNewMessage?: (message: Message) => void;
}

interface SendMessageParams {
  content: { text?: string; media?: any[]; type?: string };
  generatedBy?: 'human' | 'ai' | 'system';
  replyToId?: string;
}

interface PublicProfileSession {
  conversationId: string;
  ownerAccountId: string;
  ownerActorId: string;
  visitorActorId: string;
  visitorToken: string;
  publicToken: string;
}

export function useChatUnified({
  conversationId,
  accountId,
  publicAlias,
  onNewMessage
}: UseChatUnifiedOptions) {
  const activeActorId = useAccountStore((state) => state.activeActorId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicSession, setPublicSession] = useState<PublicProfileSession | null>(null);
  const publicSessionRef = useRef<PublicProfileSession | null>(null);
  const loadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const pendingSignaturesRef = useRef<Map<string, string>>(new Map());

  const isPublicMode = !accountId && !!publicAlias;
  const isAuthenticatedMode = !!accountId && !publicAlias;
  const resolvedConversationId = isPublicMode
    ? (publicSession?.conversationId || conversationId || '')
    : (conversationId || '');
  const myActorId = isPublicMode ? (publicSession?.visitorActorId || null) : (activeActorId || null);

  const normalizeMessages = useCallback((messageList: any[]): Message[] => {
    return messageList.map((msg: any) => {
      let content = msg.content;
      if (typeof content === 'string') {
        try {
          content = content.startsWith('{') ? JSON.parse(content) : { text: content };
        } catch {
          content = { text: content };
        }
      } else if (!content) {
        content = { text: '' };
      }
      
      return {
        ...msg,
        content
      };
    });
  }, []);

  const ensurePublicSession = useCallback(async () => {
    if (!isPublicMode || !publicAlias) return null;
    if (publicSessionRef.current) return publicSessionRef.current;

    console.log(`[useChatUnified] Incializando sesión para alias: ${publicAlias} en ${API_URL}`);
    
    try {
      const visitorToken = getOrCreateVisitorToken();
      const response = await fetch(
        `${API_URL}/public/profiles/${encodeURIComponent(publicAlias)}/session?visitorToken=${encodeURIComponent(visitorToken)}`
      );

      if (!response.ok) {
        throw new Error(`Error de sesión: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Fallo al inicializar sesión');
      }

      console.log('[useChatUnified] Sesión inicializada:', result.data.visitorActorId);
      setVisitorActorId(result.data.visitorActorId);
      publicSessionRef.current = result.data;
      setPublicSession(result.data);
      return result.data as PublicProfileSession;
    } catch (err: any) {
      const msg = err.message;
      console.error('[useChatUnified] Error en ensurePublicSession:', msg);
      setError(`Conexión lenta o fallida: ${msg}`);
      throw new Error(msg);
    }
  }, [isPublicMode, publicAlias]);

  const getToken = useCallback(async () => {
    if (isAuthenticatedMode) {
      return localStorage.getItem('fluxcore_token');
    }

    if (isPublicMode) {
      const session = await ensurePublicSession();
      return session?.publicToken || null;
    }

    return null;
  }, [ensurePublicSession, isAuthenticatedMode, isPublicMode]);

  const getMessageOwnership = useCallback((message: Message) => {
    return !!message.fromActorId && !!myActorId && message.fromActorId === myActorId;
  }, [myActorId]);

  const buildSignature = useCallback((payload: {
    content?: { text?: string } | null | any;
    replyToId?: string | null;
    generatedBy?: Message['generatedBy'];
  }) => {
    let text = '';
    if (typeof payload.content === 'string') {
      text = payload.content;
    } else if (payload.content?.text) {
      text = payload.content.text;
    }

    // Normalización agresiva para evitar fallos de firma
    const normalizedText = text.trim().toLowerCase().replace(/\s+/g, ' ');
    const replyTo = payload.replyToId ?? '';
    const generatedBy = payload.generatedBy ?? 'human';
    const senderId = myActorId ?? accountId ?? 'unknown-actor';
    return `${senderId}:${normalizedText}:${replyTo}:${generatedBy}`;
  }, [myActorId, accountId]);

  const loadMessages = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      if (isAuthenticatedMode) {
        if (!conversationId) return;

        const token = await getToken();
        if (!token) {
          setError('Authentication required');
          return;
        }

        const response = await fetch(`${API_URL}/conversations/${conversationId}/messages?limit=50`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const messageList = Array.isArray(result) ? result : (result.data || result.messages || []);
        setMessages(normalizeMessages(messageList));
        loadedRef.current = true;
        return;
      }

      const session = await ensurePublicSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/messages?conversationId=${session.conversationId}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${session.publicToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to load messages');
      }

      setMessages(normalizeMessages(result.data || []));
      loadedRef.current = true;
    } catch (err: any) {
      console.error('[useChatUnified] Load messages error:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [accountId, conversationId, ensurePublicSession, getToken, isAuthenticatedMode, normalizeMessages]);

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    const session = isPublicMode ? await ensurePublicSession() : null;
    const targetConversationId = isPublicMode ? (session?.conversationId || '') : (conversationId || '');
    if (!targetConversationId) {
      throw new Error('Conversation ID is required');
    }

    const token = isPublicMode ? session?.publicToken : await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const tempId = `temp-${Date.now()}`;
    const signature = buildSignature({
      content: params.content,
      replyToId: params.replyToId,
      generatedBy: params.generatedBy
    });

    const optimisticMessage: Message = {
      id: tempId,
      conversationId: targetConversationId,
      senderAccountId: isPublicMode ? (session?.visitorActorId || '') : (accountId || ''),
      fromActorId: isPublicMode ? (session?.visitorActorId || undefined) : (myActorId || undefined),
      content: params.content,
      type: 'outgoing',
      generatedBy: params.generatedBy || 'human',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    pendingSignaturesRef.current.set(signature, tempId);
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: targetConversationId,
          ...(isAuthenticatedMode && { senderAccountId: accountId }),
          ...(myActorId && { fromActorId: myActorId }),
          content: params.content,
          type: isPublicMode ? 'incoming' : 'outgoing',
          generatedBy: params.generatedBy || 'human',
          ...(params.replyToId && { replyToId: params.replyToId }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (result.success) {
        const messageId = result.data?.messageId || result.messageId || tempId;
        pendingSignaturesRef.current.delete(signature);

        setMessages(prev => {
          // Si el mensaje ya llegó por WebSocket (mismo ID real), eliminamos el temporal
          if (prev.some(m => m.id === messageId)) {
            return prev.filter(m => m.id !== tempId);
          }
          // Si no ha llegado, actualizamos el temporal con el ID real
          return prev.map(m => m.id === tempId ? { ...m, id: messageId, status: 'synced' } : m);
        });
      } else {
        throw new Error(result.message || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('[useChatUnified] Send message error:', err);

      // Eliminar mensaje optimista en caso de error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      pendingSignaturesRef.current.delete(signature);

      setError(err.message || 'Failed to send message');
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [accountId, buildSignature, conversationId, ensurePublicSession, getToken, isAuthenticatedMode, isPublicMode, myActorId, loadMessages]);

  const addReceivedMessage = useCallback((message: Message) => {
    const signature = buildSignature({
      content: message.content,
      replyToId: message.replyToId,
      generatedBy: message.generatedBy
    });

    setMessages(prev => {
      // 1. Verificar si el mensaje ya existe por ID
      if (prev.some(m => m.id === message.id)) {
        return prev.map(m => m.id === message.id ? { ...m, ...message, status: 'synced' } : m);
      }

      // 2. Intentar emparejar con un mensaje optimista vía firma
      const tempId = pendingSignaturesRef.current.get(signature);
      if (tempId) {
        pendingSignaturesRef.current.delete(signature);
        return prev.map(m => m.id === tempId ? { ...message, status: 'synced' } : m);
      }

      // 3. Fallback: Intentar emparejar con cualquier mensaje 'pending_backend' o 'outgoing' con el mismo contenido
      const optimisticMatch = prev.find(m =>
        (m.id.startsWith('temp-') || m.id.startsWith('local_')) &&
        JSON.stringify(m.content) === JSON.stringify(message.content)
      );

      if (optimisticMatch) {
        return prev.map(m => m.id === optimisticMatch.id ? { ...message, status: 'synced' } : m);
      }

      // 4. Si es un mensaje nuevo, añadir
      return [...prev, { ...message, status: 'synced' }];
    });

    onNewMessage?.(message);
  }, [buildSignature, onNewMessage]);

  const deleteMessage = useCallback(async (messageId: string, scope: 'self' | 'all' = 'self') => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const params = new URLSearchParams({ scope });
      const response = await fetch(`${API_URL}/messages/${messageId}?${params}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // 🔄 Solo eliminar localmente si es 'self' (eliminar para mí)
        // Para 'all' (eliminar para todos), esperar la notificación WebSocket
        if (scope === 'self') {
          setMessages(prev => prev.filter(m => m.id !== messageId));
          console.log(`[useChatUnified] Message ${messageId} hidden locally (scope=self)`);
        } else {
          console.log(`[useChatUnified] Message ${messageId} overwrite sent (scope=all), waiting for WebSocket update`);
        }
      } else {
        throw new Error(result.message || 'Failed to delete message');
      }
    } catch (err: any) {
      console.error('[useChatUnified] Delete message error:', err);
      setError(err.message || 'Failed to delete message');
      throw err;
    }
  }, [getToken]);

  const refresh = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    setMessages([]);
    setError(null);
    setPublicSession(null);
    publicSessionRef.current = null;
    pendingSignaturesRef.current.clear();
    loadedRef.current = false;
    isLoadingRef.current = false;
  }, [conversationId, accountId, publicAlias]);

  useEffect(() => {
    if ((conversationId || isPublicMode) && !loadedRef.current) {
      loadMessages();
    }
  }, [conversationId, isPublicMode, loadMessages]);

  const updateMessage = useCallback((messageId: string, updatedMessage: Partial<Message>) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, ...updatedMessage } : msg
    ));
  }, []);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    addReceivedMessage,
    deleteMessage,
    updateMessage, // 🔄 Nueva función para actualizar mensajes
    refresh,
    getMessageOwnership,
    isPublicMode,
    isAuthenticatedMode,
    conversationId: resolvedConversationId,
    publicSession,
  };
}

export type { UseChatUnifiedOptions, SendMessageParams };
