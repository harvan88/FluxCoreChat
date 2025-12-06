import { db } from '@fluxcore/db';
import { accounts, actors } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

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

    // Validate private_context length
    if (data.privateContext && data.privateContext.length > 5000) {
      throw new Error('Private context exceeds 5000 characters');
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

    // Validate private_context length
    if (data.privateContext && data.privateContext.length > 5000) {
      throw new Error('Private context exceeds 5000 characters');
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
