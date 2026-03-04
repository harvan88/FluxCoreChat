import { messageService } from '../services/message.service';
import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';
import { conversationParticipantService } from '../services/conversation-participant.service';

import { coreEventBus } from './events';
import type { MessageEnvelope, ReceiveResult } from './types';

export { MessageEnvelope, ReceiveResult }; // Re-export para compatibilidad (opcional)

/**
 * MessageCore - El corazón del sistema de mensajería
 * 
 * Responsabilidades:
 * 1. Recibir mensajes de cualquier fuente (adapter, UI)
 * 2. Persistir inmediatamente
 * 3. Encolar certificación en outbox (garantiza entrega)
 * 4. Notificar via WebSocket (delegado a NotificationService)
 * 5. Actualizar metadatos de conversación
 * 6. Actualizar última interacción en relationship
 * 7. DELEGAR a ExtensionHost para procesamiento de extensiones (COR-001)
 * 
 * NO hace:
 * - Lógica de IA (eso es de extensiones)
 * - Orquestación compleja (eso es de extensiones)
 * - Validación de permisos (eso es middleware)
 * - Certificación directa (eso es del outbox worker)
 */
export class MessageCore {
  private relationshipNotificationCallbacks: Map<string, (data: any) => void> = new Map();
  private conversationNotificationCallbacks: Map<string, Set<(data: any) => void>> = new Map();
  // R-02.3: autoReplyQueue movida a MessageDispatchService (via Runtime Gateway)
  private conversations = new Map<string, { relationshipId: string | null; visitorToken?: string | null }>();
  private rooms: Map<string, any[]> = new Map();

  /**
   * Recibe y procesa un mensaje
   * COR-001: Ahora delega a ExtensionHost para que las extensiones procesen el mensaje
   * 🔥 NUEVO: Encola certificación en outbox para garantía de entrega
   */
  async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
    console.log(`[MessageCore] 🌍 INPUT ORIGINAL CON VERDAD DEL MUNDO:`);
    console.log(`📋 ENVELOPE COMPLETO:`, JSON.stringify(envelope, null, 2));
    console.log(`📋 META CON VERDAD:`, JSON.stringify(envelope.meta || {}, null, 2));
    console.log(`📋 CONTENT CON VERDAD:`, JSON.stringify(envelope.content, null, 2));
    
    try {
      // 1. Persistir mensaje
      console.log(`[MessageCore] 💾 GUARDANDO EN BASE DE DATOS CON META:`, JSON.stringify(envelope.meta || {}, null, 2));
      const message = await messageService.createMessage({
        conversationId: envelope.conversationId,
        senderAccountId: envelope.senderAccountId,
        content: envelope.content,
        type: envelope.type,
        generatedBy: envelope.generatedBy || 'human',
        metadata: envelope.meta || {} // 🔑 GUARDAR META COMPLETO CON VERDAD DEL MUNDO
      });
      console.log(`[MessageCore] ✅ MENSAJE GUARDADO CON ID: ${message.id}`);

      // 2. 🔥 NUEVO: Encolar para certificación si es mensaje humano
      if (envelope.generatedBy !== 'ai' && envelope.generatedBy !== 'system') {
        console.log(`[MessageCore] 🔍 PREPARANDO PARA ENCOLAR EN OUTBOX:`);
        console.log(`📋 ENVELOPE ANTES DE ENCOLAR:`, JSON.stringify(envelope, null, 2));
        
        // Importar dinámicamente para evitar dependencias circulares
        const { chatCoreOutboxService } = await import('../services/chatcore-outbox.service');
        
        // Encolar async (no bloquea respuesta)
        setImmediate(async () => {
          try {
            await chatCoreOutboxService.enqueue({
              messageId: message.id,
              accountId: envelope.targetAccountId || 'unknown', // 🔑 Usar targetAccountId con fallback
              userId: envelope.userId || envelope.senderAccountId,
              payload: envelope.content,
              meta: {
                ip: envelope.meta?.ip,
                userAgent: envelope.meta?.userAgent,
                clientTimestamp: envelope.meta?.clientTimestamp,
                conversationId: envelope.conversationId,
                requestId: envelope.meta?.requestId,
                messageId: message.id, // 🔑 Agregar messageId para vincular
                // 🔑 AGREGAR MÁS METADATA DE LA VERDAD DEL MUNDO
                origin: envelope.meta?.origin || 'unknown',
                driverId: envelope.meta?.driverId || 'chatcore/unknown',
                entryPoint: envelope.meta?.entryPoint || 'api/unknown',
                channel: envelope.meta?.channel || 'unknown', // 🔑 CHANNEL
                source: envelope.meta?.source || 'human', // 🔑 SOURCE
              }
            });
            console.log(`[MessageCore] ✅ ENCOLADO EN OUTBOX CON META COMPLETO`);
          } catch (error) {
            console.error('[MessageCore] Outbox enqueue failed:', error);
          }
        });
      }

      // 3. Actualizar conversación y obtener datos
      const conversation = await conversationService.getConversationById(envelope.conversationId);
      if (conversation) {
        this.registerConversation(conversation.id, {
          relationshipId: conversation.relationshipId,
          visitorToken: conversation.visitorToken,
        });
        const messageText = typeof envelope.content?.text === 'string' ? envelope.content.text : '';
        await conversationService.updateConversation(envelope.conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: messageText.substring(0, 500),
        });

        // 4. Actualizar última interacción en relationship
        if (conversation.relationshipId) {
          await relationshipService.updateLastInteraction(conversation.relationshipId);
        }

        // 5. Notificar via WebSocket
        if (conversation.relationshipId) {
          this.broadcastToRelationshipSubscribers(conversation.relationshipId, {
            type: 'message:new',
            data: {
              ...message,
              conversationId: envelope.conversationId,
              senderAccountId: envelope.senderAccountId,
              targetAccountId: envelope.targetAccountId, // 🔥 CRÍTICO: Incluir target para filtrado
              content: envelope.content,
            },
          });
        }

        this.broadcastToConversationSubscribers(envelope.conversationId, {
          type: 'message:new',
          data: {
            ...message,
            conversationId: envelope.conversationId,
            senderAccountId: envelope.senderAccountId,
            targetAccountId: envelope.targetAccountId, // 🔥 CRÍTICO: Incluir target para filtrado
            content: envelope.content,
          },
        });

        // 6. DELEGAR TODO A CONSUMIDORES (Desacoplado vía EventBus)
        // El núcleo solo emite el evento. FluxCore (IA) u otras extensiones
        // se "despertarán" escuchando este evento.
        const relationship = await relationshipService.getRelationshipById(conversation.relationshipId || '');
        if (relationship && relationship.accountAId) {
          const targetAccountId = envelope.targetAccountId ||
            (envelope.senderAccountId === relationship.accountAId
              ? relationship.accountBId
              : relationship.accountAId);
          envelope.targetAccountId = targetAccountId || 'unknown';
        }
      }

      const result: ReceiveResult = {
        success: true,
        messageId: message.id,
      };

      // R-02.1: Emitir evento para desacoplar lógica (IA, Analytics)
      console.log(`[FluxPipeline] 📩 RECV  conv=${envelope.conversationId.slice(0,7)} sender=${envelope.senderAccountId?.slice(0,7)} type=${envelope.type} by=${envelope.generatedBy||'human'} → target=${envelope.targetAccountId?.slice(0,7) ?? 'UNKNOWN'}`);
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
  subscribeToRelationship(relationshipId: string, callback: (data: any) => void) {
    this.relationshipNotificationCallbacks.set(relationshipId, callback);
  }

  subscribeToConversation(conversationId: string, callback: (data: any) => void) {
    const callbacks = this.conversationNotificationCallbacks.get(conversationId) ?? new Set();
    callbacks.add(callback);
    this.conversationNotificationCallbacks.set(conversationId, callbacks);
  }

  /**
   * Desregistra un callback
   */
  unsubscribeFromRelationship(relationshipId: string) {
    this.relationshipNotificationCallbacks.delete(relationshipId);
  }

  unsubscribeFromConversation(conversationId: string, callback: (data: any) => void) {
    const callbacks = this.conversationNotificationCallbacks.get(conversationId);
    if (!callbacks) return;
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      this.conversationNotificationCallbacks.delete(conversationId);
    }
  }

  /**
   * Broadcast a todos los subscriptores de una relación
   */
  private broadcastToRelationshipSubscribers(relationshipId: string, data: any) {
    const callback = this.relationshipNotificationCallbacks.get(relationshipId);
    if (callback) {
      callback(data);
    } else {
      console.warn(`[MessageCore] broadcast: no relationshipNotificationCallback for relationship ${relationshipId}`);
    }
  }

  private broadcastToConversationSubscribers(conversationId: string, data: any) {
    const callbacks = this.conversationNotificationCallbacks.get(conversationId);
    if (!callbacks || callbacks.size === 0) {
      return;
    }
    callbacks.forEach(cb => cb(data));
  }

  registerConversation(
    conversationId: string,
    metadata: { relationshipId: string | null; visitorToken?: string | null }
  ) {
    this.conversations.set(conversationId, {
      relationshipId: metadata.relationshipId,
      visitorToken: metadata.visitorToken,
    });
    console.log(
      `[MessageCore] Registered conversation ${conversationId} (relationship=${metadata.relationshipId ?? 'none'}, visitorToken=${metadata.visitorToken ?? 'none'})`
    );
  }

  /**
   * Emit a WebSocket-only notification for a conversation (no DB persistence).
   * Used for transient notifications like ai_blocked that should not be stored.
   * Looks up the relationshipId from DB if not cached in-memory.
   */
  async broadcastToConversation(conversationId: string, data: any) {
    const participants = await conversationParticipantService.getActiveParticipants(conversationId);

    this.broadcastToConversationSubscribers(conversationId, data);

    const { broadcastToRelationship, broadcastToVisitor } = await import('../websocket/ws-handler');

    for (const participant of participants) {
      if (participant.visitorToken) {
        broadcastToVisitor(participant.visitorToken, data);
      }
    }

    let conv = this.conversations.get(conversationId);
    if (!conv) {
      const conversation = await conversationService.getConversationById(conversationId);
      if (conversation) {
        conv = {
          relationshipId: conversation.relationshipId,
          visitorToken: conversation.visitorToken,
        };
        this.conversations.set(conversationId, conv);
      }
    }

    if (conv?.relationshipId) {
      broadcastToRelationship(conv.relationshipId, data);
    }
  }

  /**
   * Transmite estado de actividad a participantes
   */
  broadcastActivity(conversationId: string, payload: any) {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      if (conv.relationshipId) {
        this.broadcastToRelationshipSubscribers(conv.relationshipId, {
          type: 'user_activity_state',
          ...payload,
          conversationId,
        });
      }
      this.broadcastToConversationSubscribers(conversationId, {
        type: 'user_activity_state',
        ...payload,
        conversationId,
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

  /**
   * Recibe mensaje desde cualquier adapter externo (WhatsApp, Telegram, etc.)
   * Normaliza y delega a receive() existente para persistencia y certificación
   */
  async receiveFromAdapter(message: any, channel: string): Promise<ReceiveResult> {
    try {
      console.log(`[MessageCore] 📥 Receiving ${channel} message from ${message.from?.phone || message.from?.id || 'unknown'}`);
      
      // 1. Resolver conversación (existente o nueva)
      const conversationId = await this.resolveConversationForAdapter(message, channel);
      
      // 2. Resolver cuenta (existente, anónima, o nueva)
      const senderAccountId = await this.resolveAccountForAdapter(message.from, channel);
      
      // 3. Construir envelope estandar
      const envelope: MessageEnvelope = {
        conversationId,
        senderAccountId,
        targetAccountId: await this.resolveTargetAccount(conversationId),
        content: message.content,
        type: 'incoming',
        generatedBy: 'human',
        userId: senderAccountId, // 🔧 CORRECCIÓN: Usar siempre senderAccountId (UUID válido)
        meta: {
          ip: message.meta?.ip,
          userAgent: message.meta?.userAgent,
          clientTimestamp: message.timestamp,
        }
      };

      // 4. Delegar a receive() existente (persistencia + outbox + certificación)
      const result = await this.receive(envelope);
      
      console.log(`[MessageCore] ✅ Processed ${channel} message: ${result.messageId}`);
      return result;
      
    } catch (error) {
      console.error(`[MessageCore] ❌ Failed to process ${channel} message:`, error);
      throw error;
    }
  }

  private async resolveConversationForAdapter(message: any, channel: string): Promise<string> {
    // Para adapters externos, creamos conversación anónima inicialmente
    // El sistema la promoverá a relationship si se identifica el usuario
    const visitorToken = `visitor_${channel}_${message.externalId}`;
    
    try {
      const conversation = await conversationService.ensureConversation({
        visitorToken,
        channel: channel as 'web' | 'whatsapp' | 'telegram'
      });
      
      console.log(`[MessageCore] 📍 Resolved conversation: ${conversation.id} for visitor: ${visitorToken}`);
      return conversation.id;
    } catch (error) {
      console.error(`[MessageCore] ❌ Failed to resolve conversation:`, error);
      throw error;
    }
  }

  private async resolveAccountForAdapter(from: any, channel: string): Promise<string> {
    // Para adapters externos, usamos visitor token como cuenta provisional
    // El IdentityProjector promoverá a cuenta real si corresponde
    if (!from?.id) {
      // Usuario completamente anónimo
      return `visitor:${crypto.randomUUID()}`;
    }

    // Usuario con ID externo pero no registrado aún
    return `visitor_${channel}_${from.id}`;
  }

  private async resolveTargetAccount(conversationId: string): Promise<string | undefined> {
    // 🔑 CRÍTICO PARA FASE 2: Obtener targetAccountId desde conversation_participants
    // El target es la cuenta del negocio (role = 'recipient')
    try {
      const { conversationParticipantService } = await import('../services/conversation-participant.service');
      const recipient = await conversationParticipantService.getRecipient(conversationId);
      return recipient?.accountId;
    } catch (error) {
      console.error('[MessageCore] ❌ Error resolving target account:', error);
      return undefined;
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
