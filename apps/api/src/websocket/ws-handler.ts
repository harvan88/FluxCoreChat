/**
 * WebSocket Handler usando Bun nativo
 * 
 * Este módulo implementa WebSocket sin depender de @elysiajs/websocket
 * ya que ese plugin no tiene versión compatible con Elysia 0.8.x
 */

import { messageCore } from '../core/message-core';

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'message' | 'ping';
  relationshipId?: string;
  conversationId?: string;
  content?: any;
  senderAccountId?: string;
}

// Store de conexiones activas por relationshipId
const subscriptions = new Map<string, Set<any>>();

export function handleWSMessage(ws: any, message: string | Buffer): void {
  try {
    const data = JSON.parse(message.toString()) as WSMessage;

    switch (data.type) {
      case 'subscribe':
        if (data.relationshipId) {
          // Agregar a subscripciones
          if (!subscriptions.has(data.relationshipId)) {
            subscriptions.set(data.relationshipId, new Set());
          }
          subscriptions.get(data.relationshipId)!.add(ws);
          
          // Registrar en MessageCore también
          messageCore.subscribe(data.relationshipId, (payload) => {
            broadcast(data.relationshipId!, payload);
          });
          
          ws.send(JSON.stringify({ 
            type: 'subscribed', 
            relationshipId: data.relationshipId 
          }));
        }
        break;

      case 'unsubscribe':
        if (data.relationshipId) {
          const subs = subscriptions.get(data.relationshipId);
          if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
              subscriptions.delete(data.relationshipId);
              messageCore.unsubscribe(data.relationshipId);
            }
          }
          ws.send(JSON.stringify({ 
            type: 'unsubscribed', 
            relationshipId: data.relationshipId 
          }));
        }
        break;

      case 'message':
        if (data.conversationId && data.content && data.senderAccountId) {
          messageCore.send({
            conversationId: data.conversationId,
            senderAccountId: data.senderAccountId,
            content: data.content,
            type: 'outgoing',
            generatedBy: 'human',
          }).then((result) => {
            if (result.success) {
              ws.send(JSON.stringify({ 
                type: 'message:sent', 
                messageId: result.messageId 
              }));
            } else {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: result.error 
              }));
            }
          });
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ 
          type: 'pong', 
          timestamp: new Date().toISOString() 
        }));
        break;

      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Unknown message type' 
        }));
    }
  } catch (error: any) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: error.message 
    }));
  }
}

export function handleWSOpen(ws: any): void {
  console.log('WebSocket connection opened');
  ws.send(JSON.stringify({ 
    type: 'connected', 
    timestamp: new Date().toISOString() 
  }));
}

export function handleWSClose(ws: any): void {
  console.log('WebSocket connection closed');
  // Limpiar subscripciones de este ws
  for (const [relationshipId, subs] of subscriptions.entries()) {
    if (subs.has(ws)) {
      subs.delete(ws);
      if (subs.size === 0) {
        subscriptions.delete(relationshipId);
        messageCore.unsubscribe(relationshipId);
      }
    }
  }
}

function broadcast(relationshipId: string, payload: any): void {
  const subs = subscriptions.get(relationshipId);
  if (subs) {
    const message = JSON.stringify(payload);
    for (const ws of subs) {
      try {
        ws.send(message);
      } catch (e) {
        // Connection might be closed
        subs.delete(ws);
      }
    }
  }
}

// Exportar para uso en servidor híbrido
export const wsConfig = {
  message: handleWSMessage,
  open: handleWSOpen,
  close: handleWSClose,
};
