import { db } from '@fluxcore/db';
import { accounts, actors, users } from '@fluxcore/db';
import { eq, and, or, ne, ilike } from 'drizzle-orm';
import { validatePrivateContext, validateDisplayName } from '../utils/context-limits';
import { extensionHost } from './extension-host.service';
import { coreEventBus } from '../core/events';
import type { Account } from '@fluxcore/db';

// V2-4.2: Instalación de extensiones preinstaladas en nuevas cuentas

export class AccountService {
  async createAccount(data: {
    ownerUserId: string;
    alias: string;
    username?: string;
    displayName: string;
    accountType: 'personal' | 'business';
    profile?: any;
    privateContext?: string;
    allowAutomatedUse?: boolean;
  }) {
    const aliasValue = data.alias;

    // Check if alias is taken
    const existing = await db
      .select()
      .from(accounts)
      .where(eq(accounts.alias, aliasValue))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Alias already taken');
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

    // Create account — write both username and alias for backward compat
    const [account] = await db
      .insert(accounts)
      .values({
        ownerUserId: data.ownerUserId,
        username: data.username || aliasValue,
        alias: aliasValue,
        displayName: data.displayName,
        accountType: data.accountType,
        profile: data.profile || {},
        privateContext: data.privateContext || null,
        allowAutomatedUse: data.allowAutomatedUse ?? false,
      })
      .returning();

    // Create actor (owner relationship)
    await db.insert(actors).values({
      userId: data.ownerUserId,
      accountId: account.id,
      role: 'owner',
      actorType: 'user', // BUG-001: Campo requerido por schema
    });

    await extensionHost.installPreinstalledExtensions(account.id);

    // Crear relación con FluxCore y conversación de bienvenida
    await this.createFluxCoreWelcome(account.id, data.displayName);

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
      allowAutomatedUse?: boolean;
      alias?: string | null;
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

    // Alias validation
    if (data.alias !== undefined && data.alias !== null) {
      const raw = data.alias.trim().toLowerCase();
      const aliasRegex = /^[a-z][a-z0-9_-]{2,29}$/;
      if (!aliasRegex.test(raw)) {
        throw new Error('El alias debe tener 3-30 caracteres, empezar con letra y solo contener letras, números, guiones o guiones bajos.');
      }
      const reserved = ['admin', 'api', 'app', 'login', 'register', 'settings', 'help', 'support', 'meetgar', 'fluxcore', 'system', 'null', 'undefined', 'public', 'private'];
      if (reserved.includes(raw)) {
        throw new Error('Este alias está reservado.');
      }
      // Check uniqueness (exclude current account)
      const existing = await db.query.accounts.findFirst({
        where: and(eq(accounts.alias, raw), ne(accounts.id, accountId)),
        columns: { id: true },
      });
      if (existing) {
        throw new Error('Este alias ya está en uso.');
      }
      data.alias = raw;
    }

    const [updated] = await db
      .update(accounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning();

    // PC-823: Emit domain event for PolicyContext invalidation
    coreEventBus.emit('account.profile.updated', {
      accountId,
      allowAutomatedUse: updated.allowAutomatedUse,
    });

    return updated;
  }

  /**
   * Search accounts by alias or owner email
   * @param query - Search query (can be @alias, email, or partial match)
   */
  async searchAccounts(query: string) {
    // Remove @ prefix if present
    const searchTerm = query.startsWith('@') ? query.slice(1) : query;
    const pattern = `%${searchTerm}%`;

    // Search in accounts by alias or displayName
    const accountResults = await db
      .select({
        id: accounts.id,
        alias: accounts.alias,
        displayName: accounts.displayName,
        accountType: accounts.accountType,
      })
      .from(accounts)
      .where(
        or(
          ilike(accounts.alias, pattern),
          ilike(accounts.displayName, pattern)
        )
      )
      .limit(20);

    // Also search by owner email
    const userResults = await db
      .select({
        id: accounts.id,
        alias: accounts.alias,
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

  async updateAccountAvatar(accountId: string, avatarAssetId: string): Promise<Account> {
    const [updatedAccount] = await db
      .update(accounts)
      .set({ 
        avatarAssetId,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning();

    if (!updatedAccount) {
      throw new Error('Account not found');
    }

    return updatedAccount;
  }

  /**
   * Crear relación con FluxCore y conversación de bienvenida
   */
  private async createFluxCoreWelcome(newAccountId: string, userName: string) {
    await extensionHost.tryCreateWelcomeConversation({ newAccountId, userName });
  }
}

export const accountService = new AccountService();
