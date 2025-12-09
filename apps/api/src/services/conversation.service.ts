import { db } from '@fluxcore/db';
import { conversations, relationships, accounts } from '@fluxcore/db';
import { eq, and, or, inArray } from 'drizzle-orm';

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

  /**
   * Get all conversations for a user (via their accounts and relationships)
   */
  async getConversationsByUserId(userId: string) {
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

    return userConversations;
  }
}

export const conversationService = new ConversationService();
