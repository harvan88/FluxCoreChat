import { db } from '@fluxcore/db';
import { messages, type MessageContent, type MessageStatus } from '@fluxcore/db';
import { eq, desc, and } from 'drizzle-orm';

export class MessageService {
  /**
   * Crear un mensaje
   * COR-002: Ahora soporta campo status
   */
  async createMessage(data: {
    conversationId: string;
    senderAccountId: string;
    content: MessageContent;
    type: 'incoming' | 'outgoing' | 'system';
    generatedBy?: 'human' | 'ai';
    aiApprovedBy?: string;
    status?: MessageStatus;
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
        status: data.status || 'synced',
      })
      .returning();

    return message;
  }

  async getMessageById(messageId: string) {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);

    return message || null;
  }

  async getMessagesByConversationId(conversationId: string, limit = 50, offset = 0) {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async updateMessage(
    messageId: string,
    data: {
      content?: MessageContent;
      aiApprovedBy?: string;
      status?: MessageStatus;
    }
  ) {
    const [updated] = await db
      .update(messages)
      .set(data)
      .where(eq(messages.id, messageId))
      .returning();

    return updated;
  }

  /**
   * COR-002: Actualizar status de un mensaje
   */
  async updateStatus(messageId: string, status: MessageStatus) {
    const [updated] = await db
      .update(messages)
      .set({ status })
      .where(eq(messages.id, messageId))
      .returning();

    return updated;
  }

  /**
   * COR-002: Obtener mensajes por status en una conversación
   */
  async getMessagesByStatus(conversationId: string, status: MessageStatus) {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.status, status)
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  /**
   * COR-002: Obtener mensajes pendientes de sincronizar
   */
  async getPendingMessages(conversationId?: string) {
    const conditions = [eq(messages.status, 'pending_backend')];
    if (conversationId) {
      conditions.push(eq(messages.conversationId, conversationId));
    }
    
    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(messages.createdAt);
  }

  /**
   * COR-002: Marcar mensajes como vistos
   */
  async markAsSeen(conversationId: string, upToMessageId?: string) {
    // Marcar todos los mensajes delivered como seen
    const result = await db
      .update(messages)
      .set({ status: 'seen' })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.status, 'delivered')
        )
      )
      .returning();

    return result.length;
  }

  async deleteMessage(messageId: string) {
    await db.delete(messages).where(eq(messages.id, messageId));
  }
}

export const messageService = new MessageService();
