import { db } from '@fluxcore/db';
import { accounts, actors, extensionInstallations, users } from '@fluxcore/db';
import { eq, and, or, ilike } from 'drizzle-orm';
import { validatePrivateContext, validateDisplayName } from '../utils/context-limits';

// V2-4.2: Configuración por defecto de core-ai
const DEFAULT_CORE_AI_CONFIG = {
  enabled: true,
  mode: 'suggest',
  responseDelay: 30,
  model: 'llama-3.1-8b-instant',
  maxTokens: 256,
  temperature: 0.7,
};

export class AccountService {
  async createAccount(data: {
    ownerUserId: string;
    username: string;
    displayName: string;
    accountType: 'personal' | 'business';
    profile?: any;
    privateContext?: string;
  }) {
    // Check if username is taken
    const existing = await db
      .select()
      .from(accounts)
      .where(eq(accounts.username, data.username))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Username already taken');
    }

    // COR-006: Validación centralizada de límites
    const displayNameValidation = validateDisplayName(data.displayName);
    if (!displayNameValidation.valid) {
      throw new Error(displayNameValidation.error);
    }

    const privateContextValidation = validatePrivateContext(data.privateContext);
    if (!privateContextValidation.valid) {
      throw new Error(privateContextValidation.error);
    }

    // Create account
    const [account] = await db
      .insert(accounts)
      .values({
        ownerUserId: data.ownerUserId,
        username: data.username,
        displayName: data.displayName,
        accountType: data.accountType,
        profile: data.profile || {},
        privateContext: data.privateContext || null,
      })
      .returning();

    // Create actor (owner relationship)
    await db.insert(actors).values({
      userId: data.ownerUserId,
      accountId: account.id,
      role: 'owner',
      actorType: 'user', // BUG-001: Campo requerido por schema
    });

    // V2-4.2: Pre-instalar core-ai en nuevas cuentas
    await db.insert(extensionInstallations).values({
      accountId: account.id,
      extensionId: '@fluxcore/core-ai',
      version: '1.0.0',
      enabled: true,
      config: DEFAULT_CORE_AI_CONFIG,
      grantedPermissions: ['messages:read', 'messages:suggest', 'context:read'],
    });

    return account;
  }

  async getAccountsByUserId(userId: string) {
    return await db.select().from(accounts).where(eq(accounts.ownerUserId, userId));
  }

  async getAccountById(accountId: string) {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  async updateAccount(
    accountId: string,
    userId: string,
    data: {
      displayName?: string;
      profile?: any;
      privateContext?: string;
    }
  ) {
    // Verify ownership
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.ownerUserId, userId)))
      .limit(1);

    if (!account) {
      throw new Error('Account not found or unauthorized');
    }

    // COR-006: Validación centralizada de límites
    if (data.displayName) {
      const displayNameValidation = validateDisplayName(data.displayName);
      if (!displayNameValidation.valid) {
        throw new Error(displayNameValidation.error);
      }
    }

    if (data.privateContext) {
      const privateContextValidation = validatePrivateContext(data.privateContext);
      if (!privateContextValidation.valid) {
        throw new Error(privateContextValidation.error);
      }
    }

    // Update account
    const [updated] = await db
      .update(accounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning();

    return updated;
  }

  /**
   * Search accounts by username, alias, or owner email
   * @param query - Search query (can be @username, email, or partial match)
   */
  async searchAccounts(query: string) {
    // Remove @ prefix if present
    const searchTerm = query.startsWith('@') ? query.slice(1) : query;
    const pattern = `%${searchTerm}%`;

    // Search in accounts by username or displayName
    const accountResults = await db
      .select({
        id: accounts.id,
        username: accounts.username,
        displayName: accounts.displayName,
        accountType: accounts.accountType,
      })
      .from(accounts)
      .where(
        or(
          ilike(accounts.username, pattern),
          ilike(accounts.displayName, pattern)
        )
      )
      .limit(20);

    // Also search by owner email
    const userResults = await db
      .select({
        id: accounts.id,
        username: accounts.username,
        displayName: accounts.displayName,
        accountType: accounts.accountType,
      })
      .from(accounts)
      .innerJoin(users, eq(accounts.ownerUserId, users.id))
      .where(ilike(users.email, pattern))
      .limit(10);

    // Combine and deduplicate
    const allResults = [...accountResults, ...userResults];
    const uniqueResults = allResults.filter(
      (item, index, self) => self.findIndex((t) => t.id === item.id) === index
    );

    return uniqueResults.slice(0, 20);
  }

  /**
   * Convert a personal account to business account
   */
  async convertToBusiness(accountId: string, userId: string) {
    // Verify ownership
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.ownerUserId, userId)))
      .limit(1);

    if (!account) {
      throw new Error('Account not found or unauthorized');
    }

    if (account.accountType === 'business') {
      throw new Error('Account is already a business account');
    }

    // Update account type to business
    const [updated] = await db
      .update(accounts)
      .set({
        accountType: 'business',
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning();

    return updated;
  }
}

export const accountService = new AccountService();
