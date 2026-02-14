/**
 * AI Suggestion Store
 * Persists suggestions to DB with in-memory cache for fast synchronous reads.
 * DB is the source of truth; cache is best-effort for hot-path access.
 */

import { db } from '@fluxcore/db';
import { aiSuggestions } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

type AISuggestion = {
  id: string;
  conversationId: string;
  content: string;
  generatedAt: Date;
  model: string;
  traceId?: string;
  provider?: 'groq' | 'openai';
  baseUrl?: string;
  accountId?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'edited';
};

class AISuggestionStore {
  private cache: Map<string, AISuggestion> = new Map();

  set(id: string, suggestion: AISuggestion): void {
    this.cache.set(id, suggestion);
    // Fire-and-forget DB persistence
    this.persistToDB(suggestion).catch((err) =>
      console.error('[ai-suggestion-store] persist error:', err?.message)
    );
  }

  get(suggestionId: string): AISuggestion | null {
    return this.cache.get(suggestionId) || null;
  }

  approve(suggestionId: string): AISuggestion | null {
    const suggestion = this.cache.get(suggestionId);
    if (!suggestion) return null;
    suggestion.status = 'approved';
    this.updateStatusInDB(suggestionId, 'approved').catch((err) =>
      console.error('[ai-suggestion-store] approve DB error:', err?.message)
    );
    return suggestion;
  }

  reject(suggestionId: string): AISuggestion | null {
    const suggestion = this.cache.get(suggestionId);
    if (!suggestion) return null;
    suggestion.status = 'rejected';
    this.updateStatusInDB(suggestionId, 'rejected').catch((err) =>
      console.error('[ai-suggestion-store] reject DB error:', err?.message)
    );
    return suggestion;
  }

  edit(suggestionId: string, newContent: string): AISuggestion | null {
    const suggestion = this.cache.get(suggestionId);
    if (!suggestion) return null;
    suggestion.content = newContent;
    suggestion.status = 'edited';
    this.updateEditInDB(suggestionId, newContent).catch((err) =>
      console.error('[ai-suggestion-store] edit DB error:', err?.message)
    );
    return suggestion;
  }

  getPending(conversationId: string): AISuggestion[] {
    return Array.from(this.cache.values()).filter(
      (s) => s.conversationId === conversationId && s.status === 'pending'
    );
  }

  // ── DB persistence (fire-and-forget) ──────────────────────────────

  private async persistToDB(s: AISuggestion): Promise<void> {
    await db.insert(aiSuggestions).values({
      id: s.id,
      conversationId: s.conversationId,
      accountId: s.accountId || '00000000-0000-0000-0000-000000000000',
      content: s.content,
      model: s.model,
      provider: s.provider,
      baseUrl: s.baseUrl,
      traceId: s.traceId,
      status: s.status,
      promptTokens: s.usage?.promptTokens || 0,
      completionTokens: s.usage?.completionTokens || 0,
      totalTokens: s.usage?.totalTokens || 0,
      generatedAt: s.generatedAt,
    }).onConflictDoNothing();
  }

  private async updateStatusInDB(id: string, status: string): Promise<void> {
    await db
      .update(aiSuggestions)
      .set({ status, respondedAt: new Date() })
      .where(eq(aiSuggestions.id, id));
  }

  private async updateEditInDB(id: string, newContent: string): Promise<void> {
    await db
      .update(aiSuggestions)
      .set({ content: newContent, status: 'edited', respondedAt: new Date() })
      .where(eq(aiSuggestions.id, id));
  }
}

export const suggestionStore = new AISuggestionStore();
export type { AISuggestion };
