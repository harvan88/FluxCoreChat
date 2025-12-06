import { db } from '@fluxcore/db';
import { conversations } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

export class ConversationService {
  async createConversation(relationshipId: string, channel: 'web' | 'whatsapp' | 'telegram') {
    // Check if conversation already exists for this relationship and channel
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.relationshipId, relationshipId), eq(conversations.channel, channel))
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new conversation
    const [conversation] = await db
      .insert(conversations)
      .values({
        relationshipId,
        channel,
      })
      .returning();

    return conversation;
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

  async incrementUnreadCount(conversationId: string, forAccountA: boolean) {
    const conversation = await this.getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const field = forAccountA ? 'unreadCountA' : 'unreadCountB';
    const currentCount = forAccountA ? conversation.unreadCountA : conversation.unreadCountB;

    await db
      .update(conversations)
      .set({
        [field]: currentCount + 1,
      })
      .where(eq(conversations.id, conversationId));
  }

  async resetUnreadCount(conversationId: string, forAccountA: boolean) {
    const field = forAccountA ? 'unreadCountA' : 'unreadCountB';

    await db
      .update(conversations)
      .set({
        [field]: 0,
      })
      .where(eq(conversations.id, conversationId));
  }
}

export const conversationService = new ConversationService();
