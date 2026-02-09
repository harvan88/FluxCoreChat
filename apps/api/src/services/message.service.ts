import { db } from '@fluxcore/db';
import { mediaAttachments, messages, type MessageContent } from '@fluxcore/db';
import { desc, eq, inArray } from 'drizzle-orm';

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
      })
      .returning();

    const attachmentIds = (data.content.media || [])
      .map((m: any) => m?.attachmentId)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

    if (attachmentIds.length > 0) {
      await db
        .update(mediaAttachments)
        .set({ messageId: message.id })
        .where(inArray(mediaAttachments.id, attachmentIds));
    }

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
