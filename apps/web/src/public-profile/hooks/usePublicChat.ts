import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getOrCreateVisitorToken, setVisitorActorId } from '../../modules/visitor-token';
import { useAuthStore } from '../../store/authStore';
import { useAccountStore } from '../../store/accountStore';
import type { Message } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

export interface PublicProfile {
  id: string;
  displayName: string;
  alias: string;
  accountType: string;
  bio: string | null;
  avatarUrl: string | null;
  actorId: string | null; // 🆕 Add actorId for UnifiedChatView
}

/** @deprecated Use Message from '../../types' instead */
export type PublicMessage = Message;

interface UsePublicChatOptions {
  alias: string;
  onConversationCreated?: (conversationId: string) => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function usePublicChat({ alias, onConversationCreated }: UsePublicChatOptions) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [tenantAccountId, setTenantAccountId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Auth state
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeAccountId = useAccountStore((s) => s.activeAccountId);

  // visitorToken: used for anonymous visitors
  const visitorToken = useMemo(() => getOrCreateVisitorToken(), []);

  // 1. Load public profile via REST
  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);

    fetch(`${API_URL}/public/profiles/${encodeURIComponent(alias)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `Profile not found (${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.data) {
          setProfile(json.data);
        } else {
          throw new Error(json.message || 'Invalid profile response');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setProfileError(err.message);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => { cancelled = true; };
  }, [alias]);

  // 2. Load conversation history on mount (works for both auth and anon)
  useEffect(() => {
    if (!profile || historyLoaded) return;
    let cancelled = false;

    const loadHistory = async () => {
      try {
        if (isAuthenticated && activeAccountId && token) {
          // Authenticated: ensure relationship, then load conversation via API
          const relRes = await fetch(`${API_URL}/relationships`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ accountAId: activeAccountId, accountBId: profile.id }),
          });
          const relJson = await relRes.json();

          if (relJson.success && relJson.data) {
            const relationshipId = relJson.data.id;

            // Load conversations for this relationship
            const convRes = await fetch(
              `${API_URL}/conversations?accountId=${activeAccountId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const convJson = await convRes.json();

            if (convJson.success && convJson.data) {
              const conv = convJson.data.find((c: any) => c.relationshipId === relationshipId);
              if (conv) {
                conversationIdRef.current = conv.id;
                // Load messages
                const msgRes = await fetch(
                  `${API_URL}/conversations/${conv.id}/messages?accountId=${activeAccountId}&limit=100`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                const msgJson = await msgRes.json();

                if (!cancelled && msgJson.success && msgJson.data?.length > 0) {
                  const loadedMessages: Message[] = msgJson.data.map((m: any) => {
                    const content = m.content;
                    const textContent = typeof content === 'string'
                      ? (content.startsWith('{') ? JSON.parse(content) : { text: content })
                      : content;
                    return {
                      id: m.id,
                      conversationId: m.conversationId || conversationIdRef.current || '',
                      senderAccountId: m.senderAccountId || '',
                      content: textContent,
                      type: m.senderAccountId === activeAccountId ? 'outgoing' : 'incoming',
                      generatedBy: m.generatedBy || 'human',
                      status: 'synced',
                      createdAt: m.createdAt || new Date().toISOString(),
                    } as Message;
                  });
                  setMessages(loadedMessages);
                }
              }
            }
          }
        } else {
          // Anonymous: load via public endpoint
          const res = await fetch(
            `${API_URL}/public/profiles/${encodeURIComponent(alias)}/conversation?visitorToken=${encodeURIComponent(visitorToken)}`
          );
          const json = await res.json();

          if (!cancelled && json.success && json.data?.messages?.length > 0) {
            conversationIdRef.current = json.data.conversationId;
            const loadedMessages: Message[] = json.data.messages.map((m: any) => ({
              id: m.id,
              conversationId: json.data.conversationId || '',
              senderAccountId: '',
              fromActorId: m.fromActorId,
              content: { text: m.text },
              type: m.sender === 'visitor' ? 'outgoing' : 'incoming',
              generatedBy: m.generatedBy || (m.sender === 'account' ? 'ai' : 'human'),
              status: 'synced' as const,
              createdAt: m.timestamp || new Date().toISOString(),
            } as Message));
            setMessages(loadedMessages);
          }
        }
      } catch (err) {
        console.error('[PublicChat] Error loading history:', err);
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [profile, historyLoaded, isAuthenticated, activeAccountId, token, alias, visitorToken]);

  // 3. Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (!mountedRef.current) return;

    setConnectionStatus('connecting');

    // Authenticated visitors pass token so the server populates ws.data.userId/accountId
    const wsUrl = isAuthenticated && token
      ? `${WS_URL}?token=${encodeURIComponent(token)}`
      : WS_URL;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;

      if (isAuthenticated && activeAccountId && conversationIdRef.current) {
        // Authenticated: subscribe to conversation via normal protocol
        ws.send(JSON.stringify({
          type: 'subscribe',
          conversationId: conversationIdRef.current,
        }));
        setConnectionStatus('connected');
        setTenantAccountId(profile?.id || null);
      } else {
        // Anonymous: widget protocol
        ws.send(JSON.stringify({
          type: 'widget:connect',
          alias,
          visitorToken,
        }));
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'connected':
            break;

          case 'subscribed':
            setConnectionStatus('connected');
            break;

          case 'widget:connected':
            setConnectionStatus('connected');
            setTenantAccountId(msg.accountId || msg.tenantId || null);
            break;

          case 'widget:error':
            console.error('[PublicChat] Widget error:', msg.message);
            setConnectionStatus('error');
            break;

          case 'widget:visitor_actor':
            if (msg.visitorActorId) {
              setVisitorActorId(msg.visitorActorId);
              console.log('[PublicChat] Received visitor actor ID:', msg.visitorActorId);
            }
            break;

          case 'widget:message_received':
            if (msg.conversationId) {
              conversationIdRef.current = msg.conversationId;
            }
            if (msg.visitorActorId) {
              setVisitorActorId(msg.visitorActorId);
            }
            break;

          case 'message:new': {
            const msgData = msg.data;
            if (!msgData) break;

            // Determine if this is a response (not our own message)
            let isResponse = false;
            if (isAuthenticated && activeAccountId) {
              // Authenticated: responses are messages NOT sent by us
              isResponse = msgData.senderAccountId !== activeAccountId;
            } else {
              // Anonymous: responses are outgoing messages (AI/account)
              isResponse = msgData.type === 'outgoing';
            }

            if (!isResponse) break;

            const content = msgData.content;
            const text = typeof content === 'string'
              ? content
              : content?.text || '';

            if (text) {
              setMessages((prev) => {
                // Deduplicate by ID
                if (prev.some((m) => m.id === msgData.id)) return prev;
                return [
                  ...prev,
                  {
                    id: msgData.id || `msg_${Date.now()}`,
                    conversationId: msgData.conversationId || conversationIdRef.current || '',
                    senderAccountId: msgData.senderAccountId || '',
                    fromActorId: msgData.fromActorId,
                    content: { text },
                    type: 'incoming',
                    generatedBy: msgData.generatedBy || 'ai',
                    status: 'synced',
                    createdAt: msgData.createdAt || new Date().toISOString(),
                  } as Message,
                ];
              });
            }
            break;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnectionStatus('disconnected');
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connectWebSocket();
        }
      }, 3000);
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setConnectionStatus('error');
    };
  }, [alias, visitorToken, isAuthenticated, activeAccountId, profile]);

  // Start WebSocket when profile is loaded and history has been fetched
  useEffect(() => {
    if (!profile || !historyLoaded) return;
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [profile, historyLoaded, connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 4. Send message
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Optimistic: add to local messages immediately
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        conversationId: conversationIdRef.current || '',
        senderAccountId: activeAccountId || 'visitor',
        content: { text: trimmed },
        type: 'outgoing',
        generatedBy: 'human',
        status: 'pending_backend',
        createdAt: new Date().toISOString(),
      } as Message,
    ]);

    if (isAuthenticated && activeAccountId && conversationIdRef.current) {
      // Authenticated: send via normal message protocol
      wsRef.current.send(JSON.stringify({
        type: 'message',
        conversationId: conversationIdRef.current,
        senderAccountId: activeAccountId,
        content: { text: trimmed },
      }));
    } else {
      // Anonymous: send via widget protocol
      wsRef.current.send(JSON.stringify({
        type: 'widget:message',
        alias,
        visitorToken,
        content: { text: trimmed },
      }));
    }

    onConversationCreated?.(conversationIdRef.current || localId);
  }, [alias, visitorToken, isAuthenticated, activeAccountId, onConversationCreated]);

  return {
    profile,
    profileLoading,
    profileError,
    messages,
    sendMessage,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    conversationId: conversationIdRef.current, // 🆕 Add conversationId for UnifiedChatView
    visitorToken,
    tenantAccountId,
    isAuthenticated,
  };
}
