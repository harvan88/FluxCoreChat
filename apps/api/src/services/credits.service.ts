import { db } from '@fluxcore/db';
import {
  creditsWallets,
  creditsLedger,
  creditsPolicies,
  creditsConversationSessions,
  type CreditsConversationSession,
} from '@fluxcore/db';
import { and, desc, eq, gt, sql } from 'drizzle-orm';

type CreditsPolicyView = {
  featureKey: string;
  engine: string;
  model: string;
  costCredits: number;
  tokenBudget: number;
  durationHours: number;
};

type UpdatePolicyParams = Partial<{
  featureKey: string;
  engine: string;
  model: string;
  costCredits: number;
  tokenBudget: number;
  durationHours: number;
  active: boolean;
}>;

const DEFAULT_POLICY: CreditsPolicyView = {
  featureKey: 'ai.session',
  engine: 'openai_chat',
  model: 'gpt-4o-mini-2024-07-18',
  costCredits: 1,
  tokenBudget: 120_000,
  durationHours: 24,
};

class CreditsService {
  async getBalance(accountId: string): Promise<number> {
    const [row] = await db
      .select({ balance: creditsWallets.balance })
      .from(creditsWallets)
      .where(eq(creditsWallets.accountId, accountId))
      .limit(1);

    return row?.balance ?? 0;
  }

  async grant(params: {
    accountId: string;
    amount: number;
    featureKey?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ balance: number }> {
    const amount = Math.trunc(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('amount must be a positive integer');
    }

    const featureKey = params.featureKey || 'credits.grant';

    return await db.transaction(async (tx) => {
      await tx.insert(creditsWallets).values({ accountId: params.accountId }).onConflictDoNothing();

      const now = new Date();

      const [updated] = await tx
        .update(creditsWallets)
        .set({
          balance: sql`${creditsWallets.balance} + ${amount}`,
          updatedAt: now,
        })
        .where(eq(creditsWallets.accountId, params.accountId))
        .returning({ balance: creditsWallets.balance });

      if (!updated) throw new Error('wallet not found');

      await tx.insert(creditsLedger).values({
        accountId: params.accountId,
        delta: amount,
        entryType: 'grant',
        featureKey,
        metadata: (params.metadata ?? {}) as any,
        createdAt: now,
      });

      return { balance: updated.balance };
    });
  }

  async createPolicy(params: {
    featureKey: string;
    engine: string;
    model: string;
    costCredits: number;
    tokenBudget: number;
    durationHours?: number;
    active?: boolean;
  }): Promise<{ id: string }> {
    const costCredits = Math.trunc(params.costCredits);
    const tokenBudget = Math.trunc(params.tokenBudget);
    const durationHours = typeof params.durationHours === 'number' ? Math.trunc(params.durationHours) : 24;

    if (!params.featureKey || !params.engine || !params.model) {
      throw new Error('featureKey, engine and model are required');
    }

    if (!Number.isFinite(costCredits) || costCredits <= 0) {
      throw new Error('costCredits must be a positive integer');
    }

    if (!Number.isFinite(tokenBudget) || tokenBudget <= 0) {
      throw new Error('tokenBudget must be a positive integer');
    }

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      throw new Error('durationHours must be a positive integer');
    }

    const [inserted] = await db
      .insert(creditsPolicies)
      .values({
        featureKey: params.featureKey,
        engine: params.engine,
        model: params.model,
        costCredits,
        tokenBudget,
        durationHours,
        active: params.active !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: creditsPolicies.id });

    return { id: inserted.id };
  }

  async listPolicies(filters?: { featureKey?: string; engine?: string; model?: string; active?: boolean }) {
    const whereClauses = [] as any[];
    if (filters?.featureKey) whereClauses.push(eq(creditsPolicies.featureKey, filters.featureKey));
    if (filters?.engine) whereClauses.push(eq(creditsPolicies.engine, filters.engine));
    if (filters?.model) whereClauses.push(eq(creditsPolicies.model, filters.model));
    if (typeof filters?.active === 'boolean') whereClauses.push(eq(creditsPolicies.active, filters.active));

    const rows = await db
      .select()
      .from(creditsPolicies)
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
      .orderBy(desc(creditsPolicies.updatedAt));

    return rows;
  }

  async updatePolicy(id: string, params: UpdatePolicyParams) {
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (params.featureKey) updates.feature_key = params.featureKey;
    if (params.engine) updates.engine = params.engine;
    if (params.model) updates.model = params.model;
    if (typeof params.costCredits === 'number') updates.cost_credits = Math.trunc(params.costCredits);
    if (typeof params.tokenBudget === 'number') updates.token_budget = Math.trunc(params.tokenBudget);
    if (typeof params.durationHours === 'number') updates.duration_hours = Math.trunc(params.durationHours);
    if (typeof params.active === 'boolean') updates.active = params.active;

    const [row] = await db
      .update(creditsPolicies)
      .set(updates)
      .where(eq(creditsPolicies.id, id))
      .returning();

    return row;
  }

  async setPolicyActive(id: string, active: boolean) {
    const [row] = await db
      .update(creditsPolicies)
      .set({ active, updatedAt: new Date() })
      .where(eq(creditsPolicies.id, id))
      .returning();
    return row;
  }

  async getEffectivePolicy(params: {
    featureKey: string;
    engine: string;
    model: string;
  }): Promise<CreditsPolicyView> {
    const [row] = await db
      .select({
        featureKey: creditsPolicies.featureKey,
        engine: creditsPolicies.engine,
        model: creditsPolicies.model,
        costCredits: creditsPolicies.costCredits,
        tokenBudget: creditsPolicies.tokenBudget,
        durationHours: creditsPolicies.durationHours,
      })
      .from(creditsPolicies)
      .where(
        and(
          eq(creditsPolicies.featureKey, params.featureKey),
          eq(creditsPolicies.engine, params.engine),
          eq(creditsPolicies.model, params.model),
          eq(creditsPolicies.active, true)
        )
      )
      .orderBy(desc(creditsPolicies.updatedAt))
      .limit(1);

    if (row) {
      return {
        featureKey: row.featureKey,
        engine: row.engine,
        model: row.model,
        costCredits: row.costCredits,
        tokenBudget: row.tokenBudget,
        durationHours: row.durationHours,
      };
    }

    // No specific policy for this model → fall back to DEFAULT_POLICY
    return DEFAULT_POLICY;
  }

  async getActiveConversationSession(params: {
    accountId: string;
    conversationId: string;
    featureKey: string;
  }): Promise<CreditsConversationSession | null> {
    const now = new Date();

    const rows = await db
      .select()
      .from(creditsConversationSessions)
      .where(
        and(
          eq(creditsConversationSessions.accountId, params.accountId),
          eq(creditsConversationSessions.conversationId, params.conversationId),
          eq(creditsConversationSessions.featureKey, params.featureKey),
          gt(creditsConversationSessions.expiresAt, now)
        )
      )
      .orderBy(desc(creditsConversationSessions.createdAt))
      .limit(5);

    for (const row of rows) {
      if ((row.tokensUsed ?? 0) < (row.tokenBudget ?? 0)) {
        return row;
      }
    }

    return null;
  }

  async openConversationSession(params: {
    accountId: string;
    conversationId: string;
    featureKey: string;
    engine: string;
    model: string;
  }): Promise<{ session: CreditsConversationSession; created: boolean }> {
    const lockKey = `${params.accountId}:${params.conversationId}:${params.featureKey}`;

    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint);`);

      const now = new Date();

      const existingRows = await tx
        .select()
        .from(creditsConversationSessions)
        .where(
          and(
            eq(creditsConversationSessions.accountId, params.accountId),
            eq(creditsConversationSessions.conversationId, params.conversationId),
            eq(creditsConversationSessions.featureKey, params.featureKey),
            gt(creditsConversationSessions.expiresAt, now)
          )
        )
        .orderBy(desc(creditsConversationSessions.createdAt))
        .limit(5);

      const existing = existingRows.find((row) => (row.tokensUsed ?? 0) < (row.tokenBudget ?? 0)) || null;

      if (existing) {
        return { session: existing, created: false };
      }

      const [policyRow] = await tx
        .select({
          featureKey: creditsPolicies.featureKey,
          engine: creditsPolicies.engine,
          model: creditsPolicies.model,
          costCredits: creditsPolicies.costCredits,
          tokenBudget: creditsPolicies.tokenBudget,
          durationHours: creditsPolicies.durationHours,
        })
        .from(creditsPolicies)
        .where(
          and(
            eq(creditsPolicies.featureKey, params.featureKey),
            eq(creditsPolicies.engine, params.engine),
            eq(creditsPolicies.model, params.model),
            eq(creditsPolicies.active, true)
          )
        )
        .orderBy(desc(creditsPolicies.updatedAt))
        .limit(1);

      // Use exact-match policy if found, otherwise fall back to DEFAULT_POLICY.
      // This ensures credits are always checked even for models without a specific policy row.
      const policy: CreditsPolicyView = policyRow
        ? {
            featureKey: policyRow.featureKey,
            engine: policyRow.engine,
            model: policyRow.model,
            costCredits: policyRow.costCredits,
            tokenBudget: policyRow.tokenBudget,
            durationHours: policyRow.durationHours,
          }
        : DEFAULT_POLICY;

      await tx.insert(creditsWallets).values({ accountId: params.accountId }).onConflictDoNothing();

      const [walletRow] = await tx
        .update(creditsWallets)
        .set({
          balance: sql`${creditsWallets.balance} - ${policy.costCredits}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(creditsWallets.accountId, params.accountId),
            sql`${creditsWallets.balance} >= ${policy.costCredits}`
          )
        )
        .returning({ balance: creditsWallets.balance });

      if (!walletRow) {
        throw new Error('Insufficient credits');
      }

      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(now.getTime() + policy.durationHours * 60 * 60 * 1000);

      const [session] = await tx
        .insert(creditsConversationSessions)
        .values({
          id: sessionId,
          accountId: params.accountId,
          conversationId: params.conversationId,
          featureKey: policy.featureKey,
          engine: policy.engine,
          model: policy.model,
          costCredits: policy.costCredits,
          tokenBudget: policy.tokenBudget,
          tokensUsed: 0,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await tx.insert(creditsLedger).values({
        accountId: params.accountId,
        delta: -policy.costCredits,
        entryType: 'spend',
        featureKey: policy.featureKey,
        engine: policy.engine,
        model: policy.model,
        conversationId: params.conversationId,
        sessionId,
        metadata: {} as any,
        createdAt: now,
      });

      return { session, created: true };
    });
  }

  async consumeSessionTokens(params: { sessionId: string; tokens: number }): Promise<void> {
    const tokens = Math.trunc(params.tokens);
    if (!Number.isFinite(tokens) || tokens <= 0) return;

    await db
      .update(creditsConversationSessions)
      .set({
        tokensUsed: sql`${creditsConversationSessions.tokensUsed} + ${tokens}`,
        updatedAt: new Date(),
      })
      .where(eq(creditsConversationSessions.id, params.sessionId));
  }
}

export const creditsService = new CreditsService();
