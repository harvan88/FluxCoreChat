/**
 * HITO-WEBSOCKET-SUGGESTIONS: useWebSocket Hook
 * 
 * Hook para conexión WebSocket con soporte para sugerencias de IA.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AISuggestion } from '../components/extensions';
import type { EnrichmentBatch } from '../types/enrichments';
import { useEnrichmentStore } from '../store/enrichmentStore';

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

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedRelationshipsRef = useRef<Set<string>>(new Set());

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
    clearReconnectTimeout();

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setStatus('connected');
        
        // Re-suscribir a relationships anteriores
        subscribedRelationshipsRef.current.forEach(relationshipId => {
          ws.send(JSON.stringify({ type: 'subscribe', relationshipId }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          setLastMessage(message);
          
          // Manejar tipos específicos
          switch (message.type) {
            case 'suggestion:generating':
              onSuggestionGenerating?.();
              break;
              
            case 'suggestion:ready':
              if (message.data && onSuggestion) {
                onSuggestion(message.data as AISuggestion);
              }
              break;
              
            case 'suggestion:disabled':
              onSuggestionDisabled?.(message.reason || 'Automation disabled');
              break;
            
            // FC-308: Handler para enrichment batch
            case 'enrichment:batch':
              if (message.data) {
                const batch = message.data as EnrichmentBatch;
                useEnrichmentStore.getState().processBatch(batch);
              }
              break;
              
            default:
              onMessage?.(message);
          }
        } catch (e) {
          console.warn('[WebSocket] Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setStatus('disconnected');
        wsRef.current = null;
        
        // Intentar reconectar
        if (reconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WebSocket] Attempting to reconnect...');
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setStatus('error');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      setStatus('error');
    }
  }, [clearReconnectTimeout, reconnect, reconnectInterval, onMessage, onSuggestion, onSuggestionGenerating, onSuggestionDisabled]);

  // Desconectar WebSocket
  const disconnect = useCallback(() => {
    clearReconnectTimeout();
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

  // Auto-conectar
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

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
