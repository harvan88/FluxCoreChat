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
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onSuggestion,
    onSuggestionGenerating,
    onSuggestionDisabled,
    autoConnect = true,
    reconnect = true,
    reconnectInterval = 3000,
  } = options;

  // Obtener accountId actual para reconexión automática
  const selectedAccountId = useUIStore((state) => state.selectedAccountId);

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedRelationshipsRef = useRef<Set<string>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const manualDisconnectRef = useRef(false);
  const mountedRef = useRef(true);
  const currentAccountIdRef = useRef<string | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 5;
  
  // Refs para callbacks estables (evitar loops de reconexión)
  const callbacksRef = useRef({ onMessage, onSuggestion, onSuggestionGenerating, onSuggestionDisabled });
  callbacksRef.current = { onMessage, onSuggestion, onSuggestionGenerating, onSuggestionDisabled };

  // Limpiar timeout de reconexión
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Conectar WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    setLastError(null);
    clearReconnectTimeout();
    manualDisconnectRef.current = false;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('[WebSocket] Connected');
        setStatus('connected');
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        setReconnectAttempts(0);
        setLastError(null);
        
        // Actualizar accountId actual
        currentAccountIdRef.current = useUIStore.getState().selectedAccountId;
        
        // Re-suscribir a relationships anteriores
        subscribedRelationshipsRef.current.forEach(relationshipId => {
          ws.send(JSON.stringify({ type: 'subscribe', relationshipId }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          setLastMessage(message);
          
          // Manejar tipos específicos (usar refs para callbacks estables)
          const { onMessage: onMsg, onSuggestion: onSug, onSuggestionGenerating: onGen, onSuggestionDisabled: onDis } = callbacksRef.current;
          
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
            
            // FC-308: Handler para enrichment batch
            case 'enrichment:batch':
              if (message.data) {
                const batch = message.data as EnrichmentBatch;
                useEnrichmentStore.getState().processBatch(batch);
              }
              break;
              
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
          const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoff
          console.log(`[WebSocket] Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.warn('[WebSocket] Max reconnect attempts reached. Giving up.');
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
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      setStatus('error');
      setLastError('WebSocket: no se pudo conectar');
    }
  }, [clearReconnectTimeout, reconnect, reconnectInterval]); // Callbacks ahora usan refs

  // Desconectar WebSocket
  const disconnect = useCallback(() => {
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

  // Auto-conectar (solo una vez al montar)
  useEffect(() => {
    mountedRef.current = true;
    
    if (autoConnect) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - solo ejecutar una vez al montar

  // Reconectar automáticamente cuando cambia el accountId
  useEffect(() => {
    if (selectedAccountId && selectedAccountId !== currentAccountIdRef.current) {
      console.log('[WebSocket] Account changed, reconnecting...');
      disconnect();
      // Pequeña pausa para asegurar limpieza completa
      setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, 100);
    }
  }, [selectedAccountId, disconnect, connect]);

  // Ping periódico para mantener conexión
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      ping();
    }, 30000); // Ping cada 30 segundos

    return () => clearInterval(interval);
  }, [status, ping]);

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
    requestSuggestion,
    approveSuggestion,
    discardSuggestion,
    sendMessage,
    ping,
  };
}
