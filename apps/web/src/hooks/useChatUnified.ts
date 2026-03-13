/**
 * useChatUnified - Hook unificado para chat (autenticado y público)
 * Soporta ambos modos usando la misma API REST
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message } from '../types';
import { getOrCreateVisitorToken, setVisitorActorId } from '../modules/visitor-token';
import { useAccountStore } from '../store/accountStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  const loadedRef = useRef(false);
  const pendingSignaturesRef = useRef<Map<string, string>>(new Map());

  const isPublicMode = !accountId && !!publicAlias;
  const isAuthenticatedMode = !!accountId && !publicAlias;
  const resolvedConversationId = isPublicMode
    ? (publicSession?.conversationId || conversationId || '')
    : (conversationId || '');
  const myActorId = isPublicMode ? (publicSession?.visitorActorId || null) : (activeActorId || null);

  const normalizeMessages = useCallback((messageList: any[]): Message[] => {
    return messageList.map((msg: any) => ({
      ...msg,
      content: typeof msg.content === 'string'
        ? (msg.content.startsWith('{') ? JSON.parse(msg.content) : { text: msg.content })
        : msg.content,
    }));
  }, []);

  const ensurePublicSession = useCallback(async () => {
    if (!isPublicMode || !publicAlias) return null;
    if (publicSession) return publicSession;

    const visitorToken = getOrCreateVisitorToken();
    const response = await fetch(
      `${API_URL}/public/profiles/${encodeURIComponent(publicAlias)}/session?visitorToken=${encodeURIComponent(visitorToken)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.message || 'Failed to initialize public session');
    }

    setVisitorActorId(result.data.visitorActorId);
    setPublicSession(result.data);
    return result.data as PublicProfileSession;
  }, [isPublicMode, publicAlias, publicSession]);

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
    content?: { text?: string } | null;
    replyToId?: string | null;
    generatedBy?: Message['generatedBy'];
  }) => {
    const text = (payload.content?.text ?? '').trim();
    const replyTo = payload.replyToId ?? '';
    const generatedBy = payload.generatedBy ?? 'human';
    const senderId = myActorId ?? accountId ?? 'unknown-actor';
    return `${senderId}:${text}:${replyTo}:${generatedBy}`;
  }, [myActorId, accountId]);

  const loadMessages = useCallback(async () => {
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
        setMessages(prev => prev.map((message) => (
          message.id === tempId
            ? { ...message, id: messageId, status: 'synced' }
            : message
        )));
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
  }, [accountId, buildSignature, conversationId, ensurePublicSession, getToken, isAuthenticatedMode, isPublicMode, myActorId]);

  const addReceivedMessage = useCallback((message: Message) => {
    const signature = buildSignature({
      content: message.content,
      replyToId: message.replyToId,
      generatedBy: message.generatedBy
    });
    
    const tempId = pendingSignaturesRef.current.get(signature);
    if (tempId) {
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...message } : m
      ));
      pendingSignaturesRef.current.delete(signature);
    } else {
      setMessages(prev => [...prev, message]);
    }
    
    onNewMessage?.(message);
  }, [buildSignature, onNewMessage]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
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
        setMessages(prev => prev.filter(m => m.id !== messageId));
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
    pendingSignaturesRef.current.clear();
    loadedRef.current = false;
  }, [conversationId, accountId, publicAlias]);

  useEffect(() => {
    if ((conversationId || isPublicMode) && !loadedRef.current) {
      loadMessages();
    }
  }, [conversationId, isPublicMode, loadMessages]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    addReceivedMessage,
    deleteMessage,
    refresh,
    getMessageOwnership,
    isPublicMode,
    isAuthenticatedMode,
    conversationId: resolvedConversationId,
    publicSession,
  };
}

export type { UseChatUnifiedOptions, SendMessageParams };
