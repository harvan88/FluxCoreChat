/**
 * AI Context Service
 * Extracted from ai.service.ts — builds conversation context for AI processing.
 */

import { db } from '@fluxcore/db';
import { messages, conversations, accounts, relationships, messageAssets, assetEnrichments } from '@fluxcore/db';
import { eq, desc, inArray } from 'drizzle-orm';

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

    const messageIds = recentMessages.map((m) => m.id);
    const attachmentsByMessage = new Map<string, { assetId: string; enrichments: { type: string; payload: unknown }[] }[]>();

    if (messageIds.length > 0) {
      const messageAssetRows = await db
        .select({ messageId: messageAssets.messageId, assetId: messageAssets.assetId })
        .from(messageAssets)
        .where(inArray(messageAssets.messageId, messageIds));

      const assetIds = [...new Set(messageAssetRows.map((row) => row.assetId))];

      const enrichmentRows = assetIds.length > 0
        ? await db
            .select({
              assetId: assetEnrichments.assetId,
              type: assetEnrichments.type,
              payload: assetEnrichments.payload,
            })
            .from(assetEnrichments)
            .where(inArray(assetEnrichments.assetId, assetIds))
        : [];

      const enrichmentsByAsset = new Map<string, { type: string; payload: unknown }[]>();
      enrichmentRows.forEach((row) => {
        const list = enrichmentsByAsset.get(row.assetId) ?? [];
        list.push({ type: row.type, payload: row.payload });
        enrichmentsByAsset.set(row.assetId, list);
      });

      messageAssetRows.forEach((row) => {
        const list = attachmentsByMessage.get(row.messageId) ?? [];
        list.push({
          assetId: row.assetId,
          enrichments: enrichmentsByAsset.get(row.assetId) ?? [],
        });
        attachmentsByMessage.set(row.messageId, list);
      });
    }

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
      messages: recentMessages.reverse().map(m => {
        const assets = attachmentsByMessage.get(m.id) ?? [];
        const textContent = (m.content as any)?.text;
        const normalizedText = typeof textContent === 'string' && textContent.trim().length > 0 ? textContent : null;
        const hasTranscript = assets.some((asset) =>
          (asset.enrichments ?? []).some((enrichment) =>
            enrichment.type === 'audio_transcription' && typeof (enrichment.payload as any)?.text === 'string' && (enrichment.payload as any).text.trim().length > 0,
          ),
        );

        return {
          id: m.id,
          content: normalizedText ?? (typeof m.content === 'string' ? m.content : String(m.content ?? '')),
          senderAccountId: m.senderAccountId,
          createdAt: m.createdAt,
          messageType: normalizedText || hasTranscript ? 'text' : 'unknown',
          assets,
        };
      }),
      overlays: {},
    };
  } catch (error: any) {
    console.error('[ai-context] Error building context:', error.message);
    return {
      messages: [],
    };
  }
}
