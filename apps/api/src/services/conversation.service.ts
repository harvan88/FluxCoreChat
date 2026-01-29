import { db } from '@fluxcore/db';
import { conversations, relationships, accounts, messages } from '@fluxcore/db';
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

  async getAllConversations(): Promise<Array<{ id: string; relationshipId: string }>> {
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
   * MA-101: Get conversations for a SPECIFIC account (not all user accounts)
   * This ensures proper isolation between accounts owned by the same user
   */
  async getConversationsByAccountId(accountId: string) {
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

        const profile = otherAccount?.profile as { avatarUrl?: string } | null;

        return {
          ...conv,
          contactName: otherAccount?.displayName || 'Desconocido',
          contactAccountId: otherAccountId,
          contactAvatar: profile?.avatarUrl,
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

        const profile = otherAccount?.profile as { avatarUrl?: string } | null;

        return {
          ...conv,
          contactName: otherAccount?.displayName || 'Desconocido',
          contactAccountId: otherAccountId,
          contactAvatar: profile?.avatarUrl,
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
