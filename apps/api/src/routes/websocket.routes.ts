import { Elysia } from 'elysia';
import ws from '@elysiajs/websocket';
import { messageCore } from '../core/message-core';

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'message' | 'ping';
  relationshipId?: string;
  conversationId?: string;
  content?: any;
  senderAccountId?: string;
}

export const websocketRoutes = new Elysia()
  .use(ws())
  .ws('/ws', {
    message(ws: any, message: any) {
      try {
        const msg = message as WSMessage;
        switch (msg.type) {
          case 'subscribe':
            if (msg.relationshipId) {
              // Subscribe to relationship updates
              messageCore.subscribe(msg.relationshipId, (data) => {
                ws.send(JSON.stringify(data));
              });
              ws.send(JSON.stringify({ type: 'subscribed', relationshipId: msg.relationshipId }));
            }
            break;

          case 'unsubscribe':
            if (msg.relationshipId) {
              messageCore.unsubscribe(msg.relationshipId);
              ws.send(JSON.stringify({ type: 'unsubscribed', relationshipId: msg.relationshipId }));
            }
            break;

          case 'message':
            if (msg.conversationId && msg.content && msg.senderAccountId) {
              // Send message through MessageCore
              messageCore.send({
                conversationId: msg.conversationId,
                senderAccountId: msg.senderAccountId,
                content: msg.content,
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
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (error: any) {
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    },
    open(ws: any) {
      console.log('WebSocket connection opened');
      ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
    },
    close() {
      console.log('WebSocket connection closed');
    },
  });
