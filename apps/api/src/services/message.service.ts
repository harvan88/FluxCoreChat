import { db } from '@fluxcore/db';
import { mediaAttachments, messages, conversations, relationships, accounts, type MessageContent } from '@fluxcore/db';
import { desc, eq, inArray, sql, and, not } from 'drizzle-orm';

export class MessageService {
  /**
   * Crear un mensaje
   */
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

  async getMessagesByConversationId(
    conversationId: string,
    limit = 50,
    offset = 0,
    viewingAsAccountId?: string,
    minCreatedAt?: Date | null
  ) {
    const conditions = [eq(messages.conversationId, conversationId)];

    if (viewingAsAccountId) {
      // Filter out messages deleted by this account
      // Note: We cast viewingAsAccountId to jsonb array for the containment check
      conditions.push(not(sql`${messages.deletedBy} @> ${JSON.stringify([viewingAsAccountId])}::jsonb`));

      // Also check conversation clearedAt logic if provided?
      // Ideally handled by caller or we join conversations here.
      // For now, let's focus on message-level deletion.
    }

    if (minCreatedAt) {
      // Filter out messages older than the cleared history timestamp
      conditions.push(sql`${messages.createdAt} > ${minCreatedAt}`);
    }

    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
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

  /**
   * Soft delete a message for a specific user.
   * If userId is provided, it finds the associated account and marks as deleted for that account.
   * If no userId provided (system delete), it potentially does hard delete or marks for all?
   * For now, we enforce userId for soft delete.
   */
  async deleteMessage(messageId: string, userId?: string) {
    if (!userId) {
      // Legacy/System delete - HARD DELETE
      await db.delete(messages).where(eq(messages.id, messageId));
      return;
    }

    // 1. Get message and conversation details to identify the account
    const message = await this.getMessageById(messageId);
    if (!message) return;

    // We need to find which account the user owns in this conversation
    // This requires looking up the relationship via conversation
    const conversation = await db.query.conversations.findFirst({
      where: (c, { eq }) => eq(c.id, message.conversationId),
      with: {
        relationship: true, // we assume relations are defined in schema
      }
    }) as any;
    // Note: Drizzle relations might not be set up in schema.ts fully for 'with' query 
    // if not using query builder exports. Let's use manual join if needed.

    // Manual fetch implementation for safety if 'query' API not fully configured
    const [convRow] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, message.conversationId))
      .limit(1);

    if (!convRow) return;

    const [relRow] = await db
      .select()
      .from(relationships)
      .where(eq(relationships.id, convRow.relationshipId))
      .limit(1);

    if (!relRow) return;

    // Find user's accounts
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.ownerUserId, userId));

    const userAccountIds = userAccounts.map(a => a.id);

    // Determine which account matches
    const targetAccountId = userAccountIds.includes(relRow.accountAId)
      ? relRow.accountAId
      : userAccountIds.includes(relRow.accountBId)
        ? relRow.accountBId
        : null;

    if (!targetAccountId) {
      throw new Error('User does not belong to this conversation');
    }

    // 2. Soft delete: append accountId to deletedBy
    // We use COALESCE to ensure current array or empty array, then append
    // BUT specific SQL syntax for JSONB update is needed.
    // simpler: read, update, write (concurrency risk but acceptable for chat delete)

    // Even better: using Postgres jsonb_set or || operator
    // deletedBy = deletedBy || '[targetAccountId]'

    await db
      .update(messages)
      .set({
        deletedBy: sql`${messages.deletedBy} || ${JSON.stringify([targetAccountId])}::jsonb`
      })
      .where(eq(messages.id, messageId));
  }
}

export const messageService = new MessageService();
