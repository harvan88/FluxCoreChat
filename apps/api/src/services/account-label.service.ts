import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

class AccountLabelService {
    private cache = new Map<string, { label: string; expiresAt: number }>();
    private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

    async getLabel(accountId: string): Promise<string> {
        if (!accountId) {
            return 'unknown';
        }

        const cached = this.cache.get(accountId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.label;
        }

        const [account] = await db
            .select({ displayName: accounts.displayName, alias: accounts.alias })
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1);

        const label = account?.displayName || account?.alias || accountId.slice(0, 7);
        this.cache.set(accountId, { label, expiresAt: Date.now() + this.TTL_MS });
        return label;
    }
}

export const accountLabelService = new AccountLabelService();
