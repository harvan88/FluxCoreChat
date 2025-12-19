import { db, accountAiEntitlements } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

export type AIProviderId = 'groq' | 'openai';

export interface AccountAiEntitlementView {
  accountId: string;
  enabled: boolean;
  allowedProviders: AIProviderId[];
  defaultProvider: AIProviderId | null;
}

class AiEntitlementsService {
  async getEntitlement(accountId: string): Promise<AccountAiEntitlementView | null> {
    const [row] = await db
      .select()
      .from(accountAiEntitlements)
      .where(eq(accountAiEntitlements.accountId, accountId))
      .limit(1);

    if (!row) return null;

    const allowedProviders = Array.isArray(row.allowedProviders)
      ? (row.allowedProviders.filter((p) => p === 'groq' || p === 'openai') as AIProviderId[])
      : [];

    const defaultProvider = row.defaultProvider === 'groq' || row.defaultProvider === 'openai'
      ? (row.defaultProvider as AIProviderId)
      : null;

    return {
      accountId: row.accountId,
      enabled: row.enabled === true,
      allowedProviders,
      defaultProvider,
    };
  }

  async upsertEntitlement(
    accountId: string,
    data: {
      enabled?: boolean;
      allowedProviders?: AIProviderId[];
      defaultProvider?: AIProviderId | null;
    }
  ): Promise<AccountAiEntitlementView> {
    const existing = await this.getEntitlement(accountId);

    const allowedProviders = data.allowedProviders
      ? data.allowedProviders.filter((p) => p === 'groq' || p === 'openai')
      : existing?.allowedProviders ?? [];

    const defaultProvider =
      data.defaultProvider === null
        ? null
        : data.defaultProvider === 'groq' || data.defaultProvider === 'openai'
          ? data.defaultProvider
          : existing?.defaultProvider ?? null;

    const enabled = typeof data.enabled === 'boolean' ? data.enabled : existing?.enabled ?? false;

    if (!existing) {
      const [inserted] = await db
        .insert(accountAiEntitlements)
        .values({
          accountId,
          enabled,
          allowedProviders,
          defaultProvider,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return {
        accountId: inserted.accountId,
        enabled: inserted.enabled === true,
        allowedProviders: (inserted.allowedProviders as any) || [],
        defaultProvider: (inserted.defaultProvider as any) || null,
      };
    }

    const [updated] = await db
      .update(accountAiEntitlements)
      .set({
        enabled,
        allowedProviders,
        defaultProvider,
        updatedAt: new Date(),
      })
      .where(eq(accountAiEntitlements.accountId, accountId))
      .returning();

    return {
      accountId: updated.accountId,
      enabled: updated.enabled === true,
      allowedProviders: (updated.allowedProviders as any) || [],
      defaultProvider: (updated.defaultProvider as any) || null,
    };
  }
}

export const aiEntitlementsService = new AiEntitlementsService();
