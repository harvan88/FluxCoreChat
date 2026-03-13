import { db } from '@fluxcore/db';
import { messages, type MessageContent } from '@fluxcore/db';
import { desc, eq, lt, and } from 'drizzle-orm';
import { assetRelationsService } from './asset-relations.service';
import { conversationParticipantService } from './conversation-participant.service';

export class MessageService {
  /**
   * Crear un mensaje
   */
  async createMessage(data: {
    conversationId: string;
    senderAccountId: string;
    fromActorId?: string;
    content: MessageContent;
    type: 'incoming' | 'outgoing' | 'system';
    generatedBy?: 'human' | 'ai' | 'system';
    aiApprovedBy?: string;
    metadata?: Record<string, any>;
  }) {
    // 0. Auto-rejoin: Reactivar al participante si estaba desuscrito
    if (data.senderAccountId) {
      await conversationParticipantService.ensureActiveParticipant(
        data.conversationId,
        data.senderAccountId
      );
    }

    const [message] = await db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        senderAccountId: data.senderAccountId,
        fromActorId: data.fromActorId || null,
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

  async getMessagesByConversationId(conversationId: string, limit = 50, cursor?: Date, viewerActorId?: string) {
    // If viewerActorId is provided, use visibility filtering
    if (viewerActorId) {
      const { messageDeletionService } = await import('./message-deletion.service');
      return await messageDeletionService.getMessagesWithVisibilityFilter(conversationId, viewerActorId, limit, cursor);
    }

    // Original logic without visibility filtering
    const conditions = [eq(messages.conversationId, conversationId)];
    
    // 🆕 Cursor-based pagination: si hay cursor, obtener mensajes anteriores a esa fecha
    if (cursor) {
      conditions.push(lt(messages.createdAt, cursor));
    }
    
    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(messages.createdAt)  // ✅ Orden cronológico: antiguos primero, recientes al final
      .limit(limit);
  }

  async updateMessage(
    messageId: string,
    data: {
      content?: MessageContent;
      aiApprovedBy?: string;
    }
  ) {
    // Si solo se está actualizando el contenido, usar versionamiento
    if (data.content && !data.aiApprovedBy) {
      const { messageVersionService } = await import('./message-version.service');
      
      // Necesitamos el senderAccountId para validar ownership
      const [message] = await db
        .select({ senderAccountId: messages.senderAccountId })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      const result = await messageVersionService.createVersion(
        messageId,
        data.content,
        message.senderAccountId
      );
      
      if (!result.success) {
        throw new Error(result.reason || 'Failed to edit message');
      }
      
      // Retornar la nueva versión
      const [updated] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      
      return updated;
    }
    
    // Para otros campos (aiApprovedBy), usar update directo
    const [updated] = await db
      .update(messages)
      .set(data)
      .where(eq(messages.id, messageId))
      .returning();

    return updated;
  }

  async getMessagesByIds(messageIds: string[]) {
    const { db, messages } = await import('@fluxcore/db');
    const { inArray } = await import('drizzle-orm');

    const found = await db
      .select()
      .from(messages)
      .where(inArray(messages.id, messageIds));

    return found;
  }

  async deleteMessage(
    messageId: string,
    requesterAccountId: string,
    scope: 'self' | 'all' = 'self',
    requesterActorId?: string,
  ) {
    const { messageDeletionService } = await import('./message-deletion.service');

    const result = await messageDeletionService.deleteMessage(
      messageId,
      requesterAccountId,
      scope,
      requesterActorId,
    );

    if (!result.success) {
      throw new Error(result.reason || 'Failed to process message deletion');
    }
  }
}

export const messageService = new MessageService();
