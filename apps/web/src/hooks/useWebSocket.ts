/**
 * HITO-WEBSOCKET-SUGGESTIONS: useWebSocket Hook
 * 
 * Hook para conexión WebSocket con soporte para sugerencias de IA.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AISuggestion } from '../components/extensions';
import type { EnrichmentBatch } from '../types/enrichments';
import { useEnrichmentStore } from '../store/enrichmentStore';
import { useUIStore } from '../store/uiStore';
import { usePanelStore } from '../store/panelStore';
import { clearAccountData, deleteAccountDatabase } from '../db';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WSMessage {
  type: string;
  data?: any;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WSMessage) => void;
  onSuggestion?: (suggestion: AISuggestion) => void;
  onSuggestionGenerating?: () => void;
  onSuggestionDisabled?: (reason: string) => void;
  onSuggestionAutoWaiting?: (payload: { suggestionId: string; delayMs: number }) => void;
  onSuggestionAutoTyping?: (payload: { suggestionId: string }) => void;
  onSuggestionAutoSending?: (payload: { suggestionId: string }) => void;
  onSuggestionAutoCancelled?: (payload: { suggestionId: string }) => void;
  onActivityState?: (payload: { accountId: string; conversationId: string; activity: string }) => void;
  autoConnect?: boolean;
  accountIdOverride?: string | null;
  authTokenOverride?: string | null;
  includeSelectedAccountId?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  pingInterval?: number; // Add pingInterval option
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onSuggestion,
    onSuggestionGenerating,
    onSuggestionDisabled,
    onSuggestionAutoWaiting,
    onSuggestionAutoTyping,
    onSuggestionAutoSending,
    onSuggestionAutoCancelled,
    onActivityState,
    autoConnect = true,
    accountIdOverride = null,
    authTokenOverride = null,
    includeSelectedAccountId = true,
    reconnect = true,
    reconnectInterval = 3000,
    pingInterval = 30000, // Add default pingInterval
  } = options;

  // Obtener accountId actual para reconexión automática
  const selectedAccountId = useUIStore((state) => state.selectedAccountId);
  const effectiveAccountId = includeSelectedAccountId
    ? (accountIdOverride ?? selectedAccountId)
    : accountIdOverride;
  const effectiveAuthToken = authTokenOverride ?? localStorage.getItem('fluxcore_token');

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedRelationshipsRef = useRef<Set<string>>(new Set());
  const subscribedConversationsRef = useRef<Set<string>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const manualDisconnectRef = useRef(false);
  const mountedRef = useRef(true);
  const autoConnectEnabledRef = useRef(false);
  const currentAccountIdRef = useRef<string | null>(null);
  const currentAuthTokenRef = useRef<string | null>(effectiveAuthToken);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Refs for connect-time values (avoids recreating connect on every change)
  const effectiveAccountIdRef = useRef(effectiveAccountId);
  effectiveAccountIdRef.current = effectiveAccountId;
  const effectiveAuthTokenRef = useRef(effectiveAuthToken);
  effectiveAuthTokenRef.current = effectiveAuthToken;
  
  // Refs para callbacks estables (evitar loops de reconexión)
  const callbacksRef = useRef({
    onMessage,
    onSuggestion,
    onSuggestionGenerating,
    onSuggestionDisabled,
    onSuggestionAutoWaiting,
    onSuggestionAutoTyping,
    onSuggestionAutoSending,
    onSuggestionAutoCancelled,
    onActivityState,
  });

  // Solo actualizar callbacksRef si realmente cambiaron
  const prevCallbacksRef = useRef({
    onMessage,
    onSuggestion,
    onSuggestionGenerating,
    onSuggestionDisabled,
    onSuggestionAutoWaiting,
    onSuggestionAutoTyping,
    onSuggestionAutoSending,
    onSuggestionAutoCancelled,
    onActivityState,
  });

  if (
    prevCallbacksRef.current.onMessage !== onMessage ||
    prevCallbacksRef.current.onSuggestion !== onSuggestion ||
    prevCallbacksRef.current.onSuggestionGenerating !== onSuggestionGenerating ||
    prevCallbacksRef.current.onSuggestionDisabled !== onSuggestionDisabled ||
    prevCallbacksRef.current.onSuggestionAutoWaiting !== onSuggestionAutoWaiting ||
    prevCallbacksRef.current.onSuggestionAutoTyping !== onSuggestionAutoTyping ||
    prevCallbacksRef.current.onSuggestionAutoSending !== onSuggestionAutoSending ||
    prevCallbacksRef.current.onSuggestionAutoCancelled !== onSuggestionAutoCancelled ||
    prevCallbacksRef.current.onActivityState !== onActivityState
  ) {
    callbacksRef.current = {
      onMessage,
      onSuggestion,
      onSuggestionGenerating,
      onSuggestionDisabled,
      onSuggestionAutoWaiting,
      onSuggestionAutoTyping,
      onSuggestionAutoSending,
      onSuggestionAutoCancelled,
      onActivityState,
    };
    prevCallbacksRef.current = callbacksRef.current;
  }

  // Limpiar timeout de reconexión
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Conectar WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setStatus('connecting');
    setLastError(null);
    clearReconnectTimeout();
    manualDisconnectRef.current = false;

    try {
      const connectWebSocket = () => {
        console.log('[WebSocket] Connecting to:', WS_URL);
        
        // Read from refs to avoid stale closures and unnecessary connect recreations
        const token = effectiveAuthTokenRef.current;
        const acctId = effectiveAccountIdRef.current;
        console.log('[WebSocket] 🎯 Token available:', !!token);
        console.log('[WebSocket] 🎯 Effective accountId for WebSocket:', acctId);
        
        // Construir URL con token y accountId como query parameters
        let wsUrl = WS_URL;
        const params = new URLSearchParams();
        
        if (token) {
          params.append('token', token);
          console.log('[WebSocket] 🔐 Connecting with token authentication');
        } else {
          console.log('[WebSocket] ⚠️ No token found, connecting without authentication');
        }
        
        if (acctId) {
          params.append('accountId', acctId);
          console.log('[WebSocket] 🎯 Connecting with selected account:', acctId);
        }
        
        if (params.toString()) {
          wsUrl = `${WS_URL}?${params.toString()}`;
        }
        
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!mountedRef.current) return;
          console.log('[WebSocket] Connected');
          setStatus('connected');
          reconnectAttemptsRef.current = 0; // Reset on successful connection
          setReconnectAttempts(0);
          setLastError(null);
          
          // Actualizar accountId actual
          currentAccountIdRef.current = acctId;
          currentAuthTokenRef.current = token;
          
          // Re-suscribir a relationships anteriores
          subscribedRelationshipsRef.current.forEach(relationshipId => {
            ws.send(JSON.stringify({ type: 'subscribe', relationshipId }));
          });

          // Re-suscribir a conversaciones anteriores
          subscribedConversationsRef.current.forEach(conversationId => {
            ws.send(JSON.stringify({ type: 'subscribe', conversationId }));
          });
        };

        ws.onmessage = (event) => {
          console.log('[WebSocket] Received message:', event.data);
          try {
            const message = JSON.parse(event.data) as WSMessage;
            setLastMessage(message);
            
            // Manejar tipos específicos (usar refs para callbacks estables)
            const {
              onMessage: onMsg,
              onSuggestion: onSug,
              onSuggestionGenerating: onGen,
              onSuggestionDisabled: onDis,
              onSuggestionAutoWaiting: onAutoWaiting,
              onSuggestionAutoTyping: onAutoTyping,
              onSuggestionAutoSending: onAutoSending,
              onSuggestionAutoCancelled: onAutoCancelled,
              onActivityState: onActivityStateCallback,
            } = callbacksRef.current;
            
            switch (message.type) {
              case 'suggestion:generating':
                onGen?.();
                break;
                
              case 'suggestion:ready':
                if (message.data && onSug) {
                  onSug(message.data as AISuggestion);
                }
                break;
                
              case 'suggestion:disabled':
                onDis?.(message.reason || 'Automation disabled');
                break;

              case 'suggestion:auto_waiting':
                if (message.suggestionId && message.delayMs && onAutoWaiting) {
                  onAutoWaiting({ suggestionId: message.suggestionId, delayMs: message.delayMs });
                }
                break;

              case 'suggestion:auto_typing':
                if (message.suggestionId && onAutoTyping) {
                  onAutoTyping({ suggestionId: message.suggestionId });
                }
                break;

              case 'suggestion:auto_sending':
                if (message.suggestionId && onAutoSending) {
                  onAutoSending({ suggestionId: message.suggestionId });
                }
                break;

              case 'suggestion:auto_cancelled':
                if (message.suggestionId && onAutoCancelled) {
                  onAutoCancelled({ suggestionId: message.suggestionId });
                }
                break;
              
              // FC-308: Handler para enrichment batch
              case 'enrichment:batch':
                if (message.data) {
                  const batch = message.data as EnrichmentBatch;
                  useEnrichmentStore.getState().processBatch(batch);
                }
                break;

              case 'ai:execution_blocked': {
                const blockedAccountId = message.data?.accountId;
                const currentAccountId = useUIStore.getState().selectedAccountId;
                // Only show toast to the account owner whose AI was blocked
                if (message.data?.block && blockedAccountId === currentAccountId) {
                  useUIStore.getState().pushToast({
                    type: 'warning',
                    title: 'IA no disponible',
                    description: message.data.block.message || 'No se pudo generar una respuesta de IA.',
                  });
                }
                return;
              }

              case 'user_activity_state':
                if (onActivityStateCallback) {
                  onActivityStateCallback({
                    accountId: message.data.accountId,
                    conversationId: message.data.conversationId,
                    activity: message.data.activity
                  });
                }
                return;

              case 'account:deleted': {
                const deletedAccountId = (message as any).accountId;
                if (typeof deletedAccountId === 'string' && deletedAccountId.length > 0) {
                  const selected = useUIStore.getState().selectedAccountId;

                  if (selected === deletedAccountId) {
                    Promise.resolve()
                      .then(() => clearAccountData(deletedAccountId))
                      .then(() => deleteAccountDatabase(deletedAccountId))
                      .finally(() => {
                        useUIStore.getState().resetAccountData();
                        useUIStore.getState().setSelectedAccount(null);
                        useUIStore.getState().setSelectedConversation(null);
                        useUIStore.getState().setActiveConversation(null);
                        useUIStore.getState().setActiveActivity('conversations');
                        usePanelStore.getState().resetLayout();
                      });
                  }

                  useUIStore.getState().pushToast({
                    type: 'success',
                    title: 'Cuenta eliminada',
                    description:
                      selected === deletedAccountId
                        ? 'Tus datos locales se limpiaron y la eliminación finalizó.'
                        : `La cuenta ${deletedAccountId} se eliminó correctamente.`,
                  });
                }
                onMsg?.(message);
                return;
              }
              
              default:
                onMsg?.(message);
            }
          } catch (e) {
            console.warn('[WebSocket] Failed to parse message:', e);
          }
        };

        ws.onclose = (event) => {
          if (!mountedRef.current) return;
          console.log('[WebSocket] Disconnected:', event.code, event.reason);
          setStatus('disconnected');
          setLastError(`WebSocket cerrado (${event.code})${event.reason ? `: ${event.reason}` : ''}`);
          wsRef.current = null;

          if (manualDisconnectRef.current) {
            return;
          }
          
          if (reconnect && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++;
            setReconnectAttempts(reconnectAttemptsRef.current);
            
            // 🆕 Mejorado: Exponential backoff con jitter para evitar tormenta de reconexiones
            const baseDelay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
            const jitter = Math.random() * 0.3 * baseDelay; // 30% de jitter
            const delay = Math.min(baseDelay + jitter, 30000); // Máximo 30 segundos
            
            console.log(`[WebSocket] 🔄 Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${Math.round(delay)}ms (base: ${baseDelay}ms, jitter: ${Math.round(jitter)}ms)`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connect();
              }
            }, delay);
          } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('[WebSocket] ⚠️ Max reconnect attempts reached. Giving up.');
            setStatus('error');
            setLastError('WebSocket: máximo de reintentos alcanzado');
          }
        };

        ws.onerror = () => {
          // Silenciar errores esperados durante reconexión
          // El evento onclose manejará la reconexión
          if (!mountedRef.current) return;
          // Solo loguear si no estamos en proceso de reconexión
          if (reconnectAttemptsRef.current === 0) {
            console.warn('[WebSocket] Connection error (will retry)');
          }
          setLastError('WebSocket: error de conexión');
        };

        wsRef.current = ws;
      };
      connectWebSocket();
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      setStatus('error');
      setLastError('WebSocket: no se pudo conectar');
    }
  }, [clearReconnectTimeout, reconnect, reconnectInterval]); // Stable: reads effectiveAccountId/Token from refs

  // Desconectar WebSocket
  const disconnect = useCallback(() => {
    console.trace('[WebSocket] ws.close() called from:');
    clearReconnectTimeout();
    manualDisconnectRef.current = true;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, [clearReconnectTimeout]);

  // Enviar mensaje
  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('[WebSocket] Cannot send message: not connected');
    return false;
  }, []);

  // Suscribirse a un relationship
  const subscribe = useCallback((relationshipId: string) => {
    subscribedRelationshipsRef.current.add(relationshipId);
    return send({ type: 'subscribe', relationshipId });
  }, [send]);

  // Desuscribirse de un relationship
  const unsubscribe = useCallback((relationshipId: string) => {
    subscribedRelationshipsRef.current.delete(relationshipId);
    return send({ type: 'unsubscribe', relationshipId });
  }, [send]);

  const subscribeConversation = useCallback((conversationId: string) => {
    subscribedConversationsRef.current.add(conversationId);
    return send({ type: 'subscribe', conversationId });
  }, [send]);

  const unsubscribeConversation = useCallback((conversationId: string) => {
    subscribedConversationsRef.current.delete(conversationId);
    return send({ type: 'unsubscribe', conversationId });
  }, [send]);

  // Solicitar sugerencia de IA
  const requestSuggestion = useCallback((params: {
    conversationId: string;
    accountId: string;
    relationshipId?: string;
  }) => {
    return send({
      type: 'request_suggestion',
      ...params,
    });
  }, [send]);

  // Aprobar sugerencia
  const approveSuggestion = useCallback((params: {
    conversationId: string;
    senderAccountId: string;
    suggestionId: string;
    suggestedText: string;
  }) => {
    return send({
      type: 'approve_suggestion',
      ...params,
    });
  }, [send]);

  // Descartar sugerencia
  const discardSuggestion = useCallback((suggestionId: string) => {
    return send({
      type: 'discard_suggestion',
      suggestionId,
    });
  }, [send]);

  // Enviar mensaje de chat
  const sendMessage = useCallback((params: {
    conversationId: string;
    senderAccountId: string;
    content: { text: string };
  }) => {
    return send({
      type: 'message',
      ...params,
    });
  }, [send]);

  // Ping/pong para mantener conexión
  const ping = useCallback(() => {
    return send({ type: 'ping' });
  }, [send]);

  const reportActivity = useCallback(
    (params: { conversationId: string; accountId: string; activity: string }) => {
      console.log('[DEBUG] Sending activity via WebSocket:', params);
      return send({
        type: 'user_activity',
        ...params,
      });
    },
    [send]
  );

  // Auto-conectar (solo una vez al montar)
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, []); // Empty deps - solo ejecutar una vez al montar

  useEffect(() => {
    if (!mountedRef.current) return;

    if (!autoConnect) {
      autoConnectEnabledRef.current = false;
      if (wsRef.current) {
        disconnect();
      }
      return;
    }

    if (!autoConnectEnabledRef.current) {
      autoConnectEnabledRef.current = true;
      currentAccountIdRef.current = effectiveAccountId;
      currentAuthTokenRef.current = effectiveAuthToken;
      connect();
    }
  }, [autoConnect, disconnect, effectiveAccountId, effectiveAuthToken]); // Removed connect to prevent reconnection loops

  // Reconectar automáticamente cuando cambia el accountId
  useEffect(() => {
    if (!autoConnect) return;
    if (effectiveAccountId !== currentAccountIdRef.current) {
      console.log('[WebSocket] Account changed, reconnecting...');
      disconnect();
      // Pequeña pausa para asegurar limpieza completa
      setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, 100);
    }
  }, [effectiveAccountId, disconnect, connect]);

  useEffect(() => {
    if (!autoConnect) return;
    if (effectiveAuthToken !== currentAuthTokenRef.current) {
      console.log('[WebSocket] Auth token changed, reconnecting...');
      disconnect();
      setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, 100);
    }
  }, [autoConnect, effectiveAuthToken, disconnect, connect]);

  // Ping periódico para mantener conexión
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      ping();
    }, pingInterval); // Use pingInterval option

    return () => clearInterval(interval);
  }, [status, ping, pingInterval]);

  useEffect(() => {
    console.log('[useWebSocket] Status changed to:', status, 'Error:', lastError);
  }, [status, lastError]);

  return {
    status,
    isConnected: status === 'connected',
    lastError,
    reconnectAttempts,
    lastMessage,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    subscribeConversation,
    unsubscribeConversation,
    requestSuggestion,
    approveSuggestion,
    discardSuggestion,
    sendMessage,
    ping,
    reportActivity,
  };
}
