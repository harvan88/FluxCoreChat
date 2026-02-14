import { messageService } from '../services/message.service';
import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';
import { logTrace } from '../utils/file-logger';

import { coreEventBus } from './events';
import type { MessageEnvelope, ReceiveResult } from './types';

export { MessageEnvelope, ReceiveResult }; // Re-export para compatibilidad (opcional)

/**
 * MessageCore - El corazón del sistema de mensajería
 * 
 * Responsabilidades:
 * 1. Recibir mensajes de cualquier fuente (adapter, UI)
 * 2. Persistir inmediatamente
 * 3. Notificar via WebSocket (delegado a NotificationService)
 * 4. Actualizar metadatos de conversación
 * 5. Actualizar última interacción en relationship
 * 6. DELEGAR a ExtensionHost para procesamiento de extensiones (COR-001)
 * 
 * NO hace:
 * - Lógica de IA (eso es de extensiones)
 * - Orquestación compleja (eso es de extensiones)
 * - Validación de permisos (eso es middleware)
 */
export class MessageCore {
  private notificationCallbacks: Map<string, (data: any) => void> = new Map();
  // R-02.3: autoReplyQueue movida a AIOrchestrator
  private conversations = new Map<string, { relationshipId: string }>();
  private rooms: Map<string, any[]> = new Map();

  /**
   * Recibe y procesa un mensaje
   * COR-001: Ahora delega a ExtensionHost para que las extensiones procesen el mensaje
   */
  async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
    try {
      // 1. Persistir mensaje
      const message = await messageService.createMessage({
        conversationId: envelope.conversationId,
        senderAccountId: envelope.senderAccountId,
        content: envelope.content,
        type: envelope.type,
        generatedBy: envelope.generatedBy || 'human',
      });

      // 2. Actualizar conversación y obtener datos
      const conversation = await conversationService.getConversationById(envelope.conversationId);
      if (conversation) {
        const messageText = typeof envelope.content?.text === 'string' ? envelope.content.text : '';
        await conversationService.updateConversation(envelope.conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: messageText.substring(0, 500),
        });

        // 3. Actualizar última interacción en relationship
        await relationshipService.updateLastInteraction(conversation.relationshipId);

        // 4. Notificar via WebSocket
        this.broadcast(conversation.relationshipId, {
          type: 'message:new',
          data: {
            ...message,
            conversationId: envelope.conversationId,
            senderAccountId: envelope.senderAccountId,
            content: envelope.content,
          },
        });

        // 5. DELEGAR TODO A CONSUMIDORES (Desacoplado vía EventBus)
        // El núcleo solo emite el evento. FluxCore (IA) u otras extensiones
        // se "despertarán" escuchando este evento.
        const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
        if (relationship) {
          const targetAccountId = envelope.targetAccountId ||
            (envelope.senderAccountId === relationship.accountAId
              ? relationship.accountBId
              : relationship.accountAId);
          envelope.targetAccountId = targetAccountId;
        }
      }

      const result: ReceiveResult = {
        success: true,
        messageId: message.id,
      };

      // R-02.1: Emitir evento para desacoplar lógica (IA, Analytics)
      const emitMsg = `[FluxCoreTrace] 📤 Emitting core:message_received for message ${message.id}. Target: ${envelope.targetAccountId}`;
      console.log(emitMsg);
      logTrace(emitMsg);
      coreEventBus.emit('core:message_received', { envelope, result });

      return result;
    } catch (error: any) {
      console.error('MessageCore.receive error:', error);
      return {
        success: false,
        error: error.message || 'Failed to receive message',
      };
    }
  }

  /**
   * Envía un mensaje (alias de receive para consistencia de API)
   */
  async send(envelope: MessageEnvelope): Promise<ReceiveResult> {
    return this.receive(envelope);
  }

  /**
   * Obtiene el historial de mensajes de una conversación
   */
  async getHistory(conversationId: string, limit = 50, offset = 0) {
    return await messageService.getMessagesByConversationId(conversationId, limit, offset);
  }

  /**
   * Registra un callback para notificaciones
   */
  subscribe(relationshipId: string, callback: (data: any) => void) {
    this.notificationCallbacks.set(relationshipId, callback);
  }

  /**
   * Desregistra un callback
   */
  unsubscribe(relationshipId: string) {
    this.notificationCallbacks.delete(relationshipId);
  }

  /**
   * Broadcast a todos los subscriptores de una relación
   */
  private broadcast(relationshipId: string, data: any) {
    const callback = this.notificationCallbacks.get(relationshipId);
    if (callback) {
      callback(data);
    } else {
      console.warn(`[MessageCore] broadcast: no notificationCallback for relationship ${relationshipId} (registered: ${[...this.notificationCallbacks.keys()].join(', ') || 'none'})`);
    }
  }

  registerConversation(conversationId: string, relationshipId: string) {
    this.conversations.set(conversationId, { relationshipId });
    console.log(`[MessageCore] Registered conversation ${conversationId} with relationship ${relationshipId}`);
  }

  /**
   * Emit a WebSocket-only notification for a conversation (no DB persistence).
   * Used for transient notifications like ai_blocked that should not be stored.
   * Looks up the relationshipId from DB if not cached in-memory.
   */
  async broadcastToConversation(conversationId: string, data: any) {
    let conv = this.conversations.get(conversationId);

    // If not cached, look up from DB and cache for future use
    if (!conv) {
      const conversation = await conversationService.getConversationById(conversationId);
      if (conversation?.relationshipId) {
        this.registerConversation(conversationId, conversation.relationshipId);
        conv = { relationshipId: conversation.relationshipId };
      }
    }

    if (conv) {
      // Use broadcastToRelationship directly (bypasses notificationCallbacks)
      // Dynamic import to avoid circular dependency (ws-handler imports message-core)
      const { broadcastToRelationship } = await import('../websocket/ws-handler');
      broadcastToRelationship(conv.relationshipId, data);
    } else {
      console.warn(`[MessageCore] broadcastToConversation: no relationship found for conversation ${conversationId}`);
    }
  }

  /**
   * Transmite estado de actividad a participantes
   */
  broadcastActivity(conversationId: string, payload: any) {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      this.broadcast(conv.relationshipId, {
        type: 'user_activity_state',
        ...payload,
        conversationId
      });
    } else {
      // Fallback: Broadcast to all connections in the conversation room
      console.warn(`[WARN] Broadcasting activity without registration for conversation ${conversationId}`);
      this.broadcastToRoom(conversationId, {
        type: 'user_activity_state',
        ...payload,
        conversationId
      });
    }
  }

  private broadcastToRoom(roomId: string, message: any) {
    const connections = this.rooms.get(roomId) || [];
    connections.forEach(conn => {
      conn.send(JSON.stringify(message));
    });
  }
}

export const messageCore = new MessageCore();
