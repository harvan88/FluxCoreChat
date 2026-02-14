/**
 * AI Context Service
 * Extracted from ai.service.ts — builds conversation context for AI processing.
 */

import { db } from '@fluxcore/db';
import { messages, conversations, accounts, relationships } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

type ContextData = any;

export async function buildContext(accountId: string, conversationId: string): Promise<ContextData> {
  try {
    // Obtener cuenta
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    // Obtener conversación
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    // Obtener relación
    let relationship = null;
    let relContext: any[] = [];

    if (conversation?.relationshipId) {
      const [rel] = await db
        .select()
        .from(relationships)
        .where(eq(relationships.id, conversation.relationshipId))
        .limit(1);

      relationship = rel;

      // El contexto está en el campo context de la relación (JSONB)
      if (rel && (rel as any).context?.entries) {
        relContext = (rel as any).context.entries;
      }
    }

    // Obtener mensajes recientes
    const recentMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderAccountId: messages.senderAccountId,
        createdAt: messages.createdAt,
        type: messages.type,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    return {
      account: account ? {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        bio: (account.profile as any)?.bio || undefined,
        publicContext: (account.profile as any) || {},
        privateContext: account.privateContext || undefined,
      } : undefined,
      relationship: relationship ? {
        id: relationship.id,
        context: relContext.map((c: any) => ({
          type: c.type || c.contextType,
          content: c.content,
          authorId: c.author_account_id || c.authorAccountId,
        })),
        status: (relationship as any).status || 'active',
      } : undefined,
      conversation: conversation ? {
        id: conversation.id,
        channel: conversation.channel,
        metadata: (conversation as any).metadata || {},
      } : undefined,
      messages: recentMessages.reverse().map(m => ({
        id: m.id,
        content: (m.content as any)?.text || String(m.content),
        senderAccountId: m.senderAccountId,
        createdAt: m.createdAt,
        messageType: typeof (m.content as any)?.text === 'string' ? 'text' : 'unknown',
      })),
      overlays: {},
    };
  } catch (error: any) {
    console.error('[ai-context] Error building context:', error.message);
    return {
      messages: [],
    };
  }
}
