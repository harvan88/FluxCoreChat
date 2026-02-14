/**
 * AI Trace Service
 * Persists AI traces to DB (primary) with in-memory extension fallback.
 * Also handles AI Signal persistence.
 */

import { db } from '@fluxcore/db';
import { aiTraces, aiSignals } from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';
import type { NewAITrace, NewAISignal } from '@fluxcore/db';

type FluxCoreExtensionRef = {
  getFluxCoreExtension: () => Promise<any | null>;
};

class AITraceService {
  private extRef?: FluxCoreExtensionRef;

  setExtensionRef(ref: FluxCoreExtensionRef): void {
    this.extRef = ref;
  }

  /**
   * Persist a trace to DB after AI generation completes.
   * Called from ai.service.ts after generateResponse/executeOpenAIAssistantsPath.
   */
  async persistTrace(data: {
    id?: string;
    accountId: string;
    conversationId?: string;
    messageId?: string;
    runtime: string;
    provider: string;
    model: string;
    mode: string;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    requestBody?: any;
    requestContext?: any;
    builtPrompt?: any;
    responseContent?: string;
    toolsOffered?: string[];
    toolsCalled?: string[];
    toolDetails?: any;
    attempts?: any;
  }): Promise<string | null> {
    try {
      const requestBodyPayload =
        data.requestBody ??
        (data.builtPrompt || data.requestContext
          ? {
              builtPrompt: data.builtPrompt,
              contextSnapshot: data.requestContext,
            }
          : undefined);

      const row: NewAITrace = {
        id: data.id || undefined,
        accountId: data.accountId,
        conversationId: data.conversationId || undefined,
        messageId: data.messageId || undefined,
        runtime: data.runtime,
        provider: data.provider,
        model: data.model,
        mode: data.mode,
        startedAt: data.startedAt || new Date(),
        completedAt: data.completedAt || new Date(),
        durationMs: data.durationMs,
        promptTokens: data.promptTokens || 0,
        completionTokens: data.completionTokens || 0,
        totalTokens: data.totalTokens || 0,
        requestBody: requestBodyPayload,
        responseContent: data.responseContent,
        toolsOffered: data.toolsOffered || [],
        toolsCalled: data.toolsCalled || [],
        toolDetails: data.toolDetails,
        attempts: data.attempts,
      };

      const [inserted] = await db.insert(aiTraces).values(row).returning({ id: aiTraces.id });
      return inserted?.id || null;
    } catch (error: any) {
      console.error('[ai-trace] Failed to persist trace:', error?.message);
      return null;
    }
  }

  /**
   * Persist AI signals extracted from a response.
   */
  async persistSignals(traceId: string, accountId: string, conversationId: string | undefined, relationshipId: string | undefined, signals: Array<{ type: string; value: string; confidence?: number; metadata?: any }>): Promise<number> {
    if (!signals || signals.length === 0) return 0;

    try {
      const rows: NewAISignal[] = signals.map((s) => ({
        traceId,
        accountId,
        conversationId: conversationId || undefined,
        relationshipId: relationshipId || undefined,
        signalType: s.type,
        signalValue: s.value,
        confidence: typeof s.confidence === 'number' ? s.confidence : 1.0,
        metadata: s.metadata,
      }));

      await db.insert(aiSignals).values(rows);
      return rows.length;
    } catch (error: any) {
      console.error('[ai-trace] Failed to persist signals:', error?.message);
      return 0;
    }
  }

  async listTraces(params: { accountId: string; conversationId?: string; limit?: number }): Promise<any[]> {
    try {
      const limit = Math.max(1, Math.min(200, params.limit || 50));
      const conditions = [eq(aiTraces.accountId, params.accountId)];
      if (params.conversationId) {
        conditions.push(eq(aiTraces.conversationId, params.conversationId));
      }

      const rows = await db
        .select()
        .from(aiTraces)
        .where(and(...conditions))
        .orderBy(desc(aiTraces.createdAt))
        .limit(limit);

      return rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt?.toISOString(),
        accountId: r.accountId,
        conversationId: r.conversationId,
        messageId: r.messageId,
        mode: r.mode,
        model: r.model,
        maxTokens: null,
        temperature: null,
        final: {
          provider: r.provider,
          baseUrl: null,
          usage: {
            prompt_tokens: r.promptTokens,
            completion_tokens: r.completionTokens,
            total_tokens: r.totalTokens,
          },
        },
        attempts: Array.isArray(r.attempts) ? (r.attempts as any[]).length : 0,
      }));
    } catch (error: any) {
      console.error('[ai-trace] listTraces DB error, falling back to extension:', error?.message);
      // Fallback to extension in-memory
      const extension = await this.extRef?.getFluxCoreExtension();
      if (!extension || typeof extension.listTraces !== 'function') return [];
      return extension.listTraces(params as any);
    }
  }

  async getTrace(params: { accountId: string; traceId: string }): Promise<any | null> {
    try {
      const [row] = await db
        .select()
        .from(aiTraces)
        .where(and(eq(aiTraces.id, params.traceId), eq(aiTraces.accountId, params.accountId)))
        .limit(1);

      if (!row) return null;

      // Also fetch signals for this trace
      const signals = await db
        .select()
        .from(aiSignals)
        .where(eq(aiSignals.traceId, params.traceId));

      const requestBody = (row.requestBody || {}) as any;
      const builtPrompt = requestBody?.builtPrompt ?? row.requestBody;
      const contextSnapshot = requestBody?.contextSnapshot ?? null;

      return {
        id: row.id,
        createdAt: row.createdAt?.toISOString(),
        accountId: row.accountId,
        conversationId: row.conversationId,
        messageId: row.messageId,
        mode: row.mode,
        model: row.model,
        runtime: row.runtime,
        durationMs: row.durationMs,
        context: contextSnapshot,
        builtPrompt,
        attempts: row.attempts || [],
        final: {
          provider: row.provider,
          baseUrl: null,
          usage: {
            prompt_tokens: row.promptTokens,
            completion_tokens: row.completionTokens,
            total_tokens: row.totalTokens,
          },
        },
        toolUse: {
          toolsOffered: row.toolsOffered || [],
          toolsCalled: row.toolsCalled || [],
          toolDetails: row.toolDetails,
        },
        responseContent: row.responseContent,
        signals: signals.map((s) => ({
          type: s.signalType,
          value: s.signalValue,
          confidence: s.confidence,
          metadata: s.metadata,
          createdAt: s.createdAt?.toISOString(),
        })),
      };
    } catch (error: any) {
      console.error('[ai-trace] getTrace DB error, falling back to extension:', error?.message);
      const extension = await this.extRef?.getFluxCoreExtension();
      if (!extension || typeof extension.getTrace !== 'function') return null;
      return extension.getTrace(params as any);
    }
  }

  async clearTraces(params: { accountId: string }): Promise<number> {
    try {
      const result = await db
        .delete(aiTraces)
        .where(eq(aiTraces.accountId, params.accountId));

      // Also clear in-memory
      const extension = await this.extRef?.getFluxCoreExtension();
      if (extension && typeof extension.clearTraces === 'function') {
        extension.clearTraces(params as any);
      }

      return (result as any)?.rowCount || 0;
    } catch (error: any) {
      console.error('[ai-trace] clearTraces DB error:', error?.message);
      const extension = await this.extRef?.getFluxCoreExtension();
      if (!extension || typeof extension.clearTraces !== 'function') return 0;
      return extension.clearTraces(params as any);
    }
  }

  async deleteTrace(params: { accountId: string; traceId: string }): Promise<boolean> {
    try {
      const deleted = await db
        .delete(aiTraces)
        .where(and(eq(aiTraces.id, params.traceId), eq(aiTraces.accountId, params.accountId)))
        .returning({ id: aiTraces.id });

      if (deleted.length === 0) {
        return false;
      }

      const extension = await this.extRef?.getFluxCoreExtension();
      if (extension && typeof extension.deleteTrace === 'function') {
        extension.deleteTrace(params as any);
      }

      return true;
    } catch (error: any) {
      console.error('[ai-trace] deleteTrace DB error:', error?.message);
      const extension = await this.extRef?.getFluxCoreExtension();
      if (!extension || typeof extension.deleteTrace !== 'function') return false;
      return extension.deleteTrace(params as any) ?? false;
    }
  }

  async exportTraces(params: { accountId: string; conversationId?: string; limit?: number }): Promise<any[]> {
    try {
      const limit = Math.max(1, Math.min(200, params.limit || 50));
      const conditions = [eq(aiTraces.accountId, params.accountId)];
      if (params.conversationId) {
        conditions.push(eq(aiTraces.conversationId, params.conversationId));
      }

      const rows = await db
        .select()
        .from(aiTraces)
        .where(and(...conditions))
        .orderBy(desc(aiTraces.createdAt))
        .limit(limit);

      return rows;
    } catch (error: any) {
      console.error('[ai-trace] exportTraces DB error:', error?.message);
      return [];
    }
  }
}

export const aiTraceService = new AITraceService();
