# AUDITORÍA TÉCNICA DEL SISTEMA DE MENSAJES

**Fecha:** 2026-03-02T02:58:44.141Z
**Proyecto:** FluxCoreChat
**Total de archivos analizados:** 20

## 1. MessageCore

**Archivo:** `apps/api/src/core/message-core.ts`

**Código:**

```typescript
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

```

## 2. MessageService

**Archivo:** `apps/api/src/services/message.service.ts`

**Código:**

```typescript
import { db } from '@fluxcore/db';
import { messages, type MessageContent } from '@fluxcore/db';
import { desc, eq, lt, and } from 'drizzle-orm';
import { assetRelationsService } from './asset-relations.service';

export class MessageService {
  /**
   * Crear un mensaje
   */
  async createMessage(data: {
    conversationId: string;
    senderAccountId: string;
    content: MessageContent;
    type: 'incoming' | 'outgoing' | 'system';
    generatedBy?: 'human' | 'ai' | 'system';
    aiApprovedBy?: string;
    metadata?: Record<string, any>;
  }) {
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        senderAccountId: data.senderAccountId,
        content: data.content,
        type: data.type,
        generatedBy: data.generatedBy || 'human',
        aiApprovedBy: data.aiApprovedBy || null,
        metadata: data.metadata || {},
      })
      .returning();

    const mediaItems = Array.isArray(data.content?.media) ? data.content.media : [];
    const assetsToLink = mediaItems
      .map((media, index) => {
        const assetId = typeof media?.assetId === 'string' ? media.assetId : null;
        if (!assetId) {
          return null;
        }

        return { assetId, position: index };
      })
      .filter((item): item is { assetId: string; position: number } => item !== null);

    if (assetsToLink.length > 0) {
      await Promise.all(
        assetsToLink.map(({ assetId, position }) =>
          assetRelationsService.linkAssetToMessage({
            messageId: message.id,
            assetId,
            position,
            accountId: data.senderAccountId,
          })
        )
      );
    }

    return message;
  }

  async getMessageById(messageId: string) {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);

    return message || null;
  }

  async getMessagesByConversationId(conversationId: string, limit = 50, cursor?: Date) {
    const conditions = [eq(messages.conversationId, conversationId)];
    
    // 🆕 Cursor-based pagination: si hay cursor, obtener mensajes anteriores a esa fecha
    if (cursor) {
      conditions.push(lt(messages.createdAt, cursor));
    }
    
    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))  // ✅ Mostrar ÚLTIMOS mensajes primero
      .limit(limit);
  }

  async updateMessage(
    messageId: string,
    data: {
      content?: MessageContent;
      aiApprovedBy?: string;
    }
  ) {
    const [updated] = await db
      .update(messages)
      .set(data)
      .where(eq(messages.id, messageId))
      .returning();

    return updated;
  }

  async deleteMessage(messageId: string) {
    await db.delete(messages).where(eq(messages.id, messageId));
  }
}

export const messageService = new MessageService();

```

## 3. ConversationService

**Archivo:** `apps/api/src/services/conversation.service.ts`

**Código:**

```typescript
import { db } from '@fluxcore/db';
import { conversations, relationships, accounts, messages } from '@fluxcore/db';
import { eq, and, or, inArray } from 'drizzle-orm';
import { presentAccountWithAvatar } from '../utils/account-avatar.presenter';
import { conversationParticipantService } from './conversation-participant.service';

export class ConversationService {
  /**
   * Creates or retrieves a conversation based on criteria.
   * Supports both relationship-based (legacy/internal) and visitor-based (widget) conversations.
   */
  async ensureConversation(
    criteria: {
      relationshipId?: string;
      visitorToken?: string;
      channel: 'web' | 'whatsapp' | 'telegram';
    },
    tx?: any
  ) {
    const client = tx || db;
    const { relationshipId, visitorToken, channel } = criteria;

    if (relationshipId) {
      const rel = await client.query.relationships.findFirst({
        where: eq(relationships.id, relationshipId),
      });
      if (rel && rel.accountAId === rel.accountBId) {
        throw new Error(`[ConversationService] Ontological violation: relationship ${relationshipId} links the same account`);
      }
    }

    let whereClause;
    if (relationshipId) {
      whereClause = and(eq(conversations.relationshipId, relationshipId), eq(conversations.channel, channel));
    } else if (visitorToken) {
      whereClause = and(
        eq(conversations.visitorToken, visitorToken),
        eq(conversations.channel, channel)
      );
    } else {
      throw new Error('Invalid conversation criteria: must provide relationshipId OR visitorToken');
    }

    // Check existing
    const existing = await client
      .select()
      .from(conversations)
      .where(whereClause)
      .limit(1);

    if (existing.length > 0) {
      const conversation = existing[0];
      // TODO: Re-implementar cuando conversation_participants esté disponible
      // await conversationParticipantService.ensureParticipantsForConversation(conversation.id, client);
      return conversation;
    }

    // Create new
    const [conversation] = await client
      .insert(conversations)
      .values({
        relationshipId,
        visitorToken,
        channel,
      })
      .returning();

    // TODO: Re-implementar cuando conversation_participants esté disponible
    // await conversationParticipantService.ensureParticipantsForConversation(conversation.id);

    return conversation;
  }

  /**
   * @deprecated Use ensureConversation instead
   */
  async createConversation(relationshipId: string, channel: 'web' | 'whatsapp' | 'telegram', tx?: any) {
    return this.ensureConversation({ relationshipId, channel }, tx);
  }

  async getConversationById(conversationId: string) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    return conversation || null;
  }

  async getConversationsByRelationshipId(relationshipId: string) {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.relationshipId, relationshipId));
  }

  async getAllConversations(): Promise<Array<{ id: string; relationshipId: string | null }>> {
    return await db
      .select({ id: conversations.id, relationshipId: conversations.relationshipId })
      .from(conversations);
  }

  async updateConversation(
    conversationId: string,
    data: {
      status?: 'active' | 'archived' | 'closed';
      lastMessageAt?: Date;
      lastMessageText?: string;
    }
  ) {
    const [updated] = await db
      .update(conversations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    return updated;
  }

  /**
   * @deprecated - unread counts removed in ChatCore v1.3
   * Use conversation_participants for read status tracking
   */
  async incrementUnreadCount(conversationId: string, forAccountA: boolean) {
    console.warn('[ConversationService] incrementUnreadCount deprecated - conversation participants should be used');
    // No-op since columns were removed
  }

  /**
   * @deprecated - unread counts removed in ChatCore v1.3
   * Use conversation_participants for read status tracking
   */
  async resetUnreadCount(conversationId: string, forAccountA: boolean) {
    console.warn('[ConversationService] resetUnreadCount deprecated - conversation participants should be used');
    // No-op since columns were removed
  }

  /**
   * MA-101: Get conversations for a SPECIFIC account (not all user accounts)
   * This ensures proper isolation between accounts owned by the same user
   */
  async getConversationsByAccountId(accountId: string, ctx: { actorId: string }) {
    // 1. Get relationships where this specific account is involved
    const accountRelationships = await db
      .select()
      .from(relationships)
      .where(
        or(
          eq(relationships.accountAId, accountId),
          eq(relationships.accountBId, accountId)
        )
      );

    if (accountRelationships.length === 0) {
      return [];
    }

    // 2. Get conversations for those relationships
    const relationshipIds = accountRelationships.map((r) => r.id);

    const accountConversations = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.relationshipId, relationshipIds));

    // 3. Enrich with contact name (the OTHER account in the relationship)
    const enrichedConversations = await Promise.all(
      accountConversations.map(async (conv) => {
        const rel = accountRelationships.find(r => r.id === conv.relationshipId);
        if (!rel) return { ...conv, contactName: 'Desconocido' };

        // Find the OTHER account (not the current one)
        const otherAccountId = rel.accountAId === accountId
          ? rel.accountBId
          : rel.accountAId;

        const [otherAccount] = await db
          .select()
          .from(accounts)
          .where(eq(accounts.id, otherAccountId))
          .limit(1);

        const presentedAccount = otherAccount
          ? await presentAccountWithAvatar(otherAccount, { actorId: ctx.actorId })
          : null;

        return {
          ...conv,
          contactName: otherAccount?.displayName || 'Desconocido',
          contactAccountId: otherAccountId,
          contactAvatar: presentedAccount?.profile?.avatarUrl,
          contactProfile: presentedAccount?.profile ?? null,
        };
      })
    );

    return enrichedConversations;
  }

  /**
   * Get all conversations for a user (via their accounts and relationships)
   * Returns conversations enriched with contact name
   * @deprecated Use getConversationsByAccountId for proper account isolation
   */
  async getConversationsByUserId(userId: string, ctx: { actorId: string }) {
    // 1. Get all accounts owned by this user
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.ownerUserId, userId));

    if (userAccounts.length === 0) {
      return [];
    }

    const accountIds = userAccounts.map((a) => a.id);

    // 2. Get all relationships where user's accounts are involved
    const userRelationships = await db
      .select()
      .from(relationships)
      .where(
        or(
          inArray(relationships.accountAId, accountIds),
          inArray(relationships.accountBId, accountIds)
        )
      );

    if (userRelationships.length === 0) {
      return [];
    }

    // 3. Get all conversations for those relationships
    const relationshipIds = userRelationships.map((r) => r.id);

    const userConversations = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.relationshipId, relationshipIds));

    // 4. Enrich with contact name
    const enrichedConversations = await Promise.all(
      userConversations.map(async (conv) => {
        const rel = userRelationships.find(r => r.id === conv.relationshipId);
        if (!rel) return { ...conv, contactName: 'Desconocido' };

        // Find the OTHER account (not the user's)
        const otherAccountId = accountIds.includes(rel.accountAId)
          ? rel.accountBId
          : rel.accountAId;

        const [otherAccount] = await db
          .select()
          .from(accounts)
          .where(eq(accounts.id, otherAccountId))
          .limit(1);

        const presentedAccount = otherAccount
          ? await presentAccountWithAvatar(otherAccount, { actorId: ctx.actorId })
          : null;

        return {
          ...conv,
          contactName: otherAccount?.displayName || 'Desconocido',
          contactAccountId: otherAccountId,
          contactAvatar: presentedAccount?.profile?.avatarUrl,
          contactProfile: presentedAccount?.profile ?? null,
        };
      })
    );

    return enrichedConversations;
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string, userId: string) {
    // Get conversation
    const conversation = await this.getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get the relationship to verify ownership
    if (!conversation.relationshipId) {
      throw new Error('Conversation is not linked to a relationship');
    }

    const [rel] = await db
      .select()
      .from(relationships)
      .where(eq(relationships.id, conversation.relationshipId))
      .limit(1);

    if (!rel) {
      throw new Error('Relationship not found');
    }

    // Verify user owns one of the accounts in the relationship
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.ownerUserId, userId));

    const userAccountIds = userAccounts.map(a => a.id);
    const isOwner = userAccountIds.includes(rel.accountAId) || userAccountIds.includes(rel.accountBId);

    if (!isOwner) {
      throw new Error('Not authorized to delete this conversation');
    }

    // Delete all messages in the conversation
    await db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId));

    // Delete the conversation
    await db
      .delete(conversations)
      .where(eq(conversations.id, conversationId));

    console.log(`[ConversationService] Deleted conversation ${conversationId} and all messages`);
  }
}

export const conversationService = new ConversationService();

```

## 4. Conversations Routes

**Archivo:** `apps/api/src/routes/conversations.routes.ts`

**Código:**

```typescript
import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { conversationService } from '../services/conversation.service';

export const conversationsRoutes = new Elysia({ prefix: '/conversations' })
  .use(authMiddleware)
  // GET /conversations - Listar conversaciones (filtradas por accountId si se provee)
  .get(
    '/',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { accountId } = query;

        // MA-102: Si se provee accountId, filtrar por esa cuenta específica
        if (accountId) {
          // MA-105: Verificar que el accountId pertenece al usuario
          const { accountService } = await import('../services/account.service');
          const userAccounts = await accountService.getAccountsByUserId(user.id);
          const userAccountIds = userAccounts.map(a => a.id);

          if (!userAccountIds.includes(accountId)) {
            set.status = 403;
            return { success: false, message: 'Account does not belong to user' };
          }

          const conversations = await conversationService.getConversationsByAccountId(accountId, { actorId: user.id });
          return { success: true, data: conversations };
        }

        // Fallback: devolver todas las conversaciones del usuario (deprecated behavior)
        const conversations = await conversationService.getConversationsByUserId(user.id, { actorId: user.id });
        return { success: true, data: conversations };
      } catch (error: any) {
        console.error('[API] Error loading conversations:', error);
        set.status = 500;
        return { success: false, message: 'Error al cargar conversaciones', error: error.message };
      }
    },
    {
      isAuthenticated: true,
      query: t.Object({
        accountId: t.Optional(t.String()),
      }),
      detail: { tags: ['Conversations'], summary: 'List conversations for account' },
    }
  )
  .post(
    '/',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const conversation = await conversationService.ensureConversation({
          relationshipId: body.relationshipId,
          channel: body.channel,
        });
        return { success: true, data: conversation };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        relationshipId: t.String(),
        channel: t.Union([t.Literal('web'), t.Literal('whatsapp'), t.Literal('telegram')]),
      }),
      detail: { tags: ['Conversations'], summary: 'Create conversation' },
    }
  )
  .get(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const conversation = await conversationService.getConversationById(params.id);
      if (!conversation) {
        set.status = 404;
        return { success: false, message: 'Conversation not found' };
      }

      return { success: true, data: conversation };
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Conversations'], summary: 'Get conversation by ID' },
    }
  )
  .get(
    '/:id/messages',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');
        const limit = parseInt(query.limit || '50');
        
        // 🆕 Cursor-based pagination: usar cursor en lugar de offset
        const cursor = query.cursor ? new Date(query.cursor) : undefined;
        
        console.log(`[ConversationsRoute] 🆕 CURSOR PAGINATION: limit=${limit}, cursor=${cursor}`);
        
        const messages = await messageService.getMessagesByConversationId(params.id, limit, cursor);
        
        // 🆕 Devolver el cursor del último mensaje para la siguiente página
        const nextCursor = messages.length > 0 ? messages[messages.length - 1].createdAt : null;
        
        return { 
          success: true, 
          data: messages,
          meta: {
            nextCursor: nextCursor,
            hasMore: messages.length === limit
          }
        };
      } catch (error: any) {
        console.error('[API] Error loading messages:', error);
        set.status = 500;
        return { success: false, message: 'Error al cargar mensajes', error: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      query: t.Object({
        limit: t.Optional(t.String()),
        cursor: t.Optional(t.String()),
      }),
      detail: { tags: ['Conversations'], summary: 'Get conversation messages' },
    }
  )
  .patch(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const updated = await conversationService.updateConversation(params.id, body);
        return { success: true, data: updated };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Optional(t.Union([t.Literal('active'), t.Literal('archived'), t.Literal('closed')])),
      }),
      detail: { tags: ['Conversations'], summary: 'Update conversation' },
    }
  )
  .delete(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        await conversationService.deleteConversation(params.id, user.id);
        return { success: true, message: 'Conversation deleted' };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Conversations'], summary: 'Delete conversation and its messages' },
    }
  );

```

## 5. Messages Routes

**Archivo:** `apps/api/src/routes/messages.routes.ts`

**Código:**

```typescript
import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { extensionHost } from '../services/extension-host.service';
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';

export const messagesRoutes = new Elysia({ prefix: '/messages' })
  .use(authMiddleware)
  .post(
    '/',
    async ({ user, body, set, request }) => {
      const typedBody: any = body as any;
      console.log(`[MessagesRoute] 📥 Incoming POST /messages request from user: ${user?.id}`, {
        hasText: !!typedBody.content?.text,
        mediaCount: typedBody.content?.media?.length || 0
      });

      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        // ═══════════════════════════════════════════════════════════════
        // ARQUITECTURA CORRECTA:
        // ChatCore persiste primero, luego certifica async con outbox
        // FluxCore es reactivo, no controlador del mundo humano
        // ═══════════════════════════════════════════════════════════════
        
        // 🔑 AGREGAR VERDAD DEL MUNDO AL INPUT ORIGINAL
        const userAgent = request.headers.get('user-agent');
        const origin = request.headers.get('origin');
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
        
        // Construir meta con la verdad del mundo del input HTTP
        const enrichedBody = {
          ...typedBody,
          meta: {
            ...typedBody.meta,
            ip: ip,
            userAgent: userAgent,
            origin: origin || 'unknown',
            clientTimestamp: new Date().toISOString(),
            requestId: `msg-${Date.now()}-${user?.id}`,
            // 🔑 INFERIR CHANNEL DESDE EL INPUT HTTP
            channel: userAgent?.includes('Mobile') ? 'mobile' : 
                   userAgent?.includes('Tablet') ? 'tablet' : 
                   origin?.includes('localhost') ? 'web' : 'unknown'
          }
        };
        
        // 🔒 SECURITY: Resolver account desde user autenticado
        // El JWT contiene user.id, pero necesitamos el account.id correspondiente
        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));
        
        if (userAccounts.length === 0) {
          set.status = 403;
          return { success: false, message: 'User has no accounts' };
        }
        
        // 🎯 USAR LA PRIMERA CUENTA DEL USUARIO (o implementar lógica de selección)
        const senderAccountId = userAccounts[0].id;
        
        // 🆕 Idempotency: Verificar si ya existe este requestId
        const requestId = enrichedBody.requestId || `msg-${Date.now()}-${senderAccountId}`;
        
        console.log(`[MessagesRoute] 🔒 AUTHENTICATED USER: ${user.id}`);
        console.log(`[MessagesRoute] 🔒 RESOLVED ACCOUNT: ${senderAccountId}`);
        console.log(`[MessagesRoute] 🆕 REQUEST ID: ${requestId}`);
        console.log(`[MessagesRoute] 🌍 INPUT CON VERDAD DEL MUNDO ENRIQUECIDO:`, {
          hasMeta: !!enrichedBody.meta,
          channel: enrichedBody.meta?.channel,
          origin: enrichedBody.meta?.origin,
          userAgent: enrichedBody.meta?.userAgent,
          authenticatedUser: user.id,
          resolvedAccount: senderAccountId,
          bodySender: enrichedBody.senderAccountId, // Para debugging de suplantación
          requestId: requestId
        });
        
        let receiverAccountId = senderAccountId; // Usar sender autenticado como fallback
        
        // Resolver RECEPTOR desde la conversación
        const conversation = await conversationService.getConversationById(enrichedBody.conversationId);
        if (conversation?.relationshipId) {
          const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
          if (relationship) {
            // El receptor es la OTRA cuenta en la relación
            receiverAccountId = relationship.accountAId === senderAccountId
              ? relationship.accountBId
              : relationship.accountAId;
          }
        }
        
        // 1️⃣ CHATCORE PERSISTE PRIMERO (soberanía del mundo conversacional)
        const { messageCore } = await import('../core/message-core');
        const result = await messageCore.receive({
          conversationId: enrichedBody.conversationId,
          senderAccountId: senderAccountId, // 🔒 Siempre del JWT autenticado
          content: enrichedBody.content,
          type: enrichedBody.type || 'incoming',
          generatedBy: 'human',
          targetAccountId: receiverAccountId,
          meta: enrichedBody.meta // 🔑 PASAR LA VERDAD DEL MUNDO COMPLETA
        });

        // 2️⃣ CERTIFICACIÓN ASÍNCRONA CON OUTBOX (no bloquea respuesta)
        // ✅ Ya no se necesita aquí porque message-core ya encola con el account_id correcto

        // 3️⃣ RETORNAR RESULTADO PERSISTIDO (UI inmediata)
        return { success: true, data: result };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        conversationId: t.String(),
        // 🔒 SECURITY: senderAccountId eliminado - siempre viene del JWT autenticado
        content: t.Object({
          text: t.Optional(t.String()),
          media: t.Optional(t.Array(t.Any())),
          location: t.Optional(t.Any()),
          buttons: t.Optional(t.Array(t.Any())),
        }),
        type: t.Optional(t.Union([t.Literal('incoming'), t.Literal('outgoing'), t.Literal('system')])),
        generatedBy: t.Optional(t.Union([t.Literal('human'), t.Literal('ai')])),
        replyToId: t.Optional(t.String()),
        // 🆕 Idempotency key para prevenir duplicados
        requestId: t.Optional(t.String()),
      }),
      detail: { tags: ['Messages'], summary: 'Send message' },
    }
  )
  .get(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const { messageService } = await import('../services/message.service');
      const message = await messageService.getMessageById(params.id);

      if (!message) {
        set.status = 404;
        return { success: false, message: 'Message not found' };
      }

      return { success: true, data: message };
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Messages'], summary: 'Get message by ID' },
    }
  )
  // V2-3: PATCH - Editar mensaje
  .patch(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');

        // 🔒 SECURITY: Verificar que el mensaje existe y pertenece al usuario autenticado
        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        // 🔒 SECURITY: Verificar ownership del mensaje
        // NOTA: message.senderAccountId es un account.id, no user.id
        // Necesitamos verificar que el user.id autenticado es owner del account
        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));
        
        const userAccountIds = userAccounts.map(acc => acc.id);
        if (!userAccountIds.includes(message.senderAccountId)) {
          console.log(`[MessagesRoute] 🔒 UNAUTHORIZED EDIT ATTEMPT: user=${user.id}, messageOwner=${message.senderAccountId}, userAccounts=${userAccountIds.join(',')}, messageId=${params.id}`);
          set.status = 403;
          return { success: false, message: 'Unauthorized: You can only edit your own messages' };
        }

        const existingContent = message.content as any;
        const isFluxCoreBranded = existingContent?.__fluxcore?.branding === true;

        const typedBody: any = body as any;
        let nextContent: any = typedBody.content;
        if (isFluxCoreBranded && typeof nextContent?.text === 'string') {
          nextContent = {
            ...nextContent,
            text: extensionHost.appendFluxCoreBrandingFooter(nextContent.text),
            __fluxcore: existingContent.__fluxcore,
          };
        }

        // Actualizar mensaje
        const updated = await messageService.updateMessage(params.id, {
          content: nextContent,
        });

        return { success: true, data: updated };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        content: t.Object({
          text: t.String(),
        }),
      }),
      detail: { tags: ['Messages'], summary: 'Edit message' },
    }
  )
  // V2-3: DELETE - Eliminar mensaje
  .delete(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');

        // 🔒 SECURITY: Verificar que el mensaje existe y pertenece al usuario autenticado
        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        // 🔒 SECURITY: Verificar ownership del mensaje
        // NOTA: message.senderAccountId es un account.id, no user.id
        // Necesitamos verificar que el user.id autenticado es owner del account
        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));
        
        const userAccountIds = userAccounts.map(acc => acc.id);
        if (!userAccountIds.includes(message.senderAccountId)) {
          console.log(`[MessagesRoute] 🔒 UNAUTHORIZED DELETE ATTEMPT: user=${user.id}, messageOwner=${message.senderAccountId}, userAccounts=${userAccountIds.join(',')}, messageId=${params.id}`);
          set.status = 403;
          return { success: false, message: 'Unauthorized: You can only delete your own messages' };
        }

        // Eliminar mensaje (soft delete o hard delete)
        await messageService.deleteMessage(params.id);

        return { success: true, data: { deleted: true } };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Messages'], summary: 'Delete message' },
    }
  );

```

## 6. MessageDispatchService

**Archivo:** `apps/api/src/services/message-dispatch.service.ts`

**Código:**

```typescript

import { coreEventBus } from '../core/events';
import { messageCore } from '../core/message-core';
import type { MessageEnvelope, ReceiveResult } from '../core/types';
import { logTrace } from '../utils/file-logger';
import { fluxPolicyContextService } from './flux-policy-context.service';
import type { ExecutionAction } from './runtime-gateway.service';
import { runtimeGateway } from './runtime-gateway.service';
import { extensionHost } from './extension-host.service';
import { featureFlags } from '../config/feature-flags';
import { db, fluxcoreCognitionQueue } from '@fluxcore/db';
import { sql } from 'drizzle-orm';
import { accountLabelService } from './account-label.service';

/**
 * MessageDispatchService — backend como transporte sin agencia.
 * Recibe eventos del Core, resuelve PolicyContext y delega TODO al runtime.
 * El backend solo ejecuta side-effects explícitos retornados por el runtime.
 */
class MessageDispatchService {
    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        coreEventBus.on('core:message_received', (payload) => {
            this.handleMessageReceived(payload).catch((err) =>
                console.error('[MessageDispatch] Error handling message:', err)
            );
        });

        console.log('[MessageDispatch] Service initialized and listening');
    }

    private async handleMessageReceived(payload: { envelope: MessageEnvelope; result: ReceiveResult }) {
        const { envelope, result } = payload;

        console.log(`[MessageDispatch] 🎬 handleMessageReceived called: conv=${envelope.conversationId.slice(0,7)}, success=${result.success}, msgId=${result.messageId?.slice(0,8)}`);
        
        // 🔍 LOG DEL INPUT INJECTADO POR FLUXCORE
        console.log(`[MessageDispatch] 🌍 INPUT INJECTADO POR FLUXCORE:`);
        console.log(`📋 ENVELOPE COMPLETO:`, JSON.stringify(envelope, null, 2));
        console.log(`📋 META DEL ENVELOPE:`, JSON.stringify(envelope.meta || {}, null, 2));
        console.log(`📋 CONTENT DEL ENVELOPE:`, JSON.stringify(envelope.content, null, 2));

        if (!result.success || !result.messageId) {
            console.log(`[MessageDispatch] ⏭️  SKIP: result not successful or no messageId`);
            return; // AI-generated or typing — no re-dispatch
        }

        envelope.id = result.messageId;

        const targetAccountId = envelope.targetAccountId;
        const targetLabel = await accountLabelService.getLabel(targetAccountId || '');
        const safeTargetId = targetAccountId ? targetAccountId.slice(0, 7) : 'NONE';
        console.log(`[MessageDispatch] 🎯 targetAccount: ${targetLabel} (${safeTargetId})`);
        if (!targetAccountId) {
            console.log(`[MessageDispatch] ⏭️  SKIP: No targetAccountId`);
            return; // No target (AI emission without target) — skip
        }

        const { conversationService } = await import('./conversation.service');
        const conversation = await conversationService.getConversationById(envelope.conversationId);
        if (!conversation) {
            console.log(`❌ [MessageDispatch] ABORT: Conversation ${envelope.conversationId} not found.`);
            return;
        }

        // 🛡️ PROTECTION: Skip AI processing for internal/self channels
        // 🔑 USAR ROUTING DEFINIDO POR CHATCORE WORLD DEFINER
        // Nota: worldContext vendría de conversation.meta si está disponible
        const routing = { requiresAi: true, skipProcessing: false }; // Temporal hasta que worldContext esté en conversation
        
        if (routing.skipProcessing || conversation.channel === 'internal' || conversation.channel === 'test') {
            console.log(`[MessageDispatch] ⏭️  SKIP AI: channel=${conversation.channel}, routing.skipProcessing=${routing.skipProcessing} (WorldDefiner decision)`);
            return;
        }

        // 🛡️ PROTECTION: Skip AI if sender and target are the same (self-conversation)
        if (envelope.senderAccountId === targetAccountId) {
            console.log(`[MessageDispatch] ⏭️  SKIP AI: Self-conversation detected (sender=target=${targetAccountId.slice(0,7)})`);
            return;
        }

        // ChatProjector is the only component allowed to enqueue cognition turns per Canon v8.3.
        console.log(`[MessageDispatch] 🔍 NEW_ARCH=${featureFlags.fluxNewArchitecture}, conv=${envelope.conversationId.slice(0,7)}, target=${targetAccountId.slice(0,7)}`);

        const policyContext = await fluxPolicyContextService.resolve({
            accountId: targetAccountId, // 🔑 targetAccountId correcto desde resolveTargetAccount
            conversationId: envelope.conversationId,
            relationshipId: conversation.relationshipId ?? undefined,
            // 🔑 NO especificar channel - dejar que FluxPolicyContext lo resuelva
        });

        console.log(`[MessageDispatch] 🌍 POLICY CONTEXT RESUELTO POR FLUXCORE:`);
        console.log(`📋 POLICY CONTEXT COMPLETO:`, JSON.stringify(policyContext, null, 2));
        console.log(`📋 CHANNEL RESUELTO:`, policyContext.channel);
        console.log(`📋 SOURCE RESUELTO:`, policyContext.source);

        logTrace('[MessageDispatch] PolicyContext resolved.');

        if (!featureFlags.fluxNewArchitecture) {
            // 1. Extension Host Processing (Interceptors/Middleware)
            logTrace('[MessageDispatch] Invoking Extension Host (legacy path)...');
            const extensionResults = await extensionHost.processMessage({
                accountId: targetAccountId,
                relationshipId: conversation.relationshipId || '',
                conversationId: envelope.conversationId,
                message: {
                    id: envelope.id,
                    content: envelope.content,
                    type: envelope.type,
                    senderAccountId: envelope.senderAccountId,
                },
                policyContext,
                automationMode: result.automation?.mode,
            });

            // Execute actions from extensions
            let stopped = false;
            for (const res of extensionResults) {
                if (res.actions && res.actions.length > 0) {
                    logTrace(`[MessageDispatch] Executing actions from extension ${res.extensionId}`);
                    await this.executeActions(res.actions);
                }
                if (res.stopPropagation) {
                    logTrace(`[MessageDispatch] Propagation stopped by extension ${res.extensionId}`);
                    stopped = true;
                }
            }

            if (stopped) {
                return;
            }

            // 2. Runtime Gateway (Legacy Final Handler)
            logTrace('[MessageDispatch] Delegating to Runtime Gateway (legacy path).');
            const executionResult = await runtimeGateway.handleMessage({
                envelope,
                policyContext,
            });

            await this.executeActions(executionResult.actions || []);

            // Legacy path handles everything
            return;
        }

        // NEW_ARCH=true: CognitionWorker handles runtime invocation.
        logTrace('[MessageDispatch] NEW_ARCH active — runtime handled by CognitionWorker.');
    }

    private async executeActions(actions: ExecutionAction[]) {
        for (const action of actions) {
            await this.executeAction(action).catch((err) => {
                console.error('[MessageDispatch] Failed to execute action:', action.type, err);
            });
        }
    }

    private async executeAction(action: ExecutionAction) {
        switch (action.type) {
            case 'send_message': {
                await messageCore.send({
                    conversationId: action.payload.conversationId,
                    senderAccountId: action.payload.senderAccountId,
                    content: action.payload.content,
                    type: 'outgoing',
                    generatedBy: action.payload.generatedBy,
                    targetAccountId: action.payload.targetAccountId,
                });
                return;
            }
            case 'broadcast_event': {
                await messageCore.broadcastToConversation(
                    action.payload.conversationId,
                    action.payload.event,
                );
                return;
            }
            case 'propose_work': {
                const { workEngineService } = await import('./work-engine.service');
                const proposed = await workEngineService.proposeWork({
                    accountId: action.payload.accountId,
                    conversationId: action.payload.conversationId,
                    traceId: action.payload.proposal.traceId,
                    workDefinitionId: action.payload.proposal.workDefinitionId,
                    intent: action.payload.proposal.intent,
                    candidateSlots: action.payload.proposal.candidateSlots,
                    confidence: action.payload.proposal.confidence,
                    modelInfo: action.payload.proposal.modelInfo,
                });
                if (action.payload.openWork) {
                    await workEngineService.openWork(action.payload.accountId, proposed.id);
                }
                return;
            }
            case 'send_template': {
                const { aiTemplateService } = await import('./ai-template.service');
                await aiTemplateService.sendAuthorizedTemplate({
                    accountId: action.payload.accountId,
                    conversationId: action.payload.conversationId,
                    templateId: action.payload.templateId,
                    variables: action.payload.variables,
                });
                return;
            }
            case 'no_action':
                return;
            default:
                console.warn('[MessageDispatch] Unknown action type', (action as any)?.type);
        }
    }

    public init() {
        console.log('[MessageDispatch] Explicit initialization called');
    }
}

export const messageDispatchService = new MessageDispatchService();

```

## 7. AI Service

**Archivo:** `apps/api/src/services/ai.service.ts`

**Código:**

```typescript
/**
 * AI Service - Integra la extensión @fluxcore/asistentes con el sistema
 * 
 * Gestiona:
 * - Generación de sugerencias de IA
 * - Cola de respuestas automáticas
 * - Eventos WebSocket para sugerencias
 */

import { db } from '@fluxcore/db';
import { accounts, messages, conversations, relationships, extensionInstallations } from '@fluxcore/db';
import type { FluxPolicyContext } from '@fluxcore/db';
import { and, eq } from 'drizzle-orm';
import { manifestLoader } from './manifest-loader.service';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { aiEntitlementsService, type AIProviderId } from './ai-entitlements.service';
import { creditsService } from './credits.service';
import { resolveExecutionPlan } from './ai-execution-plan.service';
import type { GenerateResponseResult, EligiblePlan } from './ai-execution-plan';
import { stripFluxCorePromoMarker as _stripPromo, appendFluxCoreBrandingFooter as _appendBranding, getSuggestionBrandingDecision as _brandingDecision } from './ai-branding.service';
import { suggestionStore } from './ai-suggestion-store';
import { aiTraceService } from './ai-trace.service';
import { buildContext as _buildContext } from './ai-context.service';
import { aiRateLimiter } from './ai-rate-limiter.service';

type AISuggestion = {
  id: string;
  conversationId: string;
  accountId?: string;
  content: string;
  generatedAt: Date;
  model: string;
  traceId?: string;
  provider?: 'groq' | 'openai';
  baseUrl?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  proposedWork?: {
    workDefinitionId: string;
    intent: string;
    candidateSlots: Array<{ path: string; value: any; evidence: string }>;
    confidence: number;
    traceId: string;
  };
  attempts?: any[];
  toolUse?: any;
  toolsUsed?: any[];
  promptDebug?: any;
};

type MessageEvent = {
  messageId: string;
  conversationId: string;
  senderAccountId: string;
  recipientAccountId: string;
  content: string;
  messageType: string;
  createdAt: Date;
};

type ContextData = any;

export interface AIServiceConfig {
  defaultEnabled: boolean;
  defaultMode: 'suggest' | 'auto' | 'off';
  defaultResponseDelay: number;
}

class AIService {
  private wsEmitter?: (event: string, data: any) => void;
  private probeClients: Map<string, any> = new Map();
  private fluxcoreModulePromise: Promise<any> | null = null;
  private fluxcoreExtensionPromise: Promise<any> | null = null;
  private fluxcoreExtension: any | null = null;
  private readonly FLUXCORE_USERNAME = 'fluxcore';

  constructor() {
    // Wire up trace service with extension loader
    aiTraceService.setExtensionRef({ getFluxCoreExtension: () => this.getFluxCoreExtension() });
  }

  private async loadFluxCoreModule(): Promise<any> {
    if (this.fluxcoreModulePromise) return this.fluxcoreModulePromise;

    this.fluxcoreModulePromise = (async () => {
      const extensionId = '@fluxcore/asistentes';
      const manifest = manifestLoader.getManifest(extensionId);
      const root = manifestLoader.getExtensionRoot(extensionId);
      const entrypoint = typeof (manifest as any)?.entrypoint === 'string' ? (manifest as any).entrypoint : null;

      if (!manifest || !root || !entrypoint) {
        throw new Error(`Asistentes runtime entrypoint not available for ${extensionId}`);
      }

      const absEntrypoint = path.resolve(root, entrypoint);
      const moduleUrl = pathToFileURL(absEntrypoint).href;
      return import(moduleUrl);
    })();

    return this.fluxcoreModulePromise;
  }

  public async getFluxCoreExtension(): Promise<any | null> {
    if (this.fluxcoreExtension) return this.fluxcoreExtension;
    if (this.fluxcoreExtensionPromise) return this.fluxcoreExtensionPromise;

    this.fluxcoreExtensionPromise = (async () => {
      try {
        const mod: any = await this.loadFluxCoreModule();
        if (typeof mod?.getFluxCore !== 'function') {
          return null;
        }

        const ext = mod.getFluxCore({
          enabled: true,
          mode: 'suggest',
          responseDelay: 30,
          provider: 'groq',
          model: 'llama-3.1-8b-instant',
          maxTokens: 256,
          temperature: 0.7,
          timeoutMs: 15000,
        });

        if (typeof ext?.onSuggestion === 'function') {
          ext.onSuggestion((suggestion: AISuggestion) => {
            if (suggestion?.id) {
              suggestionStore.set(suggestion.id, suggestion);
            }
            this.emitSuggestion(suggestion);
          });
        }

        // Inject runtime services (replaces HTTP self-calls with direct in-process calls)
        if (typeof ext?.setRuntimeServices === 'function') {
          const { fluxcoreService } = await import('./fluxcore.service');
          const { retrievalService } = await import('./retrieval.service');
          const { aiTemplateService } = await import('./ai-template.service');

          ext.setRuntimeServices({
            resolveActiveAssistant: (accountId: string) =>
              fluxcoreService.resolveActiveAssistant(accountId),

            fetchRagContext: async (accountId: string, query: string, vectorStoreIds?: string[]) => {
              let vsIds = vectorStoreIds;
              if (!vsIds || vsIds.length === 0) {
                const composition = await fluxcoreService.resolveActiveAssistant(accountId);
                if (composition?.vectorStores) {
                  vsIds = composition.vectorStores.map((vs: any) => vs.id);
                }
              }
              if (!vsIds || vsIds.length === 0) return null;
              const result = await retrievalService.buildContext(query, vsIds, accountId, { topK: 5, maxTokens: 2000 });
              if (!result) return null;
              return {
                context: result.context || '',
                sources: result.sources || [],
                totalTokens: result.totalTokens || 0,
                chunksUsed: result.chunksUsed || 0,
                vectorStoreIds: vsIds,
              };
            },

            listTemplates: async (accountId: string) => {
              const templates = await aiTemplateService.getAvailableTemplates(accountId);
              return templates.map((t: any) => ({
                id: t.id,
                name: t.name,
                category: t.category,
                variables: t.variables?.map((v: any) => v.name) || [],
                instructions: t.aiUsageInstructions || null,
              }));
            },

            sendTemplate: (params: any) =>
              aiTemplateService.sendAuthorizedTemplate(params),
          });
        }

        this.fluxcoreExtension = ext;
        return ext;
      } catch (error: any) {
        console.warn('[ai-service] Could not load fluxcore runtime:', error?.message || error);
        return null;
      }
    })();

    return this.fluxcoreExtensionPromise;
  }

  private async getProbeClient(baseUrl: string): Promise<any> {
    const existing = this.probeClients.get(baseUrl);
    if (existing) return existing;

    const mod: any = await this.loadFluxCoreModule();
    if (typeof mod?.OpenAICompatibleClient !== 'function') {
      throw new Error('fluxcore OpenAICompatibleClient not available');
    }

    const created = new mod.OpenAICompatibleClient(baseUrl);
    this.probeClients.set(baseUrl, created);
    return created;
  }

  private normalizeProbeError(error: any): { type: string; message: string; statusCode?: number } {
    const type = typeof error?.type === 'string' ? error.type : 'unknown';
    const message = typeof error?.message === 'string' ? error.message : 'Unknown error';
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    return { type, message, statusCode };
  }

  stripFluxCorePromoMarker(text: string): { text: string; promo: boolean } {
    return _stripPromo(text);
  }

  appendFluxCoreBrandingFooter(text: string): string {
    return _appendBranding(text);
  }

  getSuggestionBrandingDecision(suggestionId?: string | null): { promo: boolean } {
    if (!suggestionId) return { promo: false };
    const stored = this.getSuggestion(suggestionId);
    if (!stored?.content) return { promo: false };
    return _brandingDecision(stored.content);
  }

  /**
   * Registrar emisor de WebSocket
   */
  setWebSocketEmitter(emitter: (event: string, data: any) => void): void {
    this.wsEmitter = emitter;
  }

  /**
   * Obtener configuración de IA para una cuenta
   */
  async getAccountConfig(accountId: string): Promise<any> {
    try {
      const entitlement = await aiEntitlementsService.getEntitlement(accountId);
      const [installation] = await db
        .select()
        .from(extensionInstallations)
        .where(
          and(
            eq(extensionInstallations.accountId, accountId),
            eq(extensionInstallations.extensionId, '@fluxcore/asistentes')
          )
        )
        .limit(1);

      const defaultAllowedProviders = (['groq', 'openai'] as AIProviderId[])
        .filter((provider) => this.getProductKeysForProvider(provider).length > 0);

      console.log('[ai-service] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
      console.log('[ai-service] GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
      console.log('[ai-service] defaultAllowedProviders:', defaultAllowedProviders);

      const defaultProvider: AIProviderId | null = defaultAllowedProviders.includes('groq')
        ? 'groq'
        : defaultAllowedProviders[0] || null;

      const effectiveEntitlement = entitlement ?? {
        accountId,
        enabled: true,
        allowedProviders: defaultAllowedProviders,
        defaultProvider,
      };

      if (effectiveEntitlement.enabled !== true || effectiveEntitlement.allowedProviders.length === 0) {
        return {
          enabled: false,
          entitled: entitlement ? false : true,
          allowedProviders: effectiveEntitlement.allowedProviders ?? [],
          provider: null,
          providerOrder: [],
          mode: 'off' as const,
          responseDelay: 30,
          smartDelayEnabled: false,
          model: 'llama-3.1-8b-instant',
          maxTokens: 256,
          temperature: 0.7,
        };
      }

      if (!installation) {
        const providerSelection = this.resolveProviderSelection({
          selectedProvider: null,
          entitlement: effectiveEntitlement,
        });

        return {
          enabled: false,
          entitled: true,
          allowedProviders: effectiveEntitlement.allowedProviders,
          provider: providerSelection.selectedProvider,
          providerOrder: providerSelection.providerOrder,
          mode: 'off' as const,
          responseDelay: 30,
          smartDelayEnabled: false,
          model: 'llama-3.1-8b-instant',
          maxTokens: 256,
          temperature: 0.7,
        };
      }

      const cfg = (installation.config || {}) as Record<string, any>;

      // Consultar asistente activo para obtener modelConfig y timingConfig
      const { fluxcoreService } = await import('./fluxcore.service');
      const activeAssistant = await fluxcoreService.resolveActiveAssistant(accountId);

      // Priorizar config del asistente activo sobre extension_installations
      const assistantModelConfig = activeAssistant?.assistant?.modelConfig as Record<string, any> || {};
      const assistantTimingConfig = activeAssistant?.assistant?.timingConfig as Record<string, any> || {};

      // Provider: usar del asistente si existe, sino de extension_installations
      const requestedProvider =
        (assistantModelConfig.provider === 'openai' || assistantModelConfig.provider === 'groq')
          ? (assistantModelConfig.provider as AIProviderId)
          : (cfg.provider === 'openai' || cfg.provider === 'groq' ? (cfg.provider as AIProviderId) : null);

      const providerSelection = this.resolveProviderSelection({
        selectedProvider: requestedProvider,
        entitlement: effectiveEntitlement,
      });

      // Log para debug
      console.log('[ai-service] Using assistant config:', {
        hasActiveAssistant: !!activeAssistant?.assistant,
        assistantProvider: assistantModelConfig.provider,
        assistantModel: assistantModelConfig.model,
        assistantDelay: assistantTimingConfig.responseDelaySeconds,
        cfgProvider: cfg.provider,
        cfgModel: cfg.model,
        finalProvider: requestedProvider,
      });

      return {
        entitled: true,
        allowedProviders: effectiveEntitlement.allowedProviders,
        provider: providerSelection.selectedProvider,
        providerOrder: providerSelection.providerOrder,
        enabled: installation.enabled !== false && cfg.enabled !== false,
        mode: (cfg.mode as 'suggest' | 'auto' | 'off') || 'suggest',
        // Priorizar timingConfig del asistente
        responseDelay: typeof assistantTimingConfig.responseDelaySeconds === 'number'
          ? assistantTimingConfig.responseDelaySeconds
          : (typeof cfg.responseDelay === 'number' ? cfg.responseDelay : 30),
        smartDelayEnabled: assistantTimingConfig.smartDelay === true || cfg.smartDelayEnabled === true,
        // Priorizar modelConfig del asistente
        model: typeof assistantModelConfig.model === 'string'
          ? assistantModelConfig.model
          : (typeof cfg.model === 'string' ? cfg.model : 'llama-3.1-8b-instant'),
        maxTokens: typeof assistantModelConfig.maxTokens === 'number'
          ? assistantModelConfig.maxTokens
          : (typeof cfg.maxTokens === 'number' ? cfg.maxTokens : 256),
        temperature: typeof assistantModelConfig.temperature === 'number'
          ? assistantModelConfig.temperature
          : (typeof cfg.temperature === 'number' ? cfg.temperature : 0.7),
      };
    } catch (error: any) {
      console.warn('[ai-service] Could not load fluxcore config:', error.message);
      return {
        enabled: false,
        entitled: false,
        allowedProviders: [],
        provider: null,
        providerOrder: [],
        mode: 'off' as const,
        responseDelay: 30,
        smartDelayEnabled: false,
        model: 'llama-3.1-8b-instant',
        maxTokens: 256,
        temperature: 0.7,
      };
    }
  }

  private resolveProviderSelection(params: {
    selectedProvider: AIProviderId | null;
    entitlement: { allowedProviders: AIProviderId[]; defaultProvider: AIProviderId | null };
  }): {
    selectedProvider: AIProviderId | null;
    providerOrder: Array<{ provider: AIProviderId; baseUrl: string; apiKey: string; keySource?: string }>;
  } {
    const allowed = Array.isArray(params.entitlement.allowedProviders)
      ? params.entitlement.allowedProviders
      : [];

    let selected: AIProviderId | null = params.selectedProvider;
    if (!selected || !allowed.includes(selected)) {
      selected = params.entitlement.defaultProvider && allowed.includes(params.entitlement.defaultProvider)
        ? params.entitlement.defaultProvider
        : allowed[0] || null;
    }

    const orderedProviders = selected
      ? [selected, ...allowed.filter((p) => p !== selected)]
      : [...allowed];

    const providerOrder: Array<{ provider: AIProviderId; baseUrl: string; apiKey: string; keySource?: string }> = [];

    for (const provider of orderedProviders) {
      const keys = this.getProductKeysForProvider(provider);
      for (const key of keys) {
        providerOrder.push({
          provider,
          baseUrl: provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1',
          apiKey: key.apiKey,
          keySource: key.keySource,
        });
      }
    }

    return {
      selectedProvider: selected,
      providerOrder,
    };
  }

  private getProductKeysForProvider(provider: AIProviderId): Array<{ apiKey: string; keySource: string }> {
    const poolVar = provider === 'groq' ? process.env.GROQ_API_KEYS : process.env.OPENAI_API_KEYS;
    const singleVar = provider === 'groq' ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;

    console.log(`[ai-service] getProductKeysForProvider(${provider}):`);
    console.log(`  - poolVar exists: ${!!poolVar}`);
    console.log(`  - singleVar exists: ${!!singleVar}, length: ${singleVar?.length || 0}`);

    const pool = (poolVar || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .map((apiKey, idx) => ({ apiKey, keySource: `env_pool_${idx + 1}` }));

    const single = typeof singleVar === 'string' && singleVar.trim().length > 0
      ? [{ apiKey: singleVar.trim(), keySource: 'env_single' }]
      : [];

    const result = [...pool, ...single];
    console.log(`  - Result keys: ${result.length}`);
    return result;
  }

  private async buildContext(accountId: string, conversationId: string): Promise<ContextData> {
    return _buildContext(accountId, conversationId);
  }



  /**
   * Emitir sugerencia por WebSocket
   */
  private emitSuggestion(suggestion: AISuggestion): void {
    if (this.wsEmitter) {
      this.wsEmitter('ai:suggestion', suggestion);
    }
    console.log(`[ai-service] Suggestion emitted: ${suggestion.id}`);
  }

  approveSuggestion(suggestionId: string): AISuggestion | null {
    return suggestionStore.approve(suggestionId) as AISuggestion | null;
  }

  rejectSuggestion(suggestionId: string): AISuggestion | null {
    return suggestionStore.reject(suggestionId) as AISuggestion | null;
  }

  editSuggestion(suggestionId: string, newContent: string): AISuggestion | null {
    return suggestionStore.edit(suggestionId, newContent) as AISuggestion | null;
  }

  getSuggestion(suggestionId: string): AISuggestion | null {
    return suggestionStore.get(suggestionId) as AISuggestion | null;
  }

  getPendingSuggestions(conversationId: string): AISuggestion[] {
    return suggestionStore.getPending(conversationId) as AISuggestion[];
  }

  async listTraces(params: { accountId: string; conversationId?: string; limit?: number }): Promise<any[]> {
    return aiTraceService.listTraces(params);
  }

  async getTrace(params: { accountId: string; traceId: string }): Promise<any | null> {
    return aiTraceService.getTrace(params);
  }

  async clearTraces(params: { accountId: string }): Promise<number> {
    return aiTraceService.clearTraces(params);
  }

  async deleteTrace(params: { accountId: string; traceId: string }): Promise<boolean> {
    return aiTraceService.deleteTrace(params);
  }

  async exportTraces(params: { accountId: string; conversationId?: string; limit?: number }): Promise<any[]> {
    return aiTraceService.exportTraces(params);
  }

  /**
   * Verificar si la API está configurada
   */
  isConfigured(): boolean {
    return this.getProductKeysForProvider('groq').length > 0 || this.getProductKeysForProvider('openai').length > 0;
  }

  async getAutoReplyDelayMs(accountId: string): Promise<number> {
    const config = await this.getAccountConfig(accountId);
    const delaySeconds = typeof config.responseDelay === 'number' ? config.responseDelay : 0;
    const delayMs = Math.max(0, Math.round(delaySeconds * 1000));
    return delayMs;
  }

  /**
   * Probar conexión con la API
   */
  async testConnection(): Promise<boolean> {
    const extension = await this.getFluxCoreExtension();
    if (!extension || typeof extension.testApiConnection !== 'function') return false;
    return extension.testApiConnection();
  }

  async getStatusForAccount(accountId: string): Promise<any> {
    const cfg = await this.getAccountConfig(accountId);

    const providerOrder = Array.isArray(cfg.providerOrder) ? cfg.providerOrder : [];
    const configured = providerOrder.length > 0;

    const attempts: Array<{
      provider: string;
      baseUrl: string;
      keySource?: string;
      ok: boolean;
      errorType?: string;
      statusCode?: number;
      message?: string;
    }> = [];

    let connected: boolean | null = null;

    if (configured) {
      for (let i = 0; i < providerOrder.length; i++) {
        const p = providerOrder[i];
        const client = await this.getProbeClient(p.baseUrl);

        try {
          await client.testConnection({ apiKey: p.apiKey, timeoutMs: 15000 });
          attempts.push({
            provider: p.provider,
            baseUrl: p.baseUrl,
            keySource: p.keySource,
            ok: true,
          });
          connected = true;
          break;
        } catch (error: any) {
          const normalized = this.normalizeProbeError(error);
          attempts.push({
            provider: p.provider,
            baseUrl: p.baseUrl,
            keySource: p.keySource,
            ok: false,
            errorType: normalized.type,
            statusCode: normalized.statusCode,
            message: normalized.message,
          });

          const canFallback = ['timeout', 'network_error', 'server_error', 'rate_limited', 'unauthorized'].includes(
            normalized.type
          );
          if (!canFallback) {
            connected = false;
            break;
          }
        }
      }

      if (connected === null) {
        connected = false;
      }
    }

    const selectedProvider = typeof cfg.provider === 'string' ? cfg.provider : null;

    const providerSummary = providerOrder
      .reduce((acc: any[], p: any) => {
        const existing = acc.find((x) => x.provider === p.provider);
        if (existing) {
          existing.keyCount += 1;
        } else {
          acc.push({ provider: p.provider, baseUrl: p.baseUrl, keyCount: 1 });
        }
        return acc;
      }, []);

    const { runtimeConfigService } = await import('./runtime-config.service');
    const runtimeCfg = await runtimeConfigService.getRuntime(accountId);

    return {
      accountId,
      entitled: cfg.entitled === true,
      enabled: cfg.enabled === true,
      mode: cfg.mode || null,
      activeRuntimeId: runtimeCfg.activeRuntimeId,
      allowedProviders: cfg.allowedProviders || [],
      provider: selectedProvider,
      model: cfg.model || null,
      configured,
      connected,
      providerKeys: providerSummary,
      attempts,
    };
  }

  async getEnvStatus(): Promise<any> {
    const providerOrder: Array<{ provider: AIProviderId; baseUrl: string; apiKey: string; keySource?: string }> = [];

    for (const provider of ['groq', 'openai'] as AIProviderId[]) {
      const keys = this.getProductKeysForProvider(provider);
      for (const key of keys) {
        providerOrder.push({
          provider,
          baseUrl: provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1',
          apiKey: key.apiKey,
          keySource: key.keySource,
        });
      }
    }

    const configured = providerOrder.length > 0;
    const attempts: Array<{
      provider: string;
      baseUrl: string;
      keySource?: string;
      ok: boolean;
      errorType?: string;
      statusCode?: number;
      message?: string;
    }> = [];

    let connected: boolean | null = null;

    if (configured) {
      for (let i = 0; i < providerOrder.length; i++) {
        const p = providerOrder[i];
        const client = await this.getProbeClient(p.baseUrl);

        try {
          await client.testConnection({ apiKey: p.apiKey, timeoutMs: 15000 });
          attempts.push({
            provider: p.provider,
            baseUrl: p.baseUrl,
            keySource: p.keySource,
            ok: true,
          });
          connected = true;
          break;
        } catch (error: any) {
          const normalized = this.normalizeProbeError(error);
          attempts.push({
            provider: p.provider,
            baseUrl: p.baseUrl,
            keySource: p.keySource,
            ok: false,
            errorType: normalized.type,
            statusCode: normalized.statusCode,
            message: normalized.message,
          });

          const canFallback = ['timeout', 'network_error', 'server_error', 'rate_limited', 'unauthorized'].includes(
            normalized.type
          );
          if (!canFallback) {
            connected = false;
            break;
          }
        }
      }

      if (connected === null) {
        connected = false;
      }
    }

    const providerSummary = providerOrder
      .reduce((acc: any[], p: any) => {
        const existing = acc.find((x) => x.provider === p.provider);
        if (existing) {
          existing.keyCount += 1;
        } else {
          acc.push({ provider: p.provider, baseUrl: p.baseUrl, keyCount: 1 });
        }
        return acc;
      }, []);

    return {
      configured,
      connected,
      providerKeys: providerSummary,
      attempts,
    };
  }

  async probeCompletion(params: {
    provider: AIProviderId;
    model: string;
    timeoutMs?: number;
  }): Promise<any> {
    const keys = this.getProductKeysForProvider(params.provider);
    if (keys.length === 0) {
      return {
        ok: false,
        provider: params.provider,
        model: params.model,
        errorType: 'not_configured',
        message: `No API key configured for provider ${params.provider}`,
      };
    }

    const baseUrl = params.provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
    const client = await this.getProbeClient(baseUrl);

    try {
      const res = await client.createChatCompletion({
        apiKey: keys[0].apiKey,
        systemPrompt: 'You are a connectivity test. Reply with a single word: pong.',
        messages: [{ role: 'user', content: 'ping' }],
        model: params.model,
        maxTokens: 16,
        temperature: 0,
        timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : 15000,
      });

      return {
        ok: true,
        provider: params.provider,
        baseUrl,
        keySource: keys[0].keySource,
        model: params.model,
        content: res.content,
        usage: res.usage,
      };
    } catch (error: any) {
      const normalized = this.normalizeProbeError(error);
      return {
        ok: false,
        provider: params.provider,
        baseUrl,
        keySource: keys[0].keySource,
        model: params.model,
        errorType: normalized.type,
        statusCode: normalized.statusCode,
        message: normalized.message,
      };
    }
  }

  async complete(params: {
    model: string;
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
    providerOrder?: any[];
  }): Promise<{
    content: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    // 1. Determine provider from model or params
    // Simple heuristic: if model starts with 'llama' or 'mixtral' -> Groq; otherwise OpenAI (gpt-*)
    // TODO: Make this robust.
    let provider: AIProviderId = 'openai';
    if (params.model.includes('llama') || params.model.includes('mixtral')) {
      provider = 'groq';
    }

    const keys = this.getProductKeysForProvider(provider);
    if (keys.length === 0) {
      throw new Error(`No API keys configured for provider ${provider}`);
    }

    const baseUrl = provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
    const client = await this.getProbeClient(baseUrl);

    const result = await client.createChatCompletion({
      apiKey: keys[0].apiKey,
      systemPrompt: params.systemPrompt,
      messages: params.messages,
      model: params.model,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      responseFormat: params.responseFormat,
      timeoutMs: 30000,
    });

    return {
      content: result.content,
      usage: result.usage,
    };
  }

  /**
   * Genera una respuesta de IA para una conversación.
   *
   * Usa ExecutionPlan como single source of truth: toda la resolución de
   * asistente, provider, créditos y elegibilidad ocurre en un solo paso
   * ANTES de tocar la extensión FluxCore.
   *
   * @returns GenerateResponseResult — discriminated union:
   *   - { ok: true, suggestion }  → respuesta generada (o null si vacía)
   *   - { ok: false, block }      → bloqueado con motivo (créditos, API key, etc.)
   */
  async generateResponse(
    conversationId: string,
    recipientAccountId: string,
    lastMessageContent: string,
    options: { mode?: 'suggest' | 'auto'; triggerMessageId?: string; triggerMessageCreatedAt?: Date; traceId?: string; policyContext?: FluxPolicyContext } = {}
  ): Promise<GenerateResponseResult> {
    const tracePrefix = options.traceId ? `[ai-service][${options.traceId}]` : '[ai-service]';
    const start = Date.now();

    // ── 1. Resolve execution plan (single source of truth) ──────────────
    const plan = await resolveExecutionPlan(recipientAccountId, conversationId);

    if (!plan.canExecute) {
      console.log(`${tracePrefix} BLOCKED: ${plan.block.reason} — ${plan.block.message}`);
      return { ok: false, block: plan.block };
    }

    // ── Rate limiting ──────────────────────────────────────────────────
    const rateCheck = aiRateLimiter.check(recipientAccountId);
    if (!rateCheck.allowed) {
      console.log(`${tracePrefix} RATE LIMITED: ${rateCheck.reason} (retry in ${rateCheck.retryAfterMs}ms)`);
      return { ok: false, block: { reason: 'rate_limited', message: `Demasiadas solicitudes. Intenta de nuevo en ${Math.ceil((rateCheck.retryAfterMs || 5000) / 1000)}s.` } };
    }
    aiRateLimiter.record(recipientAccountId);

    console.log(`${tracePrefix} plan resolved`, {
      runtime: plan.runtime,
      provider: plan.provider,
      model: plan.model,
      mode: plan.mode,
      creditsSession: plan.creditsSessionId ? 'active' : 'none',
      elapsedMs: Date.now() - start,
    });

    // ── 2. Load extension ───────────────────────────────────────────────
    const extension = await this.getFluxCoreExtension();
    if (!extension) {
      return { ok: false, block: { reason: 'no_extension', message: 'La extensión FluxCore no está disponible.' } };
    }

    // ── 3. Build immutable per-request config from plan ────────────────
    const modeForPrompt = options.mode || plan.mode;

    const requestConfig = {
      enabled: true,
      mode: modeForPrompt,
      responseDelay: plan.responseDelay,
      provider: plan.provider,
      model: plan.model,
      maxTokens: plan.maxTokens,
      temperature: plan.temperature,
      timeoutMs: 15000,
      providerOrder: plan.providerOrder,
    };

    // ── 4. Build context ────────────────────────────────────────────────
    const context = await this.buildContext(recipientAccountId, conversationId);

    // WES-170: Recuperar contexto de WES
    const { workResolver } = await import('../core/WorkResolver');
    const { fluxcoreWorkDefinitions } = await import('@fluxcore/db');

    // Necesitamos el relationshipId para workResolver.resolve (Canon compliance)
    const [convRecord] = await db.select({ relationshipId: conversations.relationshipId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    const relationshipId = convRecord?.relationshipId;

    const wesContext: any = {
      availableWorkDefinitions: await db.select().from(fluxcoreWorkDefinitions).where(eq(fluxcoreWorkDefinitions.accountId, recipientAccountId)),
      activeWork: relationshipId ? await workResolver.resolve({ accountId: recipientAccountId, conversationId, relationshipId }).then(res =>
        res.type === 'RESUME_WORK' ? { id: (res as any).workId, state: 'ACTIVE' } : null
      ) : null
    };


    const event: MessageEvent = {
      messageId: options.triggerMessageId || crypto.randomUUID(),
      conversationId,
      senderAccountId: 'manual',
      recipientAccountId,
      content: lastMessageContent,
      messageType: 'text',
      createdAt: options.triggerMessageCreatedAt || new Date(),
    };

    // ── 5. Execute: OpenAI Assistants API path ──────────────────────────
    let suggestion: AISuggestion | null = null;

    if (plan.runtime === 'openai' && plan.externalId) {
      try {
        const { extensionHost } = await import('./extension-host.service');
        const openaiExtension = await extensionHost.loadExtensionRuntime('@fluxcore/asistentes-openai');
        if (openaiExtension?.generateResponse) {
          suggestion = await openaiExtension.generateResponse({
            plan,
            context,
            event,
            lastMessageContent,
            options,
          });
        }
      } catch (error: any) {
        console.error(`${tracePrefix} OpenAI Assistants extension path failed:`, error?.message);
        // Fall through to local runtime as last resort
      }
    }

    // ── 6. Execute: Local runtime (FluxCore extension) ──────────────────
    suggestion = await extension.generateResponse({
      conversationId,
      recipientAccountId,
      lastMessageContent,
      options: {
        mode: modeForPrompt,
        responseDelay: plan.responseDelay,
        triggerMessageId: options.triggerMessageId,
        policyContext: options.policyContext,
        wes: wesContext,
        context: context,
      }
    });

    // ── 7. Post-Processing Pipeline ──────────────────────────────────────
    if (suggestion) {
      await this.postProcessSuggestion({
        suggestion,
        plan,
        context,
        recipientAccountId,
        conversationId,
        modeForPrompt,
        start,
      });
    }

    return { ok: true, suggestion: suggestion || null };
  }

  /**
   * Common pipeline for AI responses (Signals, Branding, Traces, Credits)
   */
  private async postProcessSuggestion(params: {
    suggestion: AISuggestion;
    plan: EligiblePlan;
    context: any;
    recipientAccountId: string;
    conversationId: string;
    modeForPrompt: string;
    start: number;
  }): Promise<void> {
    const { suggestion, plan, context, recipientAccountId, conversationId, modeForPrompt, start } = params;

    suggestion.accountId = recipientAccountId;
    const rawContent = suggestion.content;



    // 2. Branding (Promo/Footer)
    if (suggestion.content) {
      const decision = _brandingDecision(suggestion.content);
      if (decision.promo) {
        suggestion.content = _appendBranding(suggestion.content);
      }
    }

    // 3. Store in Memory
    suggestionStore.set(suggestion.id, suggestion);

    // 4. Trace Persistence (fire-and-forget)
    aiTraceService
      .persistTrace({
        accountId: recipientAccountId,
        conversationId,
        runtime: plan.runtime,
        provider: suggestion.provider || plan.provider,
        model: suggestion.model || plan.model,
        mode: modeForPrompt,
        startedAt: new Date(start),
        completedAt: new Date(),
        durationMs: Date.now() - start,
        promptTokens: suggestion.usage?.promptTokens,
        completionTokens: suggestion.usage?.completionTokens,
        totalTokens: suggestion.usage?.totalTokens,
        responseContent: rawContent,
        requestContext: context,
        builtPrompt: suggestion.promptDebug?.builtPrompt,
        toolsOffered: suggestion.toolUse?.toolsOffered,
        toolsCalled: suggestion.toolUse?.toolsCalled,
        toolDetails: suggestion.toolUse?.toolDetails,
        attempts: suggestion.attempts,
      })
      .catch(() => { });

    // 5. Consumo de Créditos
    if (plan.creditsSessionId && suggestion.usage?.totalTokens) {
      // Solo cobrar si el provider es OpenAI o si el plan lo exige
      if (suggestion.provider === 'openai' || plan.provider === 'openai') {
        await creditsService.consumeSessionTokens({
          sessionId: plan.creditsSessionId,
          tokens: suggestion.usage.totalTokens,
        });
      }
    }
  }

  async tryCreateWelcomeConversation(params: { newAccountId: string; userName: string }): Promise<void> {
    try {
      const [installation] = await db
        .select()
        .from(extensionInstallations)
        .where(
          and(
            eq(extensionInstallations.accountId, params.newAccountId),
            eq(extensionInstallations.extensionId, '@fluxcore/asistentes')
          )
        )
        .limit(1);

      if (!installation || installation.enabled === false) {
        return;
      }

      const [fluxcoreAccount] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.username, this.FLUXCORE_USERNAME))
        .limit(1);

      if (!fluxcoreAccount) {
        return;
      }

      const [existingRelationship] = await db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.accountAId, fluxcoreAccount.id),
            eq(relationships.accountBId, params.newAccountId)
          )
        )
        .limit(1);

      if (existingRelationship) {
        // La relación existe, pero verificar si hay conversación
        const [existingConversation] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.relationshipId, existingRelationship.id))
          .limit(1);

        if (existingConversation) {
          return; // Ya hay conversación, no hacer nada
        }

        // Crear conversación para la relación existente
        const [conversation] = await db
          .insert(conversations)
          .values({
            relationshipId: existingRelationship.id,
            channel: 'web',
          })
          .returning();

        await db.insert(messages).values({
          conversationId: conversation.id,
          senderAccountId: fluxcoreAccount.id,
          type: 'incoming',
          content: {
            text: `¡Hola ${params.userName}! 👋\n\nSoy FluxCore, tu asistente. Estoy aquí para ayudarte a:\n\n• Configurar tu perfil\n• Añadir contactos\n• Explorar las extensiones\n\n¿En qué puedo ayudarte hoy?`,
          },
        });
        return;
      }

      const [relationship] = await db
        .insert(relationships)
        .values({
          accountAId: fluxcoreAccount.id,
          accountBId: params.newAccountId,
          perspectiveA: { savedName: params.userName },
          perspectiveB: { savedName: 'FluxCore' },
        })
        .returning();

      const [conversation] = await db
        .insert(conversations)
        .values({
          relationshipId: relationship.id,
          channel: 'web',
        })
        .returning();

      await db.insert(messages).values({
        conversationId: conversation.id,
        senderAccountId: fluxcoreAccount.id,
        type: 'incoming',
        content: {
          text: `¡Hola ${params.userName}! 👋\n\nSoy FluxCore, tu asistente. Estoy aquí para ayudarte a:\n\n• Configurar tu perfil\n• Añadir contactos\n• Explorar las extensiones\n\n¿En qué puedo ayudarte hoy?`,
        },
      });
    } catch (error: any) {
      console.error('[ai-service] Error creating FluxCore welcome:', error?.message || error);
    }
  }

  /**
   * Helper for internal services (like WES Interpreter) to call LLM directly.
   */
  public async rawCompletion(params: {
    model: string;
    provider: 'groq' | 'openai';
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' };
  }): Promise<{ content: string }> {
    const ext = await this.getFluxCoreExtension();
    if (!ext || typeof ext.callLLM !== 'function') {
      throw new Error('AI Extension / callLLM not available');
    }

    return ext.callLLM(params);
  }
}

// Singleton
export const aiService = new AIService();
export default aiService;

```

## 8. ExtensionHostService

**Archivo:** `apps/api/src/services/extension-host.service.ts`

**Código:**

```typescript
/**
 * Extension Host Service
 * FC-154: Servicio principal que coordina extensiones
 */

import { extensionService } from './extension.service';
import { manifestLoader } from './manifest-loader.service';
import { permissionValidator } from './permission-validator.service';
import { contextAccess } from './context-access.service';
import { runtimeConfigService } from './runtime-config.service';
import aiService from './ai.service';
import type { ExtensionManifest } from '@fluxcore/types';
import type { FluxPolicyContext } from '@fluxcore/db';
import * as path from 'path';
import { pathToFileURL } from 'url';

// Registro de extensiones cargadas
type LoadedExtensionRuntime = {
  onInstall?: (accountId: string) => Promise<void>;
  onUninstall?: (accountId: string) => Promise<void>;
  onEnable?: (accountId: string) => Promise<void>;
  onDisable?: (accountId: string) => Promise<void>;
  onConfigUpdate?: (accountId: string, config: Record<string, unknown>) => Promise<void>;
  onConfigChange?: (accountId: string, config: Record<string, unknown>) => Promise<void>;
  // Optional legacy/extended hooks
  onMessage?: (...args: any[]) => Promise<any>;
  generateResponse?: (...args: any[]) => Promise<any>;
};

const loadedExtensions: Map<string, LoadedExtensionRuntime> = new Map();

export interface ProcessMessageParams {
  accountId: string;
  relationshipId: string;
  conversationId: string;
  message: {
    id: string;
    content: any;
    type: string;
    senderAccountId: string;
  };
  // COR-007: Modo de automatización
  automationMode?: 'automatic' | 'supervised' | 'disabled';
  // Canon v7.0: Pre-runtime policy context
  policyContext?: FluxPolicyContext;
}

export interface ProcessMessageResult {
  extensionId: string;
  success: boolean;
  handled?: boolean;
  stopPropagation?: boolean;
  actions?: any[];
  error?: string;
}

class ExtensionHostService {
  public async loadExtensionRuntime(extensionId: string): Promise<LoadedExtensionRuntime | null> {
    const existing = loadedExtensions.get(extensionId);
    if (existing) return existing;

    const manifest = manifestLoader.getManifest(extensionId);
    if (!manifest) return null;

    const root = manifestLoader.getExtensionRoot(extensionId);
    const entrypoint = typeof (manifest as any).entrypoint === 'string' ? (manifest as any).entrypoint : null;
    if (!root || !entrypoint) return null;

    const absEntrypoint = path.resolve(root, entrypoint);
    const moduleUrl = pathToFileURL(absEntrypoint).href;

    try {
      const mod: any = await import(moduleUrl);

      // Prefer default export (e.g. Karen)
      if (mod?.default && typeof mod.default === 'object') {
        const runtime = mod.default as LoadedExtensionRuntime;
        loadedExtensions.set(extensionId, runtime);
        return runtime;
      }

      // Special-case adapter for fluxcore current API (exports getFluxCore singleton)
      if (typeof mod?.getFluxCore === 'function') {
        const runtime: LoadedExtensionRuntime = {
          onInstall: async (accountId: string) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onInstall === 'function') {
              await ext.onInstall(accountId);
            }
          },
          onUninstall: async (accountId: string) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onUninstall === 'function') {
              await ext.onUninstall(accountId);
            }
          },
          onEnable: async (accountId: string) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onEnable === 'function') {
              await ext.onEnable(accountId);
            }
          },
          onDisable: async (accountId: string) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onDisable === 'function') {
              await ext.onDisable(accountId);
            }
          },
          onConfigUpdate: async (accountId: string, config: Record<string, unknown>) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onConfigChange === 'function') {
              await ext.onConfigChange(accountId, config);
              return;
            }
            if (typeof ext?.onConfigUpdate === 'function') {
              await ext.onConfigUpdate(accountId, config);
            }
          },
          onMessage: async (params: any) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onMessage === 'function') {
              return await ext.onMessage(params);
            }
            return null;
          },
          generateResponse: async (params: any) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.generateResponse === 'function') {
              return await ext.generateResponse(params);
            }
            return null;
          },
        };

        loadedExtensions.set(extensionId, runtime);
        return runtime;
      }

      return null;
    } catch (error: any) {
      console.warn(`[ExtensionHost] Failed to load runtime for ${extensionId}:`, error?.message || error);
      return null;
    }
  }

  private async bestEffortHook(
    extensionId: string,
    hook: keyof LoadedExtensionRuntime,
    ...args: any[]
  ): Promise<void> {
    try {
      const runtime = await this.loadExtensionRuntime(extensionId);
      const fn = runtime?.[hook];
      if (typeof fn !== 'function') return;
      await (fn as any)(...args);
    } catch (error: any) {
      console.warn(`[ExtensionHost] Hook ${String(hook)} failed for ${extensionId}:`, error?.message || error);
    }
  }

  /**
   * Procesar un mensaje entrante con todas las extensiones habilitadas
   */
  async processMessage(params: ProcessMessageParams): Promise<ProcessMessageResult[]> {
    const { accountId, relationshipId, conversationId } = params;
    const results: ProcessMessageResult[] = [];

    const { activeRuntimeId } = await runtimeConfigService.getRuntime(accountId);
    console.log(`[Diag][ExtensionHost] message=${params.message.id} runtime=${activeRuntimeId} decision=respond stage=extension_host account=${accountId}`);
    try {
      // Canon v7.0: Resolve Active Runtime for Sovereignty Checks

      // Obtener extensiones instaladas y habilitadas
      let installations: any[] = [];
      try {
        installations = await extensionService.getInstalled(accountId);
      } catch (error: any) {
        console.warn('[ExtensionHost] Could not fetch installations:', error.message);
        return results;
      }
      const enabledInstallations = installations.filter((i) => i.enabled);

      // WES-CANON: Integrated system extensions that run BEFORE DB ones.
      let fluxi: any = null;
      try {
        const fluxiId = '@fluxcore/fluxi';
        const root = manifestLoader.getExtensionRoot(fluxiId);
        if (root) {
          const manifest = manifestLoader.getManifest(fluxiId);
          const entrypoint = manifest?.entrypoint || 'src/index.ts';
          const absEntrypoint = path.resolve(root, entrypoint);
          const moduleUrl = pathToFileURL(absEntrypoint).href;
          const mod = await import(moduleUrl);
          fluxi = mod.fluxiExtension || (typeof mod.getFluxCore === 'function' ? mod.getFluxCore() : null);

          // Perform Dependency Injection (replaces brittle internal imports in extension)
          if (fluxi && typeof fluxi.setServices === 'function') {
            const { db, ...schema } = await import('@fluxcore/db');
            const operators = await import('drizzle-orm');
            const { workEngineService } = await import('./work-engine.service');
            const { messageCore } = await import('../core/message-core');
            const { aiService } = await import('./ai.service');
            const { workDefinitionService } = await import('./work-definition.service');
            const { logTrace } = await import('../utils/file-logger');
            const { metricsService } = await import('./metrics.service');
            const { aiCircuitBreaker } = await import('./ai-circuit-breaker.service');

            fluxi.setServices({
              db,
              schema,
              operators,
              workEngineService,
              messageCore,
              interpreterServices: {
                aiService,
                workDefinitionService,
                logTrace,
                metricsService,
                aiCircuitBreaker
              }
            });
          }
        }
      } catch (err: any) {
        console.warn('[ExtensionHost] Failed to load/inject Fluxi:', err.message);
      }

      const systemExtensions = fluxi ? [{ id: '@fluxcore/fluxi', runtime: fluxi }] : [];

      // 1. Execute system extensions
      for (const sysExt of systemExtensions) {
        try {
          console.log(`[Diag][ExtensionHost] message=${params.message.id} runtime=${sysExt.id} decision=respond stage=extension_invoke scope=system`);
          const resultFromExtension = await sysExt.runtime.onMessage({
            accountId,
            extensionId: sysExt.id,
            relationshipId,
            conversationId,
            message: params.message,
            policyContext: params.policyContext,
            automationMode: params.automationMode,
            activeRuntimeId,
          });

          if (resultFromExtension) {
            const res: ProcessMessageResult = {
              extensionId: sysExt.id,
              success: true,
              handled: resultFromExtension.handled || false,
              stopPropagation: resultFromExtension.stopPropagation || false,
              actions: resultFromExtension.actions || [],
            };
            results.push(res);
            if (res.stopPropagation) {
              console.log(`[ExtensionHost] Propagation stopped by SYSTEM extension ${sysExt.id}`);
              console.log(`[Diag][ExtensionHost] message=${params.message.id} runtime=${sysExt.id} decision=stop stage=extension_invoke scope=system`);
              return results;
            }
          }
        } catch (error: any) {
          console.error(`[ExtensionHost] System extension ${sysExt.id} failed:`, error.message);
        }
      }

      // 2. Ejecutar extensiones de usuario
      for (const installation of enabledInstallations) {
        try {
          const canProcess = permissionValidator.hasAnyPermission(
            installation.grantedPermissions as string[],
            ['read:messages', 'send:messages']
          );

          if (!canProcess.allowed) {
            continue;
          }

          // Obtener contexto para la extensión
          const context = await contextAccess.getContext({
            extensionId: installation.extensionId,
            accountId,
            grantedPermissions: installation.grantedPermissions as string[],
            relationshipId,
            conversationId,
          });

          const runtime = await this.loadExtensionRuntime(installation.extensionId);
          const onMessage = runtime?.onMessage;

          if (typeof onMessage === 'function') {
            console.log(`[Diag][ExtensionHost] message=${params.message.id} runtime=${installation.extensionId} decision=respond stage=extension_invoke scope=user`);
            const resultFromExtension = await onMessage({
              accountId,
              extensionId: installation.extensionId,
              relationshipId,
              conversationId,
              message: params.message,
              context,
              config: installation.config,
              grantedPermissions: installation.grantedPermissions,
              automationMode: params.automationMode,
              policyContext: params.policyContext,
              activeRuntimeId,
            });

            const extensionResult: ProcessMessageResult = {
              extensionId: installation.extensionId,
              success: true,
              handled: resultFromExtension?.handled || false,
              stopPropagation: resultFromExtension?.stopPropagation || false,
              actions: resultFromExtension?.actions || [],
            };

            results.push(extensionResult);

            if (extensionResult.stopPropagation) {
              console.log(`[ExtensionHost] Propagation stopped by extension ${installation.extensionId}`);
              console.log(`[Diag][ExtensionHost] message=${params.message.id} runtime=${installation.extensionId} decision=stop stage=extension_invoke scope=user`);
              break;
            }
          }
        } catch (error: any) {
          results.push({
            extensionId: installation.extensionId,
            success: false,
            error: error.message,
          });
        }
      }

      return results;
    } catch (err: any) {
      try { require('fs').appendFileSync('AI_TEST.log', `[${new Date().toISOString()}] ExtensionHost: CRITICAL ERROR: ${err.message}\n`); } catch { }
      return results;
    }
  }

  async onInstall(accountId: string, extensionId: string): Promise<void> {
    await this.bestEffortHook(extensionId, 'onInstall', accountId);
  }

  async onUninstall(accountId: string, extensionId: string): Promise<void> {
    await this.bestEffortHook(extensionId, 'onUninstall', accountId);
  }

  async onEnable(accountId: string, extensionId: string): Promise<void> {
    await this.bestEffortHook(extensionId, 'onEnable', accountId);
  }

  async onDisable(accountId: string, extensionId: string): Promise<void> {
    await this.bestEffortHook(extensionId, 'onDisable', accountId);
  }

  async onConfigUpdate(accountId: string, extensionId: string, config: Record<string, unknown>): Promise<void> {
    await this.bestEffortHook(extensionId, 'onConfigUpdate', accountId, config);
    await this.bestEffortHook(extensionId, 'onConfigChange', accountId, config);
  }

  async installPreinstalledExtensions(accountId: string): Promise<void> {
    const preinstalled = manifestLoader.getPreinstalledManifests();

    for (const manifest of preinstalled) {
      try {
        const defaultConfig = manifestLoader.getDefaultConfig(manifest.id);

        const installation = await extensionService.install({
          accountId,
          extensionId: manifest.id,
          version: manifest.version,
          config: defaultConfig,
          grantedPermissions: manifest.permissions,
        });

        await this.onInstall(accountId, manifest.id);
        await this.onConfigUpdate(accountId, manifest.id, (installation as any).config || defaultConfig);
        await this.onEnable(accountId, manifest.id);
      } catch (error: any) {
        if (!error.message.includes('already installed')) {
          console.error(`Failed to install preinstalled extension ${manifest.id}:`, error);
        }
      }
    }
  }

  getAvailableExtensions(): ExtensionManifest[] {
    return manifestLoader.getAllManifests();
  }

  getExtensionManifest(extensionId: string): ExtensionManifest | null {
    return manifestLoader.getManifest(extensionId);
  }

  validateConfig(extensionId: string, config: Record<string, any>): { valid: boolean; errors: string[] } {
    const manifest = manifestLoader.getManifest(extensionId);
    if (!manifest) {
      return { valid: false, errors: [`Extension ${extensionId} not found`] };
    }

    if (!manifest.configSchema) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    for (const [key, schema] of Object.entries(manifest.configSchema)) {
      const value = config[key];
      if (value === undefined) continue;

      const expectedType = schema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (actualType !== expectedType) {
        errors.push(`Config "${key}" must be of type ${expectedType}, got ${actualType}`);
      }

      if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`Config "${key}" must be one of: ${schema.enum.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async getAIAccountConfig(accountId: string): Promise<any> {
    return aiService.getAccountConfig(accountId);
  }

  async getAIAutoReplyDelayMs(accountId: string): Promise<number> {
    return aiService.getAutoReplyDelayMs(accountId);
  }

  stripFluxCorePromoMarker(text: string): { text: string; promo: boolean } {
    return aiService.stripFluxCorePromoMarker(text);
  }

  appendFluxCoreBrandingFooter(text: string): string {
    return aiService.appendFluxCoreBrandingFooter(text);
  }

  getSuggestionBrandingDecision(suggestionId?: string | null): { promo: boolean } {
    return aiService.getSuggestionBrandingDecision(suggestionId);
  }

  async generateAIResponse(
    conversationId: string,
    recipientAccountId: string,
    lastMessageContent: string,
    options: { mode?: 'suggest' | 'auto'; triggerMessageId?: string; triggerMessageCreatedAt?: Date; traceId?: string; policyContext?: FluxPolicyContext } = {}
  ): Promise<Awaited<ReturnType<typeof aiService.generateResponse>>> {
    return aiService.generateResponse(conversationId, recipientAccountId, lastMessageContent, options);
  }

  async tryCreateWelcomeConversation(params: { newAccountId: string; userName: string }): Promise<void> {
    return aiService.tryCreateWelcomeConversation(params);
  }
}

export const extensionHost = new ExtensionHostService();

```

## 9. WebSocket Handler

**Archivo:** `apps/api/src/websocket/ws-handler.ts`

**Código:**

```typescript
/**
 * WebSocket Handler usando Bun nativo
 * 
 * Este módulo implementa WebSocket sin depender de @elysiajs/websocket
 * ya que ese plugin no tiene versión compatible con Elysia 0.8.x
 */

import { messageCore } from '../core/message-core';
import { automationController } from '../services/automation-controller.service';
import { extensionHost } from '../services/extension-host.service';
import { smartDelayService } from '../services/smart-delay.service';
import { chatCoreGateway } from '../services/fluxcore/chatcore-gateway.service';
import { chatCoreWebchatGateway } from '../services/fluxcore/chatcore-webchat-gateway.service';

interface WSMessage {
  type:
  | 'subscribe'
  | 'unsubscribe'
  | 'message'
  | 'ping'
  | 'request_suggestion'
  | 'approve_suggestion'
  | 'discard_suggestion'
  | 'user_activity'
  | 'widget:connect'
  | 'widget:message';
  relationshipId?: string;
  conversationId?: string;
  content?: any;
  senderAccountId?: string;
  accountId?: string;
  suggestionId?: string;
  suggestedText?: string;
  messageId?: string;
  createdAt?: string;
  activity?: 'typing' | 'recording' | 'idle' | 'cancel';
  // Widget specific
  alias?: string;
  visitorId?: string;   // legacy
  visitorToken?: string; // RFC-0001 provisional identity
}

// Store de conexiones activas por relationshipId
const relationshipSubscriptions = new Map<string, Set<any>>();
// Store de conexiones activas por conversationId
const conversationSubscriptions = new Map<string, Set<any>>();

// Store de conexiones activas por visitorToken
const visitorSubscriptions = new Map<string, Set<any>>();

// Conexiones WS activas (para broadcast de eventos del sistema)
const activeConnections = new Set<any>();

export function broadcastAll(payload: any): void {
  const message = JSON.stringify(payload);
  for (const ws of activeConnections) {
    try {
      ws.send(message);
    } catch {
      activeConnections.delete(ws);
    }
  }
}

export function handleWSMessage(ws: any, message: string | Buffer): void {
  try {
    const data = JSON.parse(message.toString()) as WSMessage;

    switch (data.type) {
      case 'subscribe':
        if (data.relationshipId) {
          if (!relationshipSubscriptions.has(data.relationshipId)) {
            relationshipSubscriptions.set(data.relationshipId, new Set());
          }
          relationshipSubscriptions.get(data.relationshipId)!.add(ws);

          messageCore.subscribeToRelationship(data.relationshipId, (payload) => {
            broadcastToRelationship(data.relationshipId!, payload);
          });

          ws.send(JSON.stringify({
            type: 'subscribed',
            relationshipId: data.relationshipId
          }));
        }

        if (data.conversationId) {
          if (!conversationSubscriptions.has(data.conversationId)) {
            conversationSubscriptions.set(data.conversationId, new Set());
          }
          conversationSubscriptions.get(data.conversationId)!.add(ws);

          const callback = (payload: any) => {
            broadcastToConversationClients(data.conversationId!, payload);
          };
          messageCore.subscribeToConversation(data.conversationId, callback);
          (ws.__conversationCallbacks ||= new Map()).set(data.conversationId, callback);

          ws.send(JSON.stringify({
            type: 'subscribed',
            conversationId: data.conversationId,
          }));
        }
        break;

      case 'unsubscribe':
        if (data.relationshipId) {
          const subs = relationshipSubscriptions.get(data.relationshipId);
          if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
              relationshipSubscriptions.delete(data.relationshipId);
              messageCore.unsubscribeFromRelationship(data.relationshipId);
            }
          }
          ws.send(JSON.stringify({
            type: 'unsubscribed',
            relationshipId: data.relationshipId
          }));
        }

        if (data.conversationId) {
          const subs = conversationSubscriptions.get(data.conversationId);
          if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
              conversationSubscriptions.delete(data.conversationId);
            }
          }
          const callback = ws.__conversationCallbacks?.get(data.conversationId);
          if (callback) {
            messageCore.unsubscribeFromConversation(data.conversationId, callback);
            ws.__conversationCallbacks.delete(data.conversationId);
          }
          ws.send(JSON.stringify({
            type: 'unsubscribed',
            conversationId: data.conversationId,
          }));
        }
        break;
// ... (rest of the file)


      case 'message':
        if (data.conversationId && data.content && data.senderAccountId) {
          // 🛡️ CHATCORE GATEWAY: Certify Ingress (Reality Adapter)
          // Validamos que sea un intento de comunicación humana
          const wsData = ws.data || {};
          
          chatCoreGateway.certifyIngress({
            accountId: data.senderAccountId, // Business Context
            userId: data.senderAccountId,    // Authenticated Actor
            payload: data.content,
            meta: {
              ip: wsData.ip,
              userAgent: wsData.userAgent,
              clientTimestamp: data.createdAt || new Date().toISOString(),
              conversationId: data.conversationId,
              requestId: wsData.requestId
            }
          }).then((certification) => {
            if (!certification.accepted) {
              console.warn(`[WS] 🛑 Gateway rejected ingress: ${certification.reason}`);
              ws.send(JSON.stringify({
                type: 'error',
                message: `Gateway rejected: ${certification.reason}`
              }));
              return;
            }

            // Si el Kernel acepta (o ya existe), procedemos
            messageCore.send({
              conversationId: data.conversationId!,
              senderAccountId: data.senderAccountId!,
              content: data.content!,
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
          });
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      case 'request_suggestion':
        // Solicitar sugerencia de IA para un mensaje
        if (data.conversationId && data.accountId) {
          handleSuggestionRequest(ws, data);
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'conversationId and accountId required for suggestion'
          }));
        }
        break;

      case 'approve_suggestion':
        // Aprobar y enviar sugerencia como mensaje
        if (data.conversationId && data.senderAccountId && data.suggestedText) {
          const decision = extensionHost.getSuggestionBrandingDecision(data.suggestionId);
          const finalText = decision.promo
            ? extensionHost.appendFluxCoreBrandingFooter(data.suggestedText)
            : data.suggestedText;

          const content: any = decision.promo
            ? { text: finalText, __fluxcore: { branding: true } }
            : { text: finalText };

          messageCore.send({
            conversationId: data.conversationId,
            senderAccountId: data.senderAccountId,
            content,
            type: 'outgoing',
            generatedBy: 'ai',
          }).then((result) => {
            if (result.success) {
              ws.send(JSON.stringify({
                type: 'suggestion:approved',
                messageId: result.messageId,
                suggestionId: data.suggestionId,
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

      case 'discard_suggestion':
        // Descartar sugerencia (solo notificar)
        ws.send(JSON.stringify({
          type: 'suggestion:discarded',
          suggestionId: data.suggestionId
        }));
        break;

      case 'user_activity':
        if (data.accountId && data.conversationId && data.activity) {
          // Existente: Lógica SmartDelay
          const result = smartDelayService.touchActivity({
            accountId: data.accountId,
            conversationId: data.conversationId,
            activity: data.activity,
          });

          // Nuevo: Broadcast universal de actividad
          messageCore.broadcastActivity(data.conversationId, {
            accountId: data.accountId,
            activity: data.activity
          });

          if (result.result === 'cancelled' && result.suggestionId) {
            ws.send(JSON.stringify({
              type: 'suggestion:auto_cancelled',
              suggestionId: result.suggestionId,
            }));
          }
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'accountId, conversationId and activity required for user activity events',
          }));
        }
        break;

      case 'widget:connect':
        // Widget público: establecer conexión
        if (data.alias && (data.visitorToken || data.visitorId)) {
          handleWidgetConnect(ws, data);
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'alias and visitorToken required for widget connection'
          }));
        }
        break;

      case 'widget:message':
        // Widget público: enviar mensaje
        if (data.alias && (data.visitorToken || data.visitorId) && data.content) {
          handleWidgetMessage(ws, data);
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'alias, visitorToken and content required for widget message'
          }));
        }
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
  try {
    console.log('[ws-handler] WebSocket connection opened');
    console.log('[ws-handler] Active connections before add:', activeConnections.size);
    activeConnections.add(ws);
    console.log('[ws-handler] Active connections after add:', activeConnections.size);
    
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString()
    }));
    console.log('[ws-handler] Sent connected message to client');
  } catch (error) {
    console.error('[ws-handler] CRITICAL ERROR in handleWSOpen:', error);
    // Try to notify client of error if possible
    try {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Internal Server Error during connection establishment'
      }));
    } catch (e) {
      // Ignore send error
    }
  }
}

export function handleWSClose(ws: any): void {
  console.log('WebSocket connection closed');
  activeConnections.delete(ws);
  // Limpiar subscripciones de este ws
  for (const [relationshipId, subs] of relationshipSubscriptions.entries()) {
    if (subs.has(ws)) {
      subs.delete(ws);
      if (subs.size === 0) {
        relationshipSubscriptions.delete(relationshipId);
        messageCore.unsubscribeFromRelationship(relationshipId);
      }
    }
  }

  for (const [conversationId, subs] of conversationSubscriptions.entries()) {
    if (subs.has(ws)) {
      subs.delete(ws);
      if (subs.size === 0) {
        conversationSubscriptions.delete(conversationId);
      }
    }
  }

  if (ws.__conversationCallbacks) {
    for (const [conversationId, callback] of ws.__conversationCallbacks.entries()) {
      messageCore.unsubscribeFromConversation(conversationId, callback);
    }
    ws.__conversationCallbacks.clear();
  }

  // Clean up visitor subscriptions
  for (const [token, subs] of visitorSubscriptions.entries()) {
    if (subs.has(ws)) {
      subs.delete(ws);
      if (subs.size === 0) {
        visitorSubscriptions.delete(token);
      }
    }
  }
}

export function broadcastToRelationship(relationshipId: string, payload: any): void {
  const subs = relationshipSubscriptions.get(relationshipId);
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

export function broadcastToConversationClients(conversationId: string, payload: any): void {
  const subs = conversationSubscriptions.get(conversationId);
  if (!subs) return;
  const message = JSON.stringify(payload);
  for (const ws of subs) {
    try {
      ws.send(message);
    } catch (error) {
      subs.delete(ws);
    }
  }
}

export function broadcastToVisitor(visitorToken: string, payload: any): void {
  const subs = visitorSubscriptions.get(visitorToken);
  if (subs) {
    const message = JSON.stringify(payload);
    for (const ws of subs) {
      try {
        ws.send(message);
      } catch (e) {
        subs.delete(ws);
      }
    }
  }
}

/**
 * 🔧 REFACTORIZADO: Manejar solicitud de sugerencia de IA
 * Delay se aplica ANTES de generar sugerencia, usa timingConfig del asistente activo
 */
async function handleSuggestionRequest(ws: any, data: WSMessage): Promise<void> {
  const { conversationId, accountId, relationshipId } = data;
  const traceId = `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    console.log(`[ws-handler][${traceId}] request_suggestion received`, {
      conversationId,
      accountId,
      relationshipId,
      messageId: data.messageId,
      hasContent: !!data.content,
    });

    // Verificar modo de automatización
    const evaluation = await automationController.evaluateTrigger({
      accountId: accountId!,
      relationshipId,
      messageType: 'incoming',
    });

    console.log(`[ws-handler][${traceId}] automation evaluation`, {
      shouldProcess: evaluation.shouldProcess,
      reason: evaluation.reason,
      mode: evaluation.mode,
    });

    if (!evaluation.shouldProcess) {
      ws.send(JSON.stringify({
        type: 'suggestion:disabled',
        reason: evaluation.reason,
        mode: evaluation.mode,
      }));
      return;
    }

    // 🔧 NUEVO: Obtener asistente activo para usar su timingConfig
    const { fluxcoreService } = await import('../services/fluxcore.service');
    const composition = await fluxcoreService.resolveActiveAssistant(accountId!);

    console.log(`[ws-handler][${traceId}] active assistant`, {
      id: composition?.assistant?.id,
      name: composition?.assistant?.name,
      runtime: composition?.assistant?.runtime,
      externalId: composition?.assistant?.externalId,
      timingConfig: composition?.assistant?.timingConfig,
      modelConfig: composition?.assistant?.modelConfig,
    });

    // Extraer timingConfig del asistente activo (o usar defaults)
    const delaySeconds = composition?.assistant?.timingConfig?.responseDelaySeconds ?? 2;
    const smartDelayEnabled = composition?.assistant?.timingConfig?.smartDelay ?? false;

    // Función auxiliar para generar sugerencia
    const generateSuggestion = async () => {
      // Notificar que estamos generando
      ws.send(JSON.stringify({
        type: 'suggestion:generating',
        conversationId,
      }));

      const lastMessage = data.content?.text || 'Mensaje del usuario';
      const result = await extensionHost.generateAIResponse(
        conversationId!,
        accountId!,
        lastMessage,
        {
          mode: evaluation.mode === 'automatic' ? 'auto' : 'suggest',
          triggerMessageId: typeof data?.messageId === 'string' ? data.messageId : undefined,
          triggerMessageCreatedAt: data?.createdAt ? new Date(data.createdAt as any) : undefined,
          traceId,
        }
      );

      if (!result.ok) {
        ws.send(JSON.stringify({
          type: 'suggestion:unavailable',
          reason: result.block.message,
          conversationId,
        }));
        return null;
      }

      const aiSuggestion = result.suggestion;
      if (!aiSuggestion) {
        ws.send(JSON.stringify({
          type: 'suggestion:unavailable',
          reason: 'AI service not configured.',
          conversationId,
        }));
        return null;
      }

      const stripped = extensionHost.stripFluxCorePromoMarker(aiSuggestion.content);
      return {
        id: aiSuggestion.id,
        conversationId,
        extensionId: '@fluxcore/asistentes',
        suggestedText: stripped.text,
        confidence: 0.9,
        reasoning: `Generado por ${aiSuggestion.model} (${aiSuggestion.usage?.totalTokens ?? 0} tokens)`,
        alternatives: [],
        createdAt: aiSuggestion.generatedAt?.toISOString() ?? new Date().toISOString(),
        mode: evaluation.mode,
      };
    };

    // 🔧 NUEVO: Aplicar delay ANTES de generar (en modo automático)
    if (evaluation.mode === 'automatic') {
      if (smartDelayEnabled) {
        // Smart delay: Monitorea actividad del usuario
        smartDelayService.scheduleResponse({
          conversationId: conversationId!,
          accountId: accountId!,
          suggestionId: 'pending', // Se actualizará después
          lastMessageText: data.content?.text || '',
          onTypingStart: () => {
            ws.send(JSON.stringify({
              type: 'suggestion:auto_typing',
            }));
          },
          onProcess: async () => {
            const suggestion = await generateSuggestion();
            if (suggestion) {
              await processSuggestion(ws, {
                conversationId: conversationId!,
                accountId: accountId!,
                suggestion,
                lastMessageText: data.content?.text || '',
              });
            }
          },
        });
      } else {
        // Fixed delay: Esperar antes de generar
        const delayMs = delaySeconds * 1000;

        ws.send(JSON.stringify({
          type: 'suggestion:auto_waiting',
          delayMs,
        }));

        setTimeout(async () => {
          try {
            ws.send(JSON.stringify({
              type: 'suggestion:auto_typing',
            }));

            // 🔧 CRÍTICO: Generar sugerencia DESPUÉS del delay
            const suggestion = await generateSuggestion();

            if (suggestion) {
              setTimeout(async () => {
                await processSuggestion(ws, {
                  conversationId: conversationId!,
                  accountId: accountId!,
                  suggestion,
                  lastMessageText: data.content?.text || '',
                });
              }, 2000); // Typing animation delay
            }
          } catch (error) {
            console.error('[ws-handler] Error in fixed delay auto-send:', error);
          }
        }, delayMs);
      }
    } else {
      // Modo sugerencia: Generar inmediatamente sin delay
      const suggestion = await generateSuggestion();
      if (suggestion) {
        ws.send(JSON.stringify({
          type: 'suggestion:ready',
          data: suggestion,
        }));
      }
    }

  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to generate suggestion: ${error.message}`,
    }));
  }
}

/**
 * WEBCHAT GATEWAY: Manejar conexión de widget público
 * Si se incluye accountId (visitante autenticado) → certifica B2 (identity link)
 */
async function handleWidgetConnect(ws: any, data: WSMessage): Promise<void> {
  const { alias, visitorToken, visitorId, accountId } = data;
  const token = visitorToken || visitorId!;

  // Subscribe socket to visitor token updates
  if (!visitorSubscriptions.has(token)) {
    visitorSubscriptions.set(token, new Set());
  }
  visitorSubscriptions.get(token)!.add(ws);

  try {
    // Buscar cuenta (tenantId) por alias
    const { db, accounts } = await import('@fluxcore/db');
    const { eq, or } = await import('drizzle-orm');

    const [account] = await db
      .select()
      .from(accounts)
      .where(or(eq(accounts.alias, alias!), eq(accounts.username, alias!)))
      .limit(1);

    if (!account) {
      ws.send(JSON.stringify({
        type: 'widget:error',
        message: `Account not found for alias: ${alias}`,
      }));
      return;
    }

    const wsData = ws.data || {};

    // B2 — Si el visitante ya está autenticado, certificar el vínculo de identidad
    if (accountId) {
      const b2 = await chatCoreWebchatGateway.certifyConnectionEvent({
        visitorToken: token,
        realAccountId: accountId,
        tenantId: account.id,
        meta: {
          ip: wsData.ip,
          userAgent: wsData.userAgent,
          requestId: wsData.requestId,
        },
      });

      if (!b2.accepted) {
        console.warn(`[Widget] B2 certification failed for visitor ${token}: ${b2.reason}`);
      } else {
        console.log(`[Widget] B2 identity link certified: visitor ${token} → account ${accountId} (signal #${b2.signalId})`);
      }
    }

    ws.send(JSON.stringify({
      type: 'widget:connected',
      accountId: account.id,
      accountName: account.displayName,
      tenantId: account.id,
      visitorToken: token,
    }));

    console.log(`[Widget] Visitor ${token} connected to ${alias}${accountId ? ` (authenticated as ${accountId})` : ''}`);

  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'widget:error',
      message: error.message,
    }));
  }
}

/**
 * Procesar la sugerencia de IA
 */
async function processSuggestion(ws: any, params: {
  conversationId: string;
  accountId: string;
  suggestion: any;
  lastMessageText: string;
}): Promise<void> {
  try {
    // Notificar que está enviando
    ws.send(JSON.stringify({
      type: 'suggestion:auto_sending',
      suggestionId: params.suggestion.id,
    }));

    // Send the message
    const decision = extensionHost.getSuggestionBrandingDecision(params.suggestion.id);
    const finalText = decision.promo
      ? extensionHost.appendFluxCoreBrandingFooter(params.suggestion.suggestedText)
      : params.suggestion.suggestedText;

    await messageCore.send({
      conversationId: params.conversationId,
      senderAccountId: params.accountId,
      content: { text: finalText } as any,
      type: 'outgoing',
      generatedBy: 'ai',
    });

    console.log(`[ActivityWatcher] Mensaje enviado exitosamente para ${params.accountId}:${params.conversationId}`);
  } catch (error) {
    console.error('[ActivityWatcher] Error procesando sugerencia:', error);
  }
}

/**
 * WEBCHAT GATEWAY: Manejar mensaje de widget público
 * Certifica ingreso vía chatcore-webchat-gateway (RFC-0001 B1)
 */
async function handleWidgetMessage(ws: any, data: WSMessage): Promise<void> {
  const { alias, visitorToken, visitorId, content } = data;
  const token = visitorToken || visitorId!; // backwards compat

  try {
    // Buscar cuenta (tenantId) por alias
    const { db, accounts } = await import('@fluxcore/db');
    const { eq, or } = await import('drizzle-orm');

    const [account] = await db
      .select()
      .from(accounts)
      .where(or(eq(accounts.alias, alias!), eq(accounts.username, alias!)))
      .limit(1);

    if (!account) {
      ws.send(JSON.stringify({
        type: 'widget:error',
        message: `Account not found for alias: ${alias}`,
      }));
      return;
    }

    const wsData = ws.data || {};

    // Certificar ingreso vía webchat gateway (B1 — provisional identity)
    const certification = await chatCoreWebchatGateway.certifyIngress({
      visitorToken: token,
      tenantId: account.id,
      payload: content,
      meta: {
        ip: wsData.ip,
        userAgent: wsData.userAgent,
        clientTimestamp: new Date().toISOString(),
        conversationId: data.conversationId,
        requestId: wsData.requestId,
      },
    });

    if (!certification.accepted) {
      ws.send(JSON.stringify({
        type: 'widget:error',
        message: `Gateway rejected: ${certification.reason}`,
      }));
      return;
    }

    ws.send(JSON.stringify({
      type: 'widget:message_received',
      messageId: `widget_${Date.now()}`,
      signalId: certification.signalId,
      timestamp: new Date().toISOString(),
    }));

  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'widget:error',
      message: error.message,
    }));
  }
}

// Exportar para uso en servidor híbrido
export const wsConfig = {
  message: handleWSMessage,
  open: handleWSOpen,
  close: handleWSClose,
};

```

## 10. useChat Hook

**Archivo:** `apps/web/src/hooks/useChat.ts`

**Código:**

```typescript
/**
 * V2-1: useChat Hook
 * 
 * Gestiona mensajes de una conversación con conexión a API real.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UseChatOptions {
  conversationId: string;
  accountId: string;
  onNewMessage?: (message: Message) => void;
}

interface SendMessageParams {
  content: { text?: string; type?: string };
  generatedBy?: 'human' | 'ai' | 'system';
  replyToId?: string;
}

export function useChat({ conversationId, accountId, onNewMessage }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const pendingSignaturesRef = useRef<Map<string, string>>(new Map());

  const getAuthToken = () => localStorage.getItem('fluxcore_token');

  const buildSignature = useCallback((payload: {
    senderAccountId: string;
    content?: { text?: string } | null;
    replyToId?: string | null;
    generatedBy?: Message['generatedBy'];
  }) => {
    const text = payload.content?.text ?? '';
    const replyTo = payload.replyToId ?? '';
    const generatedBy = payload.generatedBy ?? 'human';
    return `${payload.senderAccountId}:${text}:${replyTo}:${generatedBy}`;
  }, []);

  // Cargar mensajes
  const loadMessages = useCallback(async () => {
    if (!conversationId || !accountId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setIsLoading(false);
        return;
      }

      // Cargar últimos 50 mensajes
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Manejar diferentes códigos de error
      if (response.status === 404) {
        // Conversación no existe, mostrar vacío sin error
        setMessages([]);
        setIsLoading(false);
        return;
      }

      if (response.status === 401) {
        setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudieron cargar los mensajes`);
      }

      const data = await response.json();
      
      // Normalizar mensajes
      const messageList = Array.isArray(data) ? data : (data.data || data.messages || []);
      const normalizedMessages: Message[] = messageList.map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        senderAccountId: msg.senderAccountId,
        content: typeof msg.content === 'string' ? 
          (msg.content.startsWith('{') ? JSON.parse(msg.content) : { text: msg.content }) : 
          msg.content,
        type: msg.senderAccountId === accountId ? 'outgoing' : 'incoming',
        generatedBy: msg.generatedBy || 'human',
        status: msg.status || 'synced',
        replyToId: msg.replyToId,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      }));

      setMessages(normalizedMessages);
    } catch (err: any) {
      console.error('[useChat] Failed to load messages:', err);
      
      // NO MOCK DATA - Mostrar error real
      setMessages([]); // Limpiar mensajes previos
      if (err.message?.includes('fetch')) {
        setError('No se puede conectar al servidor');
      } else {
        setError(err.message || 'Error al cargar mensajes');
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, accountId]);

  // Enviar mensaje
  const sendMessage = useCallback(async (params: SendMessageParams): Promise<Message | null> => {
    if (!conversationId || !accountId) return null;

    setIsSending(true);
    setError(null);

    // Verificar token antes de enviar
    const token = getAuthToken();
    if (!token) {
      // En producción, no permitir envío sin token
      if (!import.meta.env.DEV) {
        setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setIsSending(false);
        return null;
      }
    }

    try {
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        conversationId,
        senderAccountId: accountId,
        content: params.content,
        type: 'outgoing',
        generatedBy: params.generatedBy || 'human',
        status: 'pending_backend',
        replyToId: params.replyToId,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, optimisticMessage]);
      const signature = buildSignature(optimisticMessage);
      pendingSignaturesRef.current.set(signature, tempId);

      // Modo demo sin token: simular envío local
      if (!token && import.meta.env.DEV) {
        // Simular delay de red (solo entorno dev sin token)
        await new Promise(resolve => setTimeout(resolve, 300));
        pendingSignaturesRef.current.delete(signature);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: `msg-${Date.now()}`, status: 'synced' } : m));
        return optimisticMessage;
      }

      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          // 🔒 SECURITY: senderAccountId ya no se envía - viene del JWT
          content: params.content,
          type: 'outgoing',
          generatedBy: params.generatedBy || 'human',
          replyToId: params.replyToId,
          // 🆕 Idempotency key para prevenir duplicados
          requestId: `msg-${Date.now()}-${accountId}`,
        }),
      });

      if (!response.ok) {
        pendingSignaturesRef.current.delete(signature);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        throw new Error('Failed to send message');
      }

      // El backend ya certificó el mensaje y FluxCore lo emitirá por WebSocket.
      return optimisticMessage;
    } catch (err: any) {
      setError(err.message);

      return null;
    } finally {
      setIsSending(false);
    }
  }, [conversationId, accountId]);

  // Añadir mensaje recibido (desde WebSocket)
  const addReceivedMessage = useCallback((message: Message) => {
    const signature = buildSignature(message);
    const pendingId = pendingSignaturesRef.current.get(signature);

    setMessages(prev => {
      const withoutPending = pendingId ? prev.filter(m => m.id !== pendingId) : prev;
      if (withoutPending.some(m => m.id === message.id)) {
        return withoutPending;
      }
      return [...withoutPending, message];
    });

    if (pendingId) {
      pendingSignaturesRef.current.delete(signature);
    }

    onNewMessage?.(message);
  }, [buildSignature, onNewMessage]);

  // Actualizar estado de mensaje
  const updateMessageStatus = useCallback((messageId: string, status: Message['status']) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, status } : m
    ));
  }, []);

  // Editar mensaje
  const editMessage = useCallback(async (messageId: string, newContent: { text: string }) => {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: newContent, updatedAt: new Date().toISOString() } : m
      ));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  // Eliminar mensaje
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  // Reintentar mensaje fallido
  const retryMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.status !== 'failed') return null;

    // Eliminar mensaje fallido
    setMessages(prev => prev.filter(m => m.id !== messageId));

    // Reenviar
    return sendMessage({
      content: { text: message.content.text },
      generatedBy: message.generatedBy,
      replyToId: message.replyToId,
    });
  }, [messages, sendMessage]);

  // Cargar mensajes iniciales
  useEffect(() => {
    if (conversationId && !loadedRef.current) {
      loadedRef.current = true;
      loadMessages();
    }
  }, [conversationId, loadMessages]);

  // Reset cuando cambia conversación
  useEffect(() => {
    loadedRef.current = false;
    setMessages([]);
    pendingSignaturesRef.current.clear();
  }, [conversationId]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    addReceivedMessage,
    updateMessageStatus,
    editMessage,
    deleteMessage,
    retryMessage,
    refresh: loadMessages,
  };
}

```

## 11. useWebSocket Hook

**Archivo:** `apps/web/src/hooks/useWebSocket.ts`

**Código:**

```typescript
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
    reconnect = true,
    reconnectInterval = 3000,
    pingInterval = 30000, // Add default pingInterval
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
      const connectWebSocket = () => {
        console.log('[WebSocket] Connecting to:', WS_URL);
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
    requestSuggestion,
    approveSuggestion,
    discardSuggestion,
    sendMessage,
    ping,
    reportActivity,
  };
}

```

## 12. useOfflineFirst Hook

**Archivo:** `apps/web/src/hooks/useOfflineFirst.ts`

**Código:**

```typescript
/**
 * C3: Offline-First - React Hook
 * 
 * Hook para usar mensajes con soporte offline-first.
 */

import { useState, useEffect, useCallback } from 'react';
import { db, type LocalMessage } from '../db';
import { syncManager, type ConnectionStatus } from '../db/sync';

/**
 * Hook para mensajes con soporte offline
 */
export function useOfflineMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages from IndexedDB
  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      // FIX: Limpiar duplicados antes de cargar
      await syncManager.cleanDuplicateMessages(conversationId);
      
      const localMessages = await db.messages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('localCreatedAt');
      setMessages(localMessages);
    } catch (err: any) {
      console.error('[useOfflineMessages] Load error:', err);
    }
  }, [conversationId]);

  // Fetch messages from backend on mount
  useEffect(() => {
    if (!conversationId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await syncManager.fetchMessages(conversationId);
        await loadMessages();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [conversationId, loadMessages]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (
    senderAccountId: string,
    content: LocalMessage['content'],
    type: 'incoming' | 'outgoing' | 'system' = 'outgoing'
  ) => {
    if (!conversationId) {
      throw new Error('No conversation selected');
    }

    try {
      const newMessage = await syncManager.createMessage(
        conversationId,
        senderAccountId,
        content,
        type
      );
      
      // Update local state immediately (optimistic) - evitar duplicados
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
      
      return newMessage;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [conversationId]);

  // Refresh messages - con deduplicación
  const refresh = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      // Fetch del backend primero
      await syncManager.fetchMessages(conversationId);
      // Luego cargar de IndexedDB (ya deduplicado por syncManager)
      await loadMessages();
    } catch (err) {
      console.error('[useOfflineMessages] Refresh error:', err);
      // Fallback: solo cargar local
      await loadMessages();
    }
  }, [conversationId, loadMessages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refresh,
  };
}

/**
 * Hook para estado de conexión
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(syncManager.getStatus());

  useEffect(() => {
    return syncManager.onStatusChange(setStatus);
  }, []);

  return status;
}

/**
 * Hook para sincronización manual
 */
export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    synced: number;
    failed: number;
  } | null>(null);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncManager.syncPending();
      setLastSyncResult({
        success: result.success,
        synced: result.synced,
        failed: result.failed,
      });
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    sync,
    isSyncing,
    lastSyncResult,
  };
}

/**
 * Hook para estadísticas de sync queue
 */
export function useSyncQueueStats() {
  const [stats, setStats] = useState({ pending: 0, failed: 0, total: 0 });

  const loadStats = useCallback(async () => {
    try {
      const all = await db.syncQueue.toArray();
      setStats({
        pending: all.filter(i => i.status === 'pending').length,
        failed: all.filter(i => i.status === 'failed').length,
        total: all.length,
      });
    } catch (err) {
      console.error('[useSyncQueueStats] Error:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
    // Refresh every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [loadStats]);

  return { ...stats, refresh: loadStats };
}

```

## 13. IndexedDB Config

**Archivo:** `apps/web/src/db/index.ts`

**Código:**

```typescript
/**
 * C3: Offline-First - IndexedDB Configuration
 * 
 * Configura Dexie.js para almacenamiento local de datos.
 * Implementa Dual Source of Truth según TOTEM PARTE 9.1.
 * 
 * CRITICAL: Base de datos separada por cuenta para aislamiento completo
 */

import Dexie, { type Table } from 'dexie';
import type { 
  LocalMessage, 
  LocalConversation, 
  LocalRelationship,
  SyncQueueItem 
} from './schema';

/**
 * FluxCore Local Database - Per-Account Isolation
 */
export class FluxCoreDB extends Dexie {
  // Tables
  messages!: Table<LocalMessage, string>;
  conversations!: Table<LocalConversation, string>;
  relationships!: Table<LocalRelationship, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor(accountId?: string) {
    // Usar nombre de base de datos único por cuenta
    const dbName = accountId ? `FluxCoreDB_${accountId}` : 'FluxCoreDB';
    super(dbName);
    
    // Schema version 1
    this.version(1).stores({
      // Messages table
      messages: [
        'id',
        'conversationId',
        'senderAccountId',
        'syncState',
        'localCreatedAt',
        '[conversationId+localCreatedAt]', // Compound index for ordering
      ].join(', '),
      
      // Conversations table
      conversations: [
        'id',
        'relationshipId',
        'syncState',
        'lastMessageAt',
      ].join(', '),
      
      // Relationships table
      relationships: [
        'id',
        'accountAId',
        'accountBId',
        'syncState',
      ].join(', '),
      
      // Sync queue for pending operations
      syncQueue: [
        'id',         // UUID primary key
        'entityType',
        'entityId',
        'operation',
        'status',
        'createdAt',
      ].join(', '),
    });
    
    // Schema version 2 - Add compound index for syncQueue
    this.version(2).stores({
      messages: [
        'id',
        'conversationId',
        'senderAccountId',
        'syncState',
        'localCreatedAt',
        '[conversationId+localCreatedAt]',
      ].join(', '),
      
      conversations: [
        'id',
        'relationshipId',
        'syncState',
        'lastMessageAt',
      ].join(', '),
      
      relationships: [
        'id',
        'accountAId',
        'accountBId',
        'syncState',
      ].join(', '),
      
      // Added compound index [entityType+entityId] for better query performance
      syncQueue: [
        'id',
        'entityType',
        'entityId',
        'operation',
        'status',
        'createdAt',
        '[entityType+entityId]', // Compound index for efficient lookups
      ].join(', '),
    });
  }
}

// Database instance cache por cuenta
const dbInstances = new Map<string, FluxCoreDB>();

/**
 * Obtener instancia de base de datos para una cuenta específica
 */
export function getAccountDB(accountId: string): FluxCoreDB {
  if (!dbInstances.has(accountId)) {
    console.log('[DB] Creating new database instance for account:', accountId);
    dbInstances.set(accountId, new FluxCoreDB(accountId));
  }
  return dbInstances.get(accountId)!;
}

/**
 * Cerrar y limpiar instancia de base de datos de una cuenta
 */
export async function closeAccountDB(accountId: string): Promise<void> {
  const db = dbInstances.get(accountId);
  if (db) {
    console.log('[DB] Closing database for account:', accountId);
    await db.close();
    dbInstances.delete(accountId);
  }
}

/**
 * Limpiar todos los datos de una cuenta específica
 */
export async function clearAccountData(accountId: string): Promise<void> {
  const db = getAccountDB(accountId);
  console.log('[DB] Clearing all data for account:', accountId);
  
  await db.transaction('rw', [db.messages, db.conversations, db.relationships, db.syncQueue], async () => {
    await db.messages.clear();
    await db.conversations.clear();
    await db.relationships.clear();
    await db.syncQueue.clear();
  });
}

/**
 * Eliminar completamente la base de datos de una cuenta
 */
export async function deleteAccountDatabase(accountId: string): Promise<void> {
  await closeAccountDB(accountId);
  const dbName = `FluxCoreDB_${accountId}`;
  console.log('[DB] Deleting database:', dbName);
  await Dexie.delete(dbName);
}

// Default instance (backward compatibility - will use active account)
let currentAccountId: string | null = null;
let currentDB: FluxCoreDB | null = null;

export function setCurrentAccountDB(accountId: string): void {
  if (currentAccountId !== accountId) {
    console.log('[DB] Switching database to account:', accountId);
    currentAccountId = accountId;
    currentDB = getAccountDB(accountId);
  }
}

// Singleton getter - returns current account's DB
export const db = new Proxy({} as FluxCoreDB, {
  get(_, prop: keyof FluxCoreDB) {
    if (!currentDB) {
      // Fallback to legacy DB if no account selected
      if (!dbInstances.has('__legacy__')) {
        dbInstances.set('__legacy__', new FluxCoreDB());
      }
      currentDB = dbInstances.get('__legacy__')!;
    }
    return currentDB[prop];
  }
});

// Export types
export type { 
  LocalMessage, 
  LocalConversation, 
  LocalRelationship,
  SyncQueueItem,
  SyncState,
  PendingOperation,
} from './schema';

```

## 14. IndexedDB Schema

**Archivo:** `apps/web/src/db/schema.ts`

**Código:**

```typescript
/**
 * C3: Offline-First - IndexedDB Schema
 * 
 * Define tipos para entidades locales con estado de sincronización.
 * Basado en TOTEM PARTE 9.1 - Dual Source of Truth.
 */

/**
 * Estado de sincronización de una entidad
 */
export type SyncState =
  | 'local_only'      // Solo existe localmente (creado offline)
  | 'pending_backend' // Pendiente de sincronizar con backend
  | 'synced'          // Sincronizado con backend
  | 'conflict';       // Conflicto detectado (backend prevalece)

/**
 * Operación pendiente
 */
export type PendingOperation = 'create' | 'update' | 'delete';

/**
 * Contenido de mensaje (mismo que backend)
 */
export interface MessageContent {
  text: string;
  type?: string;
  media?: Array<{
    type: 'image' | 'video' | 'audio' | 'document';
    assetId: string;
    name?: string;
    filename?: string;
    mimeType?: string;
    sizeBytes?: number;
    waveformData?: any;
  }>;
}

/**
 * Mensaje local con estado de sync
 */
export interface LocalMessage {
  id: string;
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: 'incoming' | 'outgoing' | 'system';

  // Sync state
  syncState: SyncState;
  pendingOperation?: PendingOperation;

  // Timestamps
  localCreatedAt: Date;
  serverCreatedAt?: Date;

  // COR-002: Status (from backend)
  status?: 'local_only' | 'pending_backend' | 'synced' | 'sent' | 'delivered' | 'seen';

  // Actor Model (COR-004)
  fromActorId?: string;
  toActorId?: string;

  // AI metadata
  generatedBy?: 'human' | 'ai' | 'system';
}

/**
 * Conversación local con estado de sync
 */
export interface LocalConversation {
  id: string;
  relationshipId: string;
  channel: string;
  status: 'active' | 'archived' | 'deleted';

  // Sync state
  syncState: SyncState;
  pendingOperation?: PendingOperation;

  // Timestamps
  localCreatedAt: Date;
  serverCreatedAt?: Date;
  lastMessageAt?: Date;

  // Metadata
  unreadCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Relación local con estado de sync
 */
export interface LocalRelationship {
  id: string;
  accountAId: string;
  accountBId: string;

  // Sync state
  syncState: SyncState;
  pendingOperation?: PendingOperation;

  // Timestamps
  localCreatedAt: Date;
  serverCreatedAt?: Date;
  lastInteraction?: Date;

  // Context (simplified for local storage)
  contextSummary?: string;
}

/**
 * Item en la cola de sincronización
 */
export interface SyncQueueItem {
  id: string; // UUID
  entityType: 'message' | 'conversation' | 'relationship';
  entityId: string;
  operation: PendingOperation;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  payload: unknown;

  // Retry logic
  retryCount: number;
  maxRetries: number;
  lastError?: string;

  // Timestamps
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Helper para crear mensaje local
 */
export function createLocalMessage(
  conversationId: string,
  senderAccountId: string,
  content: MessageContent,
  type: 'incoming' | 'outgoing' | 'system' = 'outgoing'
): LocalMessage {
  return {
    id: crypto.randomUUID(),
    conversationId,
    senderAccountId,
    content,
    type,
    syncState: 'local_only',
    pendingOperation: 'create',
    localCreatedAt: new Date(),
    status: 'local_only',
    generatedBy: 'human',
  };
}

/**
 * Helper para crear item de sync queue
 */
export function createSyncQueueItem(
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  operation: PendingOperation,
  payload: unknown
): SyncQueueItem {
  return {
    id: crypto.randomUUID(),
    entityType,
    entityId,
    operation,
    status: 'pending',
    payload,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
  };
}

```

## 15. SyncManager

**Archivo:** `apps/web/src/db/sync/syncManager.ts`

**Código:**

```typescript
/**
 * C3: Offline-First - Sync Manager
 * 
 * Coordina la sincronización entre IndexedDB y el backend.
 * Implementa optimistic updates y manejo de conflictos.
 */

import { db, type LocalMessage, type SyncQueueItem } from '../index';
import { createSyncQueueItem } from '../schema';

const buildContentSignature = (message: {
  senderAccountId?: string;
  type?: string;
  content?: any;
}): string => {
  const normalizedContent = typeof message.content === 'string'
    ? { text: message.content }
    : (message.content || {});
  const textFragment = normalizedContent.text || '';
  const media = Array.isArray(normalizedContent.media)
    ? (normalizedContent.media as Array<any>)
    : [];
  // TODO(assets): Los adapters aún pueden entregar url/attachmentId. Cuando migren, este signature
  // debe depender solo de assetId.
  const mediaSignature = media.length
    ? media
        .map((m) => `${m.type}:${m.assetId || m.url || m.name || m.filename || ''}`)
        .sort()
        .join('|')
    : '';
  return `${message.senderAccountId || ''}:${textFragment}:${message.type || ''}:${mediaSignature}`;
};

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Estado de conexión
 */
export type ConnectionStatus = 'online' | 'offline' | 'syncing';

/**
 * Resultado de sincronización
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Sync Manager - Singleton
 */
class SyncManager {
  private status: ConnectionStatus = 'online';
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private syncInProgress = false;
  private authToken: string | null = null;
  
  // FC-522: Retry configuration
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 1000; // 1 segundo

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      
      // Initial status
      this.status = navigator.onLine ? 'online' : 'offline';
    }
  }

  /**
   * Set auth token for API requests
   */
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Handle coming online
   */
  private async handleOnline() {
    console.log('[SyncManager] Connection restored');
    this.setStatus('online');
    
    // Auto-sync pending items
    await this.syncPending();
  }

  /**
   * Handle going offline
   */
  private handleOffline() {
    console.log('[SyncManager] Connection lost');
    this.setStatus('offline');
  }

  /**
   * Update status and notify listeners
   */
  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.listeners.forEach(cb => cb(status));
  }

  /**
   * Create message with optimistic update
   * Returns immediately with local message, syncs in background
   */
  async createMessage(
    conversationId: string,
    senderAccountId: string,
    content: LocalMessage['content'],
    type: 'incoming' | 'outgoing' | 'system' = 'outgoing'
  ): Promise<LocalMessage> {
    // Create local message
    const localMessage: LocalMessage = {
      id: crypto.randomUUID(),
      conversationId,
      senderAccountId,
      content,
      type,
      syncState: 'local_only',
      pendingOperation: 'create',
      localCreatedAt: new Date(),
      status: 'local_only',
      generatedBy: 'human',
    };

    // Save to IndexedDB
    await db.messages.add(localMessage);

    // Add to sync queue
    await db.syncQueue.add(createSyncQueueItem(
      'message',
      localMessage.id,
      'create',
      {
        conversationId,
        senderAccountId,
        content,
        type,
      }
    ));

    // Try to sync if online
    if (this.status === 'online') {
      this.syncMessage(localMessage.id).catch(err => {
        console.warn('[SyncManager] Background sync failed:', err);
      });
    }

    return localMessage;
  }

  /**
   * Sync a specific message to backend
   */
  async syncMessage(messageId: string): Promise<boolean> {
    if (!this.authToken) {
      console.warn('[SyncManager] No auth token, skipping sync');
      return false;
    }

    const message = await db.messages.get(messageId);
    if (!message || message.syncState === 'synced') {
      return true;
    }

    try {
      // Update local state to pending
      await db.messages.update(messageId, { 
        syncState: 'pending_backend',
        status: 'pending_backend',
      });

      // Send to backend
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          conversationId: message.conversationId,
          senderAccountId: message.senderAccountId,
          content: message.content,
          type: message.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Response received - update local message
      await db.messages.update(messageId, {
        syncState: 'synced',
        status: 'synced',
        serverCreatedAt: new Date(),
        pendingOperation: undefined,
      });

      // Remove from sync queue
      await db.syncQueue
        .where({ entityType: 'message', entityId: messageId })
        .delete();

      console.log('[SyncManager] Message synced:', messageId);
      return true;

    } catch (error: any) {
      console.error('[SyncManager] Sync failed:', error);
      
      // Update sync queue with error - get item first
      const queueItem = await db.syncQueue
        .where({ entityType: 'message', entityId: messageId })
        .first();
      
      if (queueItem) {
        await db.syncQueue.update(queueItem.id, {
          status: 'failed',
          lastError: error.message,
          retryCount: queueItem.retryCount + 1,
        });
      }

      return false;
    }
  }

  /**
   * Sync all pending items
   */
  async syncPending(): Promise<SyncResult> {
    if (this.syncInProgress || this.status === 'offline') {
      return { success: false, synced: 0, failed: 0, errors: ['Sync skipped'] };
    }

    this.syncInProgress = true;
    this.setStatus('syncing');

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Get all pending items
      const pendingItems = await db.syncQueue
        .where('status')
        .equals('pending')
        .toArray();

      for (const item of pendingItems) {
        const success = await this.syncQueueItem(item);
        if (success) {
          result.synced++;
        } else {
          result.failed++;
          result.success = false;
        }
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    } finally {
      this.syncInProgress = false;
      this.setStatus(navigator.onLine ? 'online' : 'offline');
    }

    console.log('[SyncManager] Sync completed:', result);
    return result;
  }

  /**
   * FC-522: Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    return Math.min(
      this.BASE_DELAY_MS * Math.pow(2, retryCount),
      30000 // Max 30 segundos
    );
  }

  /**
   * FC-522: Check if item should be retried
   */
  private shouldRetry(item: SyncQueueItem): boolean {
    return item.retryCount < this.MAX_RETRIES;
  }

  /**
   * Sync a single queue item with retry logic
   */
  private async syncQueueItem(item: SyncQueueItem): Promise<boolean> {
    // FC-522: Check if max retries exceeded
    if (!this.shouldRetry(item)) {
      console.warn(`[SyncManager] Max retries exceeded for ${item.entityType} ${item.entityId}`);
      await db.syncQueue.update(item.id, { status: 'failed' });
      return false;
    }

    // FC-522: Apply backoff delay if this is a retry
    if (item.retryCount > 0) {
      const delay = this.calculateBackoffDelay(item.retryCount);
      console.log(`[SyncManager] Retry ${item.retryCount}/${this.MAX_RETRIES} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // FC-523: Sync by entity type
    switch (item.entityType) {
      case 'message':
        return this.syncMessage(item.entityId);
      case 'conversation':
        return this.syncConversation(item.entityId);
      case 'relationship':
        return this.syncRelationship(item.entityId);
      default:
        console.warn('[SyncManager] Unknown entity type:', item.entityType);
        return false;
    }
  }

  /**
   * FC-523: Sync a conversation to backend
   */
  async syncConversation(conversationId: string): Promise<boolean> {
    if (!this.authToken) {
      console.warn('[SyncManager] No auth token, skipping conversation sync');
      return false;
    }

    const conversation = await db.conversations.get(conversationId);
    if (!conversation || conversation.syncState === 'synced') {
      return true;
    }

    try {
      await db.conversations.update(conversationId, { syncState: 'pending_backend' });

      const response = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          relationshipId: conversation.relationshipId,
          channel: conversation.channel,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await db.conversations.update(conversationId, {
        syncState: 'synced',
        serverCreatedAt: new Date(),
        pendingOperation: undefined,
      });

      await db.syncQueue
        .where({ entityType: 'conversation', entityId: conversationId })
        .delete();

      console.log('[SyncManager] Conversation synced:', conversationId);
      return true;

    } catch (error: any) {
      console.error('[SyncManager] Conversation sync failed:', error);
      
      const queueItem = await db.syncQueue
        .where({ entityType: 'conversation', entityId: conversationId })
        .first();
      
      if (queueItem) {
        await db.syncQueue.update(queueItem.id, {
          status: 'failed',
          lastError: error.message,
          retryCount: queueItem.retryCount + 1,
        });
      }

      return false;
    }
  }

  /**
   * FC-523: Sync a relationship to backend
   */
  async syncRelationship(relationshipId: string): Promise<boolean> {
    if (!this.authToken) {
      console.warn('[SyncManager] No auth token, skipping relationship sync');
      return false;
    }

    const relationship = await db.relationships.get(relationshipId);
    if (!relationship || relationship.syncState === 'synced') {
      return true;
    }

    try {
      await db.relationships.update(relationshipId, { syncState: 'pending_backend' });

      const response = await fetch(`${API_URL}/relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          accountAId: relationship.accountAId,
          accountBId: relationship.accountBId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await db.relationships.update(relationshipId, {
        syncState: 'synced',
        serverCreatedAt: new Date(),
        pendingOperation: undefined,
      });

      await db.syncQueue
        .where({ entityType: 'relationship', entityId: relationshipId })
        .delete();

      console.log('[SyncManager] Relationship synced:', relationshipId);
      return true;

    } catch (error: any) {
      console.error('[SyncManager] Relationship sync failed:', error);
      
      const queueItem = await db.syncQueue
        .where({ entityType: 'relationship', entityId: relationshipId })
        .first();
      
      if (queueItem) {
        await db.syncQueue.update(queueItem.id, {
          status: 'failed',
          lastError: error.message,
          retryCount: queueItem.retryCount + 1,
        });
      }

      return false;
    }
  }

  /**
   * Get messages for a conversation (from IndexedDB)
   */
  async getMessages(conversationId: string): Promise<LocalMessage[]> {
    return db.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('localCreatedAt');
  }

  /**
   * Fetch and cache messages from backend
   * FIX: Deduplicación mejorada para evitar mensajes duplicados
   */
  async fetchMessages(conversationId: string): Promise<LocalMessage[]> {
    console.log(`[SyncManager] fetchMessages called for ${conversationId}, token: ${this.authToken ? 'present' : 'MISSING'}, status: ${this.status}`);
    
    if (!this.authToken || this.status === 'offline') {
      console.log('[SyncManager] Skipping fetch - no token or offline');
      return this.getMessages(conversationId);
    }

    try {
      const response = await fetch(
        `${API_URL}/conversations/${conversationId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      // El endpoint devuelve { success: true, data: [...] }
      const serverMessages = json.data || json || [];
      
      console.log(`[SyncManager] Fetched ${serverMessages.length} messages for conversation ${conversationId}`);

      // FIX: Obtener todos los mensajes locales para deduplicación por contenido
      const localMessages = await db.messages
        .where('conversationId')
        .equals(conversationId)
        .toArray();
      
      // Crear índice de mensajes locales por contenido+sender para detectar duplicados
      const localContentIndex = new Map<string, LocalMessage>();
      for (const msg of localMessages) {
        const key = `${msg.senderAccountId}:${msg.content?.text || ''}:${msg.type}`;
        localContentIndex.set(key, msg);
      }

      // Merge with local messages
      for (const serverMsg of serverMessages) {
        const existing = await db.messages.get(serverMsg.id);
        
        if (!existing) {
          // FIX: Verificar si existe un mensaje local con el mismo contenido (duplicado por sync)
          const contentKey = buildContentSignature(serverMsg);
          const duplicateByContent = localContentIndex.get(contentKey);
          
          if (duplicateByContent && duplicateByContent.syncState !== 'synced') {
            // Es un duplicado local - actualizar el mensaje local con el ID del servidor
            console.log(`[SyncManager] Merging duplicate message: local ${duplicateByContent.id} -> server ${serverMsg.id}`);
            
            // Eliminar el mensaje local con ID diferente
            await db.messages.delete(duplicateByContent.id);
            
            // Agregar el mensaje del servidor (usar put para evitar ConstraintError)
            await db.messages.put({
              ...serverMsg,
              syncState: 'synced',
              localCreatedAt: new Date(serverMsg.createdAt),
              serverCreatedAt: new Date(serverMsg.createdAt),
            });
            
            // Limpiar sync queue del mensaje local
            await db.syncQueue
              .where({ entityType: 'message', entityId: duplicateByContent.id })
              .delete();
          } else {
            // New message from server - usar put para evitar ConstraintError si ya existe
            await db.messages.put({
              ...serverMsg,
              syncState: 'synced',
              localCreatedAt: new Date(serverMsg.createdAt),
              serverCreatedAt: new Date(serverMsg.createdAt),
            });
          }
        } else if (existing.syncState !== 'synced') {
          // FC-521: Conflict resolution - Backend prevalece (Dual Source of Truth)
          console.log(`[SyncManager] Resolving conflict for message ${serverMsg.id} - Backend wins`);
          await db.messages.update(serverMsg.id, {
            ...serverMsg,
            syncState: 'synced',
            serverCreatedAt: new Date(serverMsg.createdAt),
            pendingOperation: undefined,
          });
          
          // Remove from sync queue if exists
          await db.syncQueue
            .where({ entityType: 'message', entityId: serverMsg.id })
            .delete();
        } else {
          // Already synced - update if server version is newer
          const serverDate = new Date(serverMsg.createdAt);
          const localDate = existing.serverCreatedAt || existing.localCreatedAt;
          
          if (serverDate > localDate) {
            await db.messages.update(serverMsg.id, {
              ...serverMsg,
              syncState: 'synced',
              serverCreatedAt: serverDate,
            });
          }
        }
      }

      return this.getMessages(conversationId);

    } catch (error) {
      console.warn('[SyncManager] Fetch failed, using local:', error);
      return this.getMessages(conversationId);
    }
  }

  /**
   * Clear all local data
   */
  async clearLocalData(): Promise<void> {
    await db.messages.clear();
    await db.conversations.clear();
    await db.relationships.clear();
    await db.syncQueue.clear();
    console.log('[SyncManager] Local data cleared');
  }

  /**
   * FIX: Limpiar mensajes duplicados existentes en una conversación
   * Mantiene el mensaje más reciente (synced > local_only) y elimina duplicados
   */
  async cleanDuplicateMessages(conversationId: string): Promise<number> {
    const messages = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .toArray();
    
    // Agrupar por contenido+sender+type
    const groups = new Map<string, LocalMessage[]>();
    for (const msg of messages) {
      const key = buildContentSignature(msg);
      const group = groups.get(key) || [];
      group.push(msg);
      groups.set(key, group);
    }
    
    let deletedCount = 0;
    
    // Para cada grupo con más de un mensaje, mantener solo el mejor
    for (const [, group] of groups) {
      if (group.length <= 1) continue;
      
      // Ordenar: synced primero, luego por fecha más reciente
      group.sort((a, b) => {
        if (a.syncState === 'synced' && b.syncState !== 'synced') return -1;
        if (b.syncState === 'synced' && a.syncState !== 'synced') return 1;
        return b.localCreatedAt.getTime() - a.localCreatedAt.getTime();
      });
      
      // Mantener el primero (mejor), eliminar el resto
      const toDelete = group.slice(1);
      for (const msg of toDelete) {
        await db.messages.delete(msg.id);
        await db.syncQueue
          .where({ entityType: 'message', entityId: msg.id })
          .delete();
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[SyncManager] Cleaned ${deletedCount} duplicate messages from conversation ${conversationId}`);
    }
    
    return deletedCount;
  }
}

// Singleton export
export const syncManager = new SyncManager();

```

## 16. ChatView Component

**Archivo:** `apps/web/src/components/chat/ChatView.tsx`

**Código:**

```typescript
/**
 * ChatView - Vista de conversación activa
 * V2-1: Conectado a API real
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { AlertTriangle, MessageCircle, MoreVertical, Phone, Video, Loader2, X } from 'lucide-react';
import clsx from 'clsx';
import type { Message } from '../../types';
import { AISuggestionCard, useAISuggestions, type AISuggestion } from '../extensions';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { useAssetUpload } from '../../hooks/useAssetUpload';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useUIStore } from '../../store/uiStore';
import { useAutoReplyStore } from '../../store/autoReplyStore';
import { Avatar } from '../ui/Avatar';
import { ParticipantsActivityBar } from './ParticipantsActivityBar';
import { useAuthStore } from '../../store/authStore';
import { useChat } from '../../hooks/useChat';

const CHAT_SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/ogg;codecs=opus',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const CHAT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

interface ChatViewProps {
  conversationId: string;
  accountId?: string; // Cuenta actual del usuario
  relationshipId?: string;
}

type ActivityType = 'typing' | 'recording' | 'idle';

export function ChatView({ conversationId, accountId, relationshipId }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const pendingConversationScrollRef = useRef(false);

  // Obtener nombre del contacto desde las conversaciones cargadas
  const conversations = useUIStore((state) => state.conversations);
  const currentConversation = conversations.find(c => c.id === conversationId);
  const contactName = (currentConversation as any)?.contactName || `Chat ${conversationId?.slice(0, 8)}`;
  const contactProfile = (currentConversation as any)?.contactProfile as { avatarUrl?: string } | undefined;
  const contactAvatar = contactProfile?.avatarUrl || (currentConversation as any)?.contactAvatar;
  const activeRelationshipId = (currentConversation as any)?.relationshipId || relationshipId;

  // V2-1: useChat (WebSocket-driven)
  const {
    messages,
    isLoading,
    isSending: chatIsSending,
    error,
    sendMessage,
    addReceivedMessage,
    deleteMessage,
    refresh,
  } = useChat({ conversationId, accountId: accountId ?? '' });

  const currentUserId = useAuthStore((state) => state.user?.id ?? null);

  // Assets: session-based uploads
  const {
    upload: uploadAssetRequest,
    status: assetUploadStatus,
    progress: assetProgress,
    error: uploadError,
    reset: resetUpload,
  } = useAssetUpload({
    accountId: accountId ?? undefined,
    allowedMimeTypes: CHAT_SUPPORTED_MIME_TYPES,
    maxSizeBytes: CHAT_MAX_UPLOAD_BYTES,
  });

  const isUploadingAttachment = assetUploadStatus === 'creating_session' || assetUploadStatus === 'uploading' || assetUploadStatus === 'committing';
  const uploadProgress = assetProgress?.percentage ?? 0;

  const clearUploadError = () => {
    resetUpload();
  };

  const performAssetUpload = useCallback(async ({ file }: { file: File }) => {
    const asset = await uploadAssetRequest(file);
    return asset;
  }, [uploadAssetRequest]);

  const uploadAssetForComposer = useCallback(async ({ file }: { file: File; type: 'image' | 'document' | 'video' }) => {
    if (!currentUserId || !accountId) {
      return { success: false, error: 'No hay sesión activa para subir archivos' };
    }
    const previewUrl = file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : undefined;
    const asset = await performAssetUpload({ file });

    if (!asset) {
      return {
        success: false,
        error: uploadError || 'No se pudo subir el archivo',
      };
    }

    return {
      success: true,
      asset,
      previewUrl,
    };
  }, [performAssetUpload, uploadError, currentUserId, accountId]);

  const uploadAudioForComposer = useCallback(async ({ file }: { file: File }) => {
    if (!currentUserId || !accountId) {
      return { success: false, error: 'No hay sesión activa para grabar audio' };
    }
    const asset = await performAssetUpload({ file });
    return {
      success: !!asset,
      asset: asset ?? undefined,
    };
  }, [performAssetUpload, currentUserId, accountId]);

  // COR-043/COR-044: AI Suggestions
  const {
    suggestions,
    isGenerating,
    addSuggestion,
    removeSuggestion
  } = useAISuggestions(conversationId);

  const autoReplyState = useAutoReplyStore((state) => state.conversations[conversationId]);
  const setWaitingAutoReply = useAutoReplyStore((state) => state.setWaiting);
  const setWaitingBySuggestionAutoReply = useAutoReplyStore((state) => state.setWaitingBySuggestion);
  const setTypingAutoReply = useAutoReplyStore((state) => state.setTypingBySuggestion);
  const setSendingAutoReply = useAutoReplyStore((state) => state.setSendingBySuggestion);
  const cancelAutoReplyBySuggestion = useAutoReplyStore((state) => state.cancelBySuggestion);
  const cancelAutoReplyByConversation = useAutoReplyStore((state) => state.cancel);
  const completeAutoReply = useAutoReplyStore((state) => state.complete);

  const SMART_DELAY_INITIAL_MS = 15000;
  const SMART_DELAY_TYPING_MS = 5000;

  const [participantActivities, setParticipantActivities] = useState<Record<string, ActivityType>>({});

  // Definir handleActivityState PRIMERO
  const handleActivityState = useCallback((event: {
    accountId: string;
    conversationId: string;
    activity: string;
  }) => {
    // Only process events for this conversation
    if (event.conversationId !== conversationId) return;
    console.log('[DEBUG] Updating activity state for account:', event.accountId, 'Activity:', event.activity);
    setParticipantActivities(prev => ({
      ...prev,
      [event.accountId]: event.activity as ActivityType
    }));
  }, [conversationId]);

  // V2-1.3: WebSocket para tiempo real
  const {
    status: wsStatus,
    lastError: wsLastError,
    reconnectAttempts: wsReconnectAttempts,
    connect: connectWS,
    subscribe,
    unsubscribe,
    reportActivity,
  } = useWebSocket({
    onMessage: (msg) => {
      if (msg.type === 'message:new' && msg.data?.conversationId === conversationId) {
        const generatedBy = msg.data?.generatedBy;
        addReceivedMessage(msg.data as Message);
        if (generatedBy === 'ai') {
          const autoStateForConversation = useAutoReplyStore.getState().conversations[conversationId];
          if (autoStateForConversation) {
            removeSuggestion(autoStateForConversation.suggestionId);
            completeAutoReply(conversationId);
          }
        }
      }
    },
    onSuggestion: (suggestion) => {
      if (suggestion.conversationId === conversationId) {
        addSuggestion(suggestion);
        if ((suggestion as any).mode === 'automatic') {
          setWaitingAutoReply(conversationId, suggestion.id, SMART_DELAY_INITIAL_MS);
        }
      }
    },
    onSuggestionAutoWaiting: ({ suggestionId, delayMs }) => {
      setWaitingBySuggestionAutoReply(suggestionId, delayMs);
    },
    onSuggestionAutoTyping: ({ suggestionId }) => {
      setTypingAutoReply(suggestionId, SMART_DELAY_TYPING_MS);
    },
    onSuggestionAutoSending: ({ suggestionId }) => {
      setSendingAutoReply(suggestionId);
    },
    onSuggestionAutoCancelled: ({ suggestionId }) => {
      cancelAutoReplyBySuggestion(suggestionId);
      removeSuggestion(suggestionId);
    },
    onActivityState: handleActivityState
  });

  // Suscribirse a cambios en la relación
  useEffect(() => {
    if (activeRelationshipId) {
      console.log('[DEBUG] Subscribing to relationship:', activeRelationshipId);
      subscribe(activeRelationshipId);
      return () => {
        unsubscribe(activeRelationshipId);
      };
    }
  }, [conversationId, activeRelationshipId, subscribe, unsubscribe]);

  useEffect(() => {
    pendingConversationScrollRef.current = true;
    isAtBottomRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    if (!autoReplyState) return;
    const hasSuggestion = suggestions.some((s) => s.id === autoReplyState.suggestionId);
    if (!hasSuggestion) {
      completeAutoReply(conversationId);
    }
  }, [autoReplyState, suggestions, conversationId, completeAutoReply]);

  const [, forceAutoReplyTick] = useState(0);
  useEffect(() => {
    if (!autoReplyState?.eta) return;
    const interval = setInterval(() => {
      forceAutoReplyTick((tick) => tick + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [autoReplyState?.eta]);

  useEffect(() => {
    let raf: number | null = null;

    const scrollToBottom = (behavior: ScrollBehavior) => {
      const el = messagesContainerRef.current;
      if (!el) return;
      raf = requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior });
      });
    };

    if (pendingConversationScrollRef.current) {
      if (messages.length > 0 && messages[0]?.conversationId !== conversationId) {
        return;
      }
      pendingConversationScrollRef.current = false;
      scrollToBottom('auto');
    } else if (isAtBottomRef.current) {
      scrollToBottom('auto');
    }

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [messages, conversationId]);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 80;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom <= threshold;
  };

  // TODO(assets): Cuando adapters migren a assetId, eliminar cualquier referencia a url/attachmentId
  // y asegurar que los compositores y hooks solo operan con assetId y assets firmados.
  const handleSend = async (overrideContent?: { text: string; media?: any[] }) => {
    const content = overrideContent ?? { text: message };
    const hasText = typeof content.text === 'string' && content.text.trim().length > 0;
    const hasMedia = Array.isArray(content.media) && content.media.length > 0;
    if (!hasText && !hasMedia) return;

    if (chatIsSending) return;

    if (!accountId) {
      console.error('[ChatView] Cannot send: no accountId');
      return;
    }

    try {
      setSendError(null);
      const result = await sendMessage({
        content: {
          text: content.text || '',
          ...(hasMedia ? { media: content.media } : {}),
        },
        generatedBy: 'human',
      });

      if (!result) {
        setSendError('No se pudo enviar el mensaje');
        return;
      }

      setMessage('');
      setReplyingTo(null);
      handleUserActivity('cancel');
    } catch (err) {
      console.error('[ChatView] Send error:', err);
      setSendError(err instanceof Error ? err.message : 'Error al enviar mensaje');
    }
  };

  const getConnectionLabel = () => {
    if (wsStatus === 'error') return 'Sin conexión';
    if (wsStatus === 'connecting') return 'Conectando...';
    if (wsStatus === 'disconnected') return 'Reconectando...';
    return 'En línea';
  };

  const getConnectionDotClass = () => {
    if (wsStatus === 'error' || wsStatus === 'disconnected') return 'bg-error';
    if (wsStatus === 'connecting') return 'bg-warning';
    return 'bg-success';
  };

  // COR-044: Handlers para sugerencias de IA
  const handleApproveSuggestion = (suggestionId: string, text: string) => {
    handleSend({ text });
    removeSuggestion(suggestionId);
  };

  const handleDiscardSuggestion = (suggestionId: string) => {
    removeSuggestion(suggestionId);
    cancelAutoReplyBySuggestion(suggestionId);
  };

  // NOTA: Simulación de IA removida - conectar a API real

  // Scroll a mensaje específico
  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Delete message
  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      await refresh();
    } catch (err) {
      console.error('[ChatView] Delete error:', err);
    }
  };

  const handleUserActivity = (activity: 'typing' | 'recording' | 'idle' | 'cancel') => {
    if (!accountId) return;
    reportActivity({
      activity,
      accountId,
      conversationId,
    });
    if (activity === 'cancel') {
      cancelAutoReplyByConversation(conversationId);
    }
  };

  const handleCancelAutoReply = () => {
    if (!autoReplyState) return;
    handleUserActivity('cancel');
    removeSuggestion(autoReplyState.suggestionId);
  };

  const remainingSeconds =
    autoReplyState?.eta != null ? Math.max(0, Math.ceil((autoReplyState.eta - Date.now()) / 1000)) : null;

  return (
    <div className="h-full bg-base flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-surface border-b border-subtle px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar
            src={contactAvatar}
            name={contactName}
            size="md"
          />
          <div>
            <div className="text-primary font-medium">
              {contactName}
            </div>
            <div className="text-xs text-muted flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5">
                <span className={clsx('w-2 h-2 rounded-full', getConnectionDotClass())} />
                <span>{getConnectionLabel()}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors">
            <Phone size={20} />
          </button>
          <button className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors">
            <Video size={20} />
          </button>
          <button className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 flex-shrink-0">
          <Loader2 className="animate-spin text-muted" size={32} />
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mx-4 mt-3 p-3 bg-error-muted border border-error-muted rounded-lg text-error text-sm flex items-start justify-between gap-3">
          <div className="min-w-0">{uploadError}</div>
          <button
            onClick={() => clearUploadError()}
            className="p-1 text-error hover:text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* WebSocket status banner (errores visibles + reintentar) */}
      {(wsStatus === 'error' || wsStatus === 'disconnected' || wsStatus === 'connecting') && (
        <div className="mx-4 mt-3 p-3 bg-elevated border border-subtle rounded-lg flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-primary font-medium">{getConnectionLabel()}</div>
            <div className="text-xs text-muted break-words">
              {wsLastError || 'Conexión inestable. Intentando reconectar...'}
              {wsReconnectAttempts > 0 ? ` (reintento ${wsReconnectAttempts}/5)` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => connectWS()}
              className="px-3 py-1.5 rounded-md bg-hover text-primary hover:bg-active transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-error-muted border border-error-muted rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* Send error (feedback visual mínimo) */}
      {sendError && (
        <div className="mx-4 mt-3 p-3 bg-error-muted border border-error-muted rounded-lg text-error text-sm flex items-start justify-between gap-3">
          <div className="min-w-0">{sendError}</div>
          <button
            onClick={() => setSendError(null)}
            className="p-1 text-error hover:text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* No account warning */}
      {!accountId && !isLoading && (
        <div className="mx-4 mt-3 p-3 bg-warning-muted border border-warning-muted rounded-lg text-warning text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="min-w-0">No se ha seleccionado una cuenta. Por favor recarga la página o inicia sesión de nuevo.</div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 min-h-0 overflow-y-auto p-4"
      >
        {!isLoading && messages.length === 0 && !isGenerating && suggestions.length === 0 ? (
          <div className="min-h-full flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 mb-4 bg-elevated border border-subtle rounded-2xl flex items-center justify-center">
              <MessageCircle className="text-muted" size={28} />
            </div>
            <h3 className="text-lg font-medium text-primary mb-2">No hay mensajes aún</h3>
            <p className="text-sm text-secondary">Envía el primer mensaje para iniciar la conversación</p>
          </div>
        ) : (
          <div className="min-h-full flex flex-col justify-end space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} id={`msg-${msg.id}`}>
                <MessageBubble
                  message={msg}
                  isOwn={msg.senderAccountId === accountId}
                  onReply={() => setReplyingTo(msg)}
                  onEdit={msg.senderAccountId === accountId ? () => {
                    setMessage(msg.content.text || '');
                  } : undefined}
                  onDelete={msg.senderAccountId === accountId ? () => handleDelete(msg.id) : undefined}
                  onScrollToMessage={scrollToMessage}
                  viewerAccountId={accountId}
                />
              </div>
            ))}

            {/* COR-043/COR-044: AI Suggestions */}
            {isGenerating && (
              <AISuggestionCard
                suggestion={{} as AISuggestion}
                onApprove={() => { }}
                onDiscard={() => { }}
                isLoading={true}
              />
            )}
            {suggestions.map((suggestion) => {
              const autoStateForCard =
                autoReplyState && autoReplyState.suggestionId === suggestion.id
                  ? {
                    phase: autoReplyState.status,
                    etaSeconds:
                      autoReplyState.eta != null
                        ? Math.max(0, Math.ceil((autoReplyState.eta - Date.now()) / 1000))
                        : null,
                  }
                  : undefined;
              return (
                <AISuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  autoState={autoStateForCard}
                  onApprove={(text) => handleApproveSuggestion(suggestion.id, text)}
                  onDiscard={() => handleDiscardSuggestion(suggestion.id)}
                />
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-surface border-t border-subtle flex items-center gap-2 flex-shrink-0">
          <div className="flex-1 text-sm">
            <span className="text-muted">Respondiendo a: </span>
            <span className="text-primary truncate">{replyingTo.content.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-muted hover:text-primary transition-colors"
            aria-label="Cancelar respuesta"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <ParticipantsActivityBar activities={participantActivities} />

      {/* Input */}
      {autoReplyState && (
        <div className="mx-4 mb-3 p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between gap-3 flex-shrink-0">
          <div>
            <div className="text-sm text-primary font-medium">
              {autoReplyState.message || 'Fluxi está preparando una respuesta automática'}
            </div>
            {remainingSeconds !== null && (
              <div className="text-xs text-muted">
                Se enviará en {remainingSeconds}s · ID {autoReplyState.suggestionId.slice(0, 6)}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleCancelAutoReply}
            className="px-4 py-1.5 rounded-full bg-error-muted text-error text-sm hover:bg-error-muted/80 transition-colors"
          >
            Cancelar auto-respuesta
          </button>
        </div>
      )}
      <ChatComposer
        value={message}
        onChange={setMessage}
        disabled={!accountId}
        isSending={chatIsSending}
        onSend={handleSend}
        accountId={accountId}
        conversationId={conversationId}
        relationshipId={activeRelationshipId}
        uploadAsset={uploadAssetForComposer}
        uploadAudio={uploadAudioForComposer}
        isUploading={isUploadingAttachment}
        uploadProgress={uploadProgress}
        onClearUploadError={clearUploadError}
        onUserActivity={handleUserActivity}
      />
    </div>
  );
}

```

## 17. MessageBubble Component

**Archivo:** `apps/web/src/components/chat/MessageBubble.tsx`

**Código:**

```typescript
/**
 * V2-1.4: MessageBubble Component
 * 
 * Muestra un mensaje con estados, reply-to, y acciones.
 * CORREGIDO: Usando sistema de diseño canónico
 */

import { useState } from 'react';
import { Check, CheckCheck, Clock, AlertCircle, RotateCcw, Reply, Pencil, Trash2, Bot, File, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import type { Message, MessageStatus } from '../../types';
import { AssetPreview } from './AssetPreview';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  replyToMessage?: Message;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
  onScrollToMessage?: (messageId: string) => void;
  viewerAccountId?: string;
}

export function MessageBubble({
  message,
  isOwn,
  replyToMessage,
  onReply,
  onEdit,
  onDelete,
  onRetry,
  onScrollToMessage,
  viewerAccountId,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const resolveMediaUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${apiUrl}${url}`;
    return url;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const renderWaveform = (samples: unknown) => {
    if (!Array.isArray(samples) || samples.length === 0) return null;
    const max = Math.max(...samples.map((n) => (typeof n === 'number' ? n : 0)), 1);

    return (
      <div className="mt-2 flex items-end gap-0.5 h-8">
        {samples.slice(0, 64).map((n, i) => {
          const v = typeof n === 'number' ? n : 0;
          const h = Math.max(2, Math.round((v / max) * 28));
          return (
            <div
              key={i}
              className={clsx('w-1 rounded-sm', isOwn ? 'bg-muted opacity-60' : 'bg-muted')}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
    );
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Sistema canónico de colores
  const renderStatus = (status?: MessageStatus) => {
    switch (status) {
      case 'pending_backend':
      case 'local_only':
        return <Clock size={14} className="text-muted" />;
      case 'synced':
      case 'sent':
        return <Check size={14} className="text-muted" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-muted" />;
      case 'seen':
        return <CheckCheck size={14} className="text-accent" />;
      case 'failed':
        return <AlertCircle size={14} className="text-error" />;
      default:
        return <Check size={14} className="text-muted" />;
    }
  };

  // ── System messages (ai_blocked, etc.) ──────────────────────────────
  if (message.generatedBy === 'system') {
    const systemMeta = (message.content as any)?.__system as
      | { type: string; reason?: string; requiredProvider?: string; creditBalance?: number }
      | undefined;

    return (
      <div className="flex justify-center my-2" data-component-name="MessageBubble">
        <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-warning/10 border border-warning/20 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ShieldAlert size={14} className="text-warning" />
            <span className="text-xs font-medium text-warning">
              {systemMeta?.type === 'ai_blocked' ? 'IA no disponible' : 'Sistema'}
            </span>
          </div>
          {typeof message.content.text === 'string' && message.content.text.trim().length > 0 && (
            <p className="text-sm text-secondary">{message.content.text}</p>
          )}
          <div className="text-xs text-muted mt-1">
            {formatTime(message.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group flex gap-2',
        isOwn ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Actions (left side for own messages) */}
      {isOwn && showActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {message.status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 text-muted hover:text-primary hover:bg-hover rounded"
              title="Reintentar"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {onEdit && message.status !== 'failed' && (
            <button
              onClick={onEdit}
              className="p-1 text-muted hover:text-primary hover:bg-hover rounded"
              title="Editar"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-muted hover:text-error hover:bg-hover rounded"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          )}
          {onReply && (
            <button
              onClick={onReply}
              className="p-1 text-muted hover:text-primary hover:bg-hover rounded"
              title="Responder"
            >
              <Reply size={14} />
            </button>
          )}
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={clsx(
          'max-w-[70%] rounded-2xl px-4 py-2 relative',
          isOwn 
            ? 'ml-auto bg-accent text-primary rounded-br-md' 
            : 'mr-auto bg-elevated text-primary rounded-bl-md'
        )}
      >
        {/* Reply-to preview */}
        {replyToMessage && (
          <button
            onClick={() => onScrollToMessage?.(replyToMessage.id)}
            className="block w-full text-left mb-2 p-2 bg-active rounded-lg border-l-2 border-accent"
          >
            <div className="text-xs text-accent mb-0.5">
              {replyToMessage.senderAccountId === message.senderAccountId ? 'Tú' : 'Respuesta a'}
            </div>
            <div className="text-xs text-secondary truncate">
              {replyToMessage.content.text}
            </div>
          </button>
        )}

        {/* Media previews */}
        {Array.isArray(message.content.media) && message.content.media.length > 0 && (
          <div className="flex flex-col gap-2 mb-2">
            {message.content.media.map((m, idx) => {
              const key = m.assetId ?? `${m.type}-${idx}`;
              const fallbackName = m.name || m.filename || `Archivo ${idx + 1}`;
              const sizeBytes = m.sizeBytes ?? 0;

              const renderAsset = () => {
                if (!m.assetId || !viewerAccountId) return null;

                const preview = (
                  <AssetPreview
                    key={key}
                    assetId={m.assetId}
                    accountId={viewerAccountId}
                    name={fallbackName}
                    mimeType={m.mimeType || 'application/octet-stream'}
                    sizeBytes={sizeBytes}
                    typeHint={m.type}
                  />
                );

                if (m.type === 'audio' && (m as any)?.waveformData?.samples) {
                  return (
                    <div key={`${key}-asset-audio`} className="bg-elevated rounded-lg p-2 border border-subtle">
                      {preview}
                      {renderWaveform((m as any)?.waveformData?.samples)}
                    </div>
                  );
                }

                return preview;
              };

              const assetContent = renderAsset();
              if (assetContent) return assetContent;

              // TODO(assets): Este fallback a url debe eliminarse cuando adapters migren a assetId.
              // Por ahora, se mantiene compatibilidad con canales externos que aún entregan url.
              if (!m.url) {
                return (
                  <div key={`${key}-unsupported`} className="text-xs text-muted bg-active rounded-lg p-2 border border-subtle">
                    No se puede mostrar este adjunto.
                  </div>
                );
              }

              // TODO(assets): Este renderizado directo por url debe eliminarse cuando adapters migren a assetId.
              // Por ahora, se mantiene compatibilidad con canales externos que aún entregan url.
              const url = resolveMediaUrl(m.url);

              switch (m.type) {
                case 'image':
                  return (
                    <img
                      key={`${key}-image`}
                      src={url}
                      alt={fallbackName}
                      className="rounded-lg max-h-64 object-cover border border-subtle"
                      loading="lazy"
                    />
                  );
                case 'audio':
                  return (
                    <div key={`${key}-audio`} className="bg-elevated rounded-lg p-2 border border-subtle">
                      <audio controls src={url} className="w-full" />
                      {renderWaveform((m as any)?.waveformData?.samples)}
                      {fallbackName && (
                        <div className={clsx('mt-1 text-xs', isOwn ? 'text-secondary' : 'text-muted')}>
                          {fallbackName}
                        </div>
                      )}
                    </div>
                  );
                case 'document':
                default:
                  return (
                    <a
                      key={`${key}-doc`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className={clsx(
                        'flex items-center gap-2 rounded-lg p-2 border border-subtle',
                        isOwn ? 'bg-elevated' : 'bg-active'
                      )}
                    >
                      <File size={18} className="text-info flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm truncate text-primary">
                          {fallbackName}
                        </div>
                        {(m.mimeType || sizeBytes) && (
                          <div className={clsx('text-xs truncate', isOwn ? 'text-secondary' : 'text-muted')}>
                            {m.mimeType || ''}{m.mimeType && sizeBytes ? ' · ' : ''}{formatBytes(sizeBytes)}
                          </div>
                        )}
                      </div>
                    </a>
                  );
              }
            })}
          </div>
        )}

        {/* Message content */}
        {typeof message.content.text === 'string' && message.content.text.trim().length > 0 && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content.text}</p>
        )}

        {/* Footer: time, AI badge, status */}
        <div
          className={clsx(
            'flex items-center gap-1.5 mt-1 text-xs',
            isOwn ? 'text-secondary opacity-70 justify-end' : 'text-muted'
          )}
        >
          {message.updatedAt && message.updatedAt !== message.createdAt && (
            <span className="opacity-70">(editado)</span>
          )}
          <span>{formatTime(message.createdAt)}</span>
          {message.generatedBy === 'ai' && (
            <span className="flex items-center gap-0.5 bg-accent-muted px-1.5 py-0.5 rounded text-accent">
              <Bot size={10} />
              IA
            </span>
          )}
          {isOwn && renderStatus(message.status)}
        </div>
      </div>

      {/* Actions (right side for received messages) */}
      {!isOwn && showActions && onReply && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onReply}
            className="p-1 text-muted hover:text-primary hover:bg-hover rounded"
            title="Responder"
          >
            <Reply size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

```

## 18. ChatComposer Component

**Archivo:** `apps/web/src/components/chat/ChatComposer.tsx`

**Código:**

```typescript

import { StandardComposer } from './StandardComposer';
import { FluxCoreComposer } from '../../extensions/fluxcore/components/FluxCoreComposer';
import { useExtensions } from '../../hooks/useExtensions';
import type { UploadAssetFn, UploadAudioFn } from './composerUploadTypes';

type UserActivityType = 'typing' | 'recording' | 'idle' | 'cancel';

export function ChatComposer(props: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  isSending: boolean;
  onSend: (overrideContent?: { text: string; media?: any[] }) => Promise<void>;

  accountId?: string;
  conversationId?: string;
  relationshipId?: string;

  uploadAsset: UploadAssetFn;
  uploadAudio: UploadAudioFn;
  isUploading: boolean;
  uploadProgress: number;
  onClearUploadError: () => void;
  onUserActivity?: (activity: UserActivityType) => void;
}) {
  const { installations } = useExtensions(props.accountId ?? null);

  // Lógica de inyección: Si FluxCore está instalado y habilitado, toma el control.
  const isFluxCoreEnabled = installations.some(
    (i) => i.extensionId === '@fluxcore/asistentes' && i.enabled
  );

  if (isFluxCoreEnabled) {
    return <FluxCoreComposer {...props} />;
  }

  return <StandardComposer {...props} />;
}

```

## 19. Types

**Archivo:** `apps/web/src/types/index.ts`

**Código:**

```typescript
// Tipos para el frontend de FluxCore

export interface User {
  id: string;
  email: string;
  name: string;
  systemAdminScopes?: Record<string, boolean> | null;
}

export type AccountDeletionJobStatus =
  | 'pending'
  | 'snapshot'
  | 'snapshot_ready'
  | 'external_cleanup'
  | 'local_cleanup'
  | 'completed'
  | 'failed';

export interface AccountDeletionJob {
  id: string;
  accountId: string;
  requesterUserId: string;
  requesterAccountId?: string | null;
  status: AccountDeletionJobStatus;
  phase: string;
  snapshotUrl?: string | null;
  snapshotReadyAt?: string | null;
  snapshotDownloadedAt?: string | null;
  snapshotDownloadCount?: number | null;
  snapshotAcknowledgedAt?: string | null;
  externalState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountDeletionLog {
  id: string;
  accountId: string;
  jobId?: string | null;
  requesterUserId?: string | null;
  requesterAccountId?: string | null;
  status: string;
  reason?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AccountDataReference {
  tableName: string;
  columnName: string;
  rowCount: number;
}

export interface AccountOrphanReference {
  tableName: string;
  columnName: string;
  orphanCount: number;
  sampleIds: string[];
}

export interface Account {
  id: string;
  ownerUserId: string;
  username: string;
  displayName: string;
  accountType: 'personal' | 'business';
  profile: Record<string, any>;
  privateContext?: string;
  allowAutomatedUse: boolean;
  aiIncludeName: boolean;
  aiIncludeBio: boolean;
  aiIncludePrivateContext: boolean;
  createdAt: string;
  updatedAt: string;
  // New asset-based avatar field
  avatarAssetId?: string;
}

export interface Relationship {
  id: string;
  accountAId: string;
  accountBId: string;
  perspectiveA: Perspective;
  perspectiveB: Perspective;
  context: RelationshipContext;
  createdAt: string;
  lastInteraction?: string;
  // Enriched fields returned by backend when requesting contacts
  contactName?: string;
  contactAccountId?: string;
  /** @deprecated Use contactProfile.avatarUrl */
  contactAvatar?: string | null;
  contactProfile?: Record<string, any> | null;
}

export interface Perspective {
  savedName?: string;
  tags: string[];
  status: 'active' | 'archived' | 'blocked';
}

export interface RelationshipContext {
  entries: ContextEntry[];
  totalChars: number;
}

export interface ContextEntry {
  authorAccountId: string;
  content: string;
  type: 'note' | 'preference' | 'rule';
  allowAutomatedUse: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  relationshipId: string;
  channel: 'web' | 'whatsapp' | 'telegram';
  status: 'active' | 'archived' | 'closed';
  lastMessageAt?: string;
  lastMessageText?: string;
  unreadCountA: number;
  unreadCountB: number;
  createdAt: string;
  updatedAt: string;
  // Enriched fields resolved server-side for UI
  contactName?: string;
  contactAccountId?: string;
  /** @deprecated Use contactProfile.avatarUrl */
  contactAvatar?: string | null;
  contactProfile?: Record<string, any> | null;
}

export type MessageStatus = 'local_only' | 'pending_backend' | 'synced' | 'sent' | 'delivered' | 'seen' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: 'incoming' | 'outgoing' | 'system';
  generatedBy: 'human' | 'ai' | 'system';
  status?: MessageStatus;
  replyToId?: string;
  aiApprovedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageContent {
  text?: string;
  media?: MediaItem[];
  buttons?: Button[];
}

export interface MediaItem {
  type: 'image' | 'video' | 'audio' | 'document';
  assetId: string;
  name?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  waveformData?: any;
  previewUrl?: string;
  status?: string;
  scope?: string;
  // TODO(assets): Eliminar url cuando adapters migren completamente a assetId
  url?: string;
}

export interface Button {
  id: string;
  text: string;
  action: string;
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export type KernelSessionStatus = 'pending' | 'active' | 'invalidated';

export interface KernelSession {
  sessionId: string;
  actorId: string;
  accountId: string;
  status: KernelSessionStatus;
  deviceHash?: string | null;
  method?: string | null;
  entryPoint?: string | null;
  scopes: string[];
  updatedAt: string;
}

export type AIProvider = 'groq' | 'openai';

export interface AIStatusAttempt {
  provider: string;
  baseUrl: string;
  keySource?: string;
  ok: boolean;
  errorType?: string;
  statusCode?: number;
  message?: string;
}

export interface AIStatusProviderSummary {
  provider: string;
  baseUrl: string;
  keyCount: number;
}

export interface AIStatusResponse {
  accountId: string;
  entitled: boolean;
  enabled: boolean;
  mode: 'suggest' | 'auto' | 'off' | null;
  activeRuntimeId?: string; // @fluxcore/fluxi or @fluxcore/asistentes
  allowedProviders: AIProvider[];
  provider: AIProvider | null;
  model: string | null;
  configured: boolean;
  connected: boolean | null;
  providerKeys: AIStatusProviderSummary[];
  attempts: AIStatusAttempt[];
}

export interface AIEligibilitySuccess {
  canExecute: true;
  provider: AIProvider;
  model: string;
  runtime: 'openai' | 'local';
  mode: 'suggest' | 'auto' | 'off';
  requiresCredits: boolean;
}

export interface AIBlockDetail {
  reason: string;
  message: string;
  requiredProvider?: AIProvider;
  creditBalance?: number;
}

export interface AIEligibilityBlocked {
  canExecute: false;
  block: AIBlockDetail;
}

export type AIEligibilityResponse = AIEligibilitySuccess | AIEligibilityBlocked;

export interface PromptPreviewConfig {
  mode: 'suggest' | 'auto' | 'off';
  maxTokens: number;
  temperature: number;
  model: string;
}

export interface PromptPreviewData {
  systemPrompt: string;
  config: PromptPreviewConfig;
  assistant: {
    id: string;
    name: string;
    modelConfig: Record<string, unknown> | null;
  };
  instructionsCount: number;
  hasKnowledgeBase: boolean;
}

// Activity types for sidebar
// Extensiones dinámicas usan el formato 'ext:{extensionId}'
export type ActivityType = 'conversations' | 'contacts' | 'tools' | 'extensions' | 'settings' | 'monitoring' | `ext:${string}`;

// Extension UI configuration from manifest
export interface ExtensionUIConfig {
  sidebar?: {
    icon: string;
    title: string;
  };
  panel?: {
    title: string;
    component: string;
  };
}

// UI State
export interface UIState {
  activeActivity: ActivityType;
  sidebarOpen: boolean;
  selectedConversationId: string | null;
  selectedAccountId: string | null;
}

```

## 20. Database Schema

**Archivo:** `packages/db/src/schema/messages.ts`

**Código:**

```typescript
import { pgTable, uuid, varchar, timestamp, jsonb, bigint, integer, boolean, text, uniqueIndex, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { conversations } from './conversations';
import { accounts } from './accounts';
import { users } from './users';
import { fluxcoreActors } from './fluxcore-identity';

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderAccountId: uuid('sender_account_id')
    .notNull()
    .references(() => accounts.id),
  content: jsonb('content').notNull(), // { text?, media?, location?, buttons? }
  type: varchar('type', { length: 20 }).notNull(), // 'incoming' | 'outgoing' | 'system'
  eventType: varchar('event_type', { length: 20 }).default('message').notNull(), // 'message' | 'reaction' | 'edit' | 'internal_note' | 'system'
  generatedBy: varchar('generated_by', { length: 20 }).default('human').notNull(), // 'human' | 'ai' | 'system'
  aiApprovedBy: uuid('ai_approved_by').references(() => users.id),
  // COR-002: Status de sincronización/entrega (migration-007)
  status: varchar('status', { length: 20 }).default('synced').notNull(),
  // COR-003: Actor model para mensajes (migration-008)
  fromActorId: uuid('from_actor_id').references(() => fluxcoreActors.id),
  toActorId: uuid('to_actor_id').references(() => fluxcoreActors.id),
  parentId: uuid('parent_id'),
  originalId: uuid('original_id'),
  version: integer('version').notNull().default(1),
  isCurrent: boolean('is_current').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: text('deleted_by'),
  deletedScope: varchar('deleted_scope', { length: 10 }),
  // FLUX-001: Kernel alignment
  signalId: bigint('signal_id', { mode: 'number' }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  messagesSignalIdUnique: uniqueIndex('ux_messages_signal_id').on(table.signalId),
  messagesConversationIdx: index('idx_messages_conversation').on(table.conversationId, table.createdAt),
  messagesParentIdx: index('idx_messages_parent').on(table.parentId),
  messagesOriginalIdx: index('idx_messages_original').on(table.originalId),
  messageHasContent: check('message_has_content', sql`
    (${table.content} ->> 'text') IS NOT NULL
    OR jsonb_array_length(COALESCE(${table.content} -> 'media', '[]'::jsonb)) > 0
    OR ${table.eventType} IN ('reaction', 'system')
  `),
  messageDeletedScopeValid: check('message_deleted_scope_valid', sql`
    ${table.deletedScope} IS NULL OR ${table.deletedScope} IN ('self', 'all')
  `),
}));

export const messageEnrichments = pgTable('message_enrichments', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  extensionId: varchar('extension_id', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageEnrichment = typeof messageEnrichments.$inferSelect;
export type NewMessageEnrichment = typeof messageEnrichments.$inferInsert;

// COR-002: Tipos de status para mensajes
export type MessageStatus =
  | 'local_only'      // Solo existe localmente (offline-first)
  | 'pending_backend' // Pendiente de sincronizar con backend
  | 'synced'          // Sincronizado con backend
  | 'sent'            // Enviado al destinatario (adapters externos)
  | 'delivered'       // Entregado al destinatario
  | 'seen';           // Visto por el destinatario

// Tipos para el contenido del mensaje
export interface MessageMedia {
  type: 'image' | 'video' | 'audio' | 'document';
  assetId: string;
  mimeType?: string;
}

export interface MessageLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MessageButton {
  id: string;
  text: string;
  action: string;
}

export interface MessageContent {
  text?: string;
  media?: MessageMedia[];
  location?: MessageLocation;
  buttons?: MessageButton[];
}

```

## ESTRUCTURAS DE BASE DE DATOS

### PostgreSQL - Tabla messages

```sql
-- Obtener estructura de la tabla messages
\d messages

```

```sql
-- Schema completo de la tabla messages
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

```

### PostgreSQL - Datos de Ejemplo

```sql
-- Consultar mensajes recientes
SELECT id, conversation_id, sender_account_id, content, type, generated_by, created_at, updated_at
FROM messages
WHERE conversation_id = '51b841be-1830-4d17-a354-af7f03bee332'
ORDER BY created_at DESC
LIMIT 10;

```

### IndexedDB - Estructura Local

```typescript
// apps/web/src/db/schema.ts - Schema completo
export interface LocalMessage {
  id: string;
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: 'incoming' | 'outgoing' | 'system';
  syncState: SyncState;
  pendingOperation?: PendingOperation;
  localCreatedAt: Date;
  serverCreatedAt?: Date;
  status?: 'local_only' | 'pending_backend' | 'synced' | 'sent' | 'delivered' | 'seen';
  fromActorId?: string;
  toActorId?: string;
  generatedBy?: 'human' | 'ai' | 'system';
}

````

```typescript
// Estados de sincronización
export type SyncState = 
  | 'local_only'
  | 'pending_backend'
  | 'synced'
  | 'conflict'
  | 'error';

````

```typescript
// apps/web/src/db/index.ts - Configuración de IndexedDB
export class FluxCoreDB extends Dexie {
  messages!: Table<LocalMessage, string>;
  conversations!: Table<LocalConversation, string>;
  relationships!: Table<LocalRelationship, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor(accountId?: string) {
    const dbName = accountId ? `FluxCoreDB_${accountId}` : 'FluxCoreDB';
    super(dbName);

    this.version(1).stores({
      messages: 'id, conversationId, senderAccountId, syncState, localCreatedAt, [conversationId+localCreatedAt]',
      conversations: 'id, relationshipId, syncState, lastMessageAt',
      relationships: 'id, accountAId, accountBId, syncState',
      syncQueue: 'id, entityType, entityId, operation, status, createdAt'
    });
  }
}

````

### IndexedDB - Datos de Ejemplo

```javascript
// Consultar mensajes en IndexedDB desde consola del navegador
async function getIndexedDBMessages() {
  const databases = await indexedDB.databases();
  const fluxCoreDBs = databases.filter(db => db.name && db.name.startsWith('FluxCoreDB_'));

  console.log('Bases de datos FluxCore encontradas:', fluxCoreDBs.map(db => db.name));

  const allMessages = [];

  for (const dbInfo of fluxCoreDBs) {
    const dbName = dbInfo.name;
    console.log(`Verificando DB: ${dbName}`);

    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const messages = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    allMessages.push({
      dbName,
      accountId: dbName.replace('FluxCoreDB_', ''),
      messages: messages,
      count: messages.length
    });

    db.close();
  }

  return allMessages;
}

````

