import { db } from '@fluxcore/db';
import { messages, type MessageContent } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

export class MessageService {
  async createMessage(data: {
    conversationId: string;
    senderAccountId: string;
    content: MessageContent;
    type: 'incoming' | 'outgoing' | 'system';
    generatedBy?: 'human' | 'ai';
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
