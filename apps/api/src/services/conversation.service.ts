import { db, conversations, relationships, accounts, actors, messages, conversationParticipants } from '@fluxcore/db';
import { eq, inArray, desc, and, or, isNull } from 'drizzle-orm';
import { presentAccountWithAvatar } from '../utils/account-avatar.presenter';
import { conversationParticipantService } from './conversation-participant.service';
import { resolveActorId, resolveAccountId, resolveActorIds } from '../utils/actor-resolver';

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
      if (rel && rel.actorAId === rel.actorBId) {
        throw new Error(`[ConversationService] Ontological violation: relationship ${relationshipId} links the same actor`);
      }

      // Ensure both actors exist in actors table
      const [actorA] = await client
        .select()
        .from(actors)
        .where(eq(actors.id, rel.actorAId))
        .limit(1);
      
      const [actorB] = await client
        .select()
        .from(actors)
        .where(eq(actors.id, rel.actorBId))
        .limit(1);

      if (!actorA || !actorB) {
        throw new Error(`[ConversationService] Missing actors for relationship ${relationshipId}: actorA=${!!actorA}, actorB=${!!actorB}`);
      }
    }

    let whereClause;
    if (relationshipId) {
      whereClause = and(eq(conversations.relationshipId, relationshipId), eq(conversations.channel, channel));
    } else if (visitorToken) {
      // For visitor conversations, ensure owner actor exists
      if (ownerAccountId) {
        const [ownerActor] = await client
          .select()
          .from(actors)
          .where(eq(actors.accountId, ownerAccountId))
          .limit(1);

        if (!ownerActor) {
          throw new Error(`[ConversationService] Missing actor for owner account ${ownerAccountId} in visitor conversation`);
        }
      }

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
    void visitorAccountId;

    return await db.transaction(async (tx) => {
      const linkedAt = new Date();

      const [conversation] = await tx
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

      const [relationshipConversation] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.relationshipId, relationshipId))
        .limit(1);

      if (!conversation) {
        if (!relationshipConversation) {
          return null;
        }

        const [updatedRelationshipConversation] = await tx
          .update(conversations)
          .set({
            conversationType: 'internal',
            identityLinkedAt: linkedAt,
            updatedAt: linkedAt,
          })
          .where(eq(conversations.id, relationshipConversation.id))
          .returning();

        await conversationParticipantService.ensureParticipantsForConversation(updatedRelationshipConversation.id, tx);
        return updatedRelationshipConversation;
      }

      if (relationshipConversation && relationshipConversation.id !== conversation.id) {
        await tx
          .update(messages)
          .set({ conversationId: relationshipConversation.id })
          .where(eq(messages.conversationId, conversation.id));

        const useVisitorLastMessage = !!conversation.lastMessageAt
          && (!relationshipConversation.lastMessageAt || conversation.lastMessageAt > relationshipConversation.lastMessageAt);

        const [updatedRelationshipConversation] = await tx
          .update(conversations)
          .set({
            conversationType: 'internal',
            status: 'active',
            identityLinkedAt: linkedAt,
            updatedAt: linkedAt,
            ...(useVisitorLastMessage
              ? {
                  lastMessageAt: conversation.lastMessageAt,
                  lastMessageText: conversation.lastMessageText,
                }
              : {}),
          })
          .where(eq(conversations.id, relationshipConversation.id))
          .returning();

        await tx
          .update(conversations)
          .set({
            status: 'archived',
            visitorToken: null,
            identityLinkedAt: linkedAt,
            updatedAt: linkedAt,
          })
          .where(eq(conversations.id, conversation.id));

        await conversationParticipantService.ensureParticipantsForConversation(updatedRelationshipConversation.id, tx);
        return updatedRelationshipConversation;
      }

      const [updated] = await tx
        .update(conversations)
        .set({
          relationshipId,
          conversationType: 'internal',
          visitorToken: null,
          identityLinkedAt: linkedAt,
          updatedAt: linkedAt,
        })
        .where(eq(conversations.id, conversation.id))
        .returning();

      await conversationParticipantService.ensureParticipantsForConversation(updated.id, tx);

      return updated;
    });
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
    const myActorId = await resolveActorId(accountId);
    const accountRelationships = myActorId
      ? await db
          .select()
          .from(relationships)
          .where(
            or(
              eq(relationships.actorAId, myActorId),
              eq(relationships.actorBId, myActorId)
            )
          )
      : [];

    // 2. Get conversations for those relationships
    const relationshipIds = accountRelationships.map((r) => r.id);

    // 2.1 Filter only active conversations (not unsubscribed)
    let activeConversationIds: string[] = [];
    if (relationshipIds.length > 0) {
      const allRelConversations = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(inArray(conversations.relationshipId, relationshipIds));
      
      const convIds = allRelConversations.map(c => c.id);
      
      if (convIds.length > 0) {
        const activeParticipants = await db
          .select({ conversationId: conversationParticipants.conversationId })
          .from(conversationParticipants)
          .where(
            and(
              inArray(conversationParticipants.conversationId, convIds),
              eq(conversationParticipants.accountId, accountId),
              // Filtrar donde unsubscribedAt es null (todavía activo)
              isNull(conversationParticipants.unsubscribedAt)
            )
          );
          
        activeConversationIds = activeParticipants.map(p => p.conversationId);
      }
    }

    const relationshipConversations = activeConversationIds.length > 0
      ? await db
          .select()
          .from(conversations)
          .where(inArray(conversations.id, activeConversationIds))
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

        const otherActorId = rel.actorAId === myActorId
          ? rel.actorBId
          : rel.actorAId;
        const otherAccountId = await resolveAccountId(otherActorId);

        const [otherAccount] = otherAccountId
          ? await db
              .select()
              .from(accounts)
              .where(eq(accounts.id, otherAccountId))
              .limit(1)
          : [];

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
    const actorMap = await resolveActorIds(accountIds);
    const actorIds = [...actorMap.values()];
    const userRelationships = actorIds.length > 0
      ? await db
          .select()
          .from(relationships)
          .where(
            or(
              inArray(relationships.actorAId, actorIds),
              inArray(relationships.actorBId, actorIds)
            )
          )
      : [];

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

        // Find the OTHER actor (not the user's)
        const otherActorId = actorIds.includes(rel.actorAId)
          ? rel.actorBId
          : rel.actorAId;
        const otherAccountId = await resolveAccountId(otherActorId);

        const [otherAccount] = otherAccountId
          ? await db
              .select()
              .from(accounts)
              .where(eq(accounts.id, otherAccountId))
              .limit(1)
          : [];

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
   * Leave a conversation (soft delete)
   * Marks the user's accounts as unsubscribed from the conversation
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
    const actorAAccountId = await resolveAccountId(rel.actorAId);
    const actorBAccountId = await resolveAccountId(rel.actorBId);
    const isOwner = (actorAAccountId && userAccountIds.includes(actorAAccountId)) ||
      (actorBAccountId && userAccountIds.includes(actorBAccountId));

    if (!isOwner) {
      throw new Error('Not authorized to delete this conversation');
    }

    // SOFT DELETE: Update unsubscribed_at for the user's accounts
    await db
      .update(conversationParticipants)
      .set({ unsubscribedAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          inArray(conversationParticipants.accountId, userAccountIds)
        )
      );

    // CASCADE: Hide all messages for the leaving actor(s) in message_visibility
    // This ensures old messages don't reappear if the conversation is re-shown
    const { messageDeletionService } = await import('./message-deletion.service');
    for (const accId of userAccountIds) {
      const actorId = await resolveActorId(accId);
      if (actorId) {
        await messageDeletionService.hideAllMessagesForActor(conversationId, actorId);
      }
    }

    console.log(`[ConversationService] User ${userId} left conversation ${conversationId} (messages cascade-hidden)`);
  }
}

export const conversationService = new ConversationService();
