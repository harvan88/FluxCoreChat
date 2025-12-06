import { messageService } from '../services/message.service';
import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';
import type { MessageContent } from '@fluxcore/db';

export interface MessageEnvelope {
  id?: string;
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: 'incoming' | 'outgoing' | 'system';
  generatedBy?: 'human' | 'ai';
  timestamp?: Date;
}

export interface ReceiveResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * MessageCore - El corazón del sistema de mensajería
 * 
 * Responsabilidades:
 * 1. Recibir mensajes de cualquier fuente (adapter, UI)
 * 2. Persistir inmediatamente
 * 3. Notificar via WebSocket (delegado a NotificationService)
 * 4. Actualizar metadatos de conversación
 * 5. Actualizar última interacción en relationship
 * 
 * NO hace:
 * - Lógica de IA (eso es de extensiones)
 * - Orquestación compleja (eso es de extensiones)
 * - Validación de permisos (eso es middleware)
 */
export class MessageCore {
  private notificationCallbacks: Map<string, (data: any) => void> = new Map();

  /**
   * Recibe y procesa un mensaje
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

      // 2. Actualizar conversación
      const conversation = await conversationService.getConversationById(envelope.conversationId);
      if (conversation) {
        await conversationService.updateConversation(envelope.conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: envelope.content.text.substring(0, 500),
        });

        // 3. Actualizar última interacción en relationship
        await relationshipService.updateLastInteraction(conversation.relationshipId);

        // 4. Notificar via WebSocket
        this.broadcast(conversation.relationshipId, {
          event: 'message:new',
          data: {
            ...message,
            content: envelope.content,
          },
        });
      }

      return {
        success: true,
        messageId: message.id,
      };
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
    }
  }
}

export const messageCore = new MessageCore();
