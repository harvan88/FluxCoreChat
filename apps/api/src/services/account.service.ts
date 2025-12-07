import { db } from '@fluxcore/db';
import { accounts, actors } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import { validatePrivateContext, validateAlias, validateDisplayName } from '../utils/context-limits';

export class AccountService {
  async createAccount(data: {
    ownerUserId: string;
    username: string;
    displayName: string;
    accountType: 'personal' | 'business';
    profile?: any;
    privateContext?: string;
    alias?: string; // COR-005
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

    const aliasValidation = validateAlias(data.alias);
    if (!aliasValidation.valid) {
      throw new Error(aliasValidation.error);
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
        alias: data.alias || null, // COR-005
      })
      .returning();

    // Create actor (owner relationship)
    // COR-004: Añadir actorType obligatorio
    await db.insert(actors).values({
      actorType: 'account',
      userId: data.ownerUserId,
      accountId: account.id,
      displayName: data.displayName,
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
      alias?: string; // COR-005
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

    if (data.alias) {
      const aliasValidation = validateAlias(data.alias);
      if (!aliasValidation.valid) {
        throw new Error(aliasValidation.error);
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
}

export const accountService = new AccountService();
