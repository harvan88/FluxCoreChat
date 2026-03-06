import { db, conversations, relationships, accounts } from '@fluxcore/db';
import { eq, inArray, desc, and, or } from 'drizzle-orm';
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
      ownerAccountId?: string;
      channel: 'web' | 'whatsapp' | 'telegram' | 'webchat' | 'external';
    },
    tx?: any
  ) {
    const client = tx || db;
    const { relationshipId, visitorToken, ownerAccountId, channel } = criteria;

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
      // Backfill ownerAccountId if missing (for conversations created before 046)
      if (ownerAccountId && !conversation.ownerAccountId) {
        await client
          .update(conversations)
          .set({ ownerAccountId })
          .where(eq(conversations.id, conversation.id));
      }
      // Activar conversation_participants según diseño v1.3
      await conversationParticipantService.ensureParticipantsForConversation(conversation.id, client);
      return conversation;
    }

    // Create new
    const conversationType = visitorToken && !relationshipId ? 'anonymous_thread' : 'internal';
    const [conversation] = await client
      .insert(conversations)
      .values({
        relationshipId,
        visitorToken,
        ownerAccountId,
        channel,
        conversationType,
      })
      .returning();

    // Activar conversation_participants según diseño v1.3
    await conversationParticipantService.ensureParticipantsForConversation(conversation.id);

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

  /**
   * Convert a visitor (anonymous) conversation to a relationship-based conversation.
   * Called when an anonymous visitor authenticates — links their conversation
   * to a real relationship, preserving all message history.
   */
  async convertVisitorConversation(params: {
    visitorToken: string;
    ownerAccountId: string;
    visitorAccountId: string;
    relationshipId: string;
  }) {
    const { visitorToken, ownerAccountId, visitorAccountId, relationshipId } = params;

    // Find the visitor conversation
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.visitorToken, visitorToken),
          eq(conversations.ownerAccountId, ownerAccountId),
          eq(conversations.channel, 'webchat')
        )
      )
      .limit(1);

    if (!conversation) {
      return null;
    }

    // Check if the relationship already has a conversation (avoid duplicate)
    const existingRelConv = await db
      .select()
      .from(conversations)
      .where(eq(conversations.relationshipId, relationshipId))
      .limit(1);

    if (existingRelConv.length > 0) {
      // Relationship already has a conversation — visitor conversation stays as archive
      return existingRelConv[0];
    }

    // Convert: link to relationship, update type, stamp the link time
    const [updated] = await db
      .update(conversations)
      .set({
        relationshipId,
        conversationType: 'internal',
        identityLinkedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id))
      .returning();

    // Re-ensure participants now that there's a relationship
    await conversationParticipantService.ensureParticipantsForConversation(updated.id);

    return updated;
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

    // 2. Get conversations for those relationships
    const relationshipIds = accountRelationships.map((r) => r.id);

    const relationshipConversations = relationshipIds.length > 0
      ? await db
          .select()
          .from(conversations)
          .where(inArray(conversations.relationshipId, relationshipIds))
          .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt))
      : [];

    // 3. Get visitor conversations owned by this account (anonymous threads)
    const visitorConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.ownerAccountId, accountId))
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));

    // 4. Merge and deduplicate (a conversation could match both if it was converted)
    const seenIds = new Set<string>();
    const allConversations = [...relationshipConversations, ...visitorConversations].filter(c => {
      if (seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    });

    // Sort merged list
    allConversations.sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() || a.createdAt.getTime();
      const bTime = b.lastMessageAt?.getTime() || b.createdAt.getTime();
      return bTime - aTime;
    });

    // 5. Enrich with contact name
    const enrichedConversations = await Promise.all(
      allConversations.map(async (conv) => {
        // Visitor conversation (no relationship)
        if (!conv.relationshipId && conv.visitorToken) {
          return {
            ...conv,
            contactName: 'Visitante',
            contactAccountId: null,
            contactAvatar: null,
            contactProfile: null,
            isVisitorConversation: true,
          };
        }

        // Relationship-based conversation
        const rel = accountRelationships.find(r => r.id === conv.relationshipId);
        if (!rel) return { ...conv, contactName: 'Desconocido' };

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
