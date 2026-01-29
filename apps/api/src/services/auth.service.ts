import { hash, compare } from 'bcrypt';
import { db } from '@fluxcore/db';
import { users, accounts, passwordResetTokens } from '@fluxcore/db';
import { eq, and, gt } from 'drizzle-orm';
import { systemAdminService } from './system-admin.service';
import { accountService } from './account.service';
import { extensionHost } from './extension-host.service';

const SALT_ROUNDS = 10;

export class AuthService {
  async register(data: { email: string; password: string; name: string }) {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hash(data.password, SALT_ROUNDS);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        name: data.name,
      })
      .returning();

    // Create default personal account for the user
    const username = data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const account = await accountService.createAccount({
      ownerUserId: user.id,
      username: `${username}_${Date.now().toString(36)}`, // Ensure unique
      displayName: data.name,
      accountType: 'personal',
      profile: {},
    });

    console.log(`[Auth] Created user ${user.id} with account ${account.id}`);

    // Crear relación con FluxCore y conversación de bienvenida
    await this.createFluxCoreWelcome(account.id, data.name);

    return user;
  }

  async login(email: string, password: string) {
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await compare(password, user.passwordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Get user accounts
    const userAccounts = await db
      .select({
        id: accounts.id,
        username: accounts.username,
        displayName: accounts.displayName,
        accountType: accounts.accountType,
      })
      .from(accounts)
      .where(eq(accounts.ownerUserId, user.id));

    const systemAdminScopes = await systemAdminService.getScopes(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        systemAdminScopes: systemAdminScopes ?? null,
      },
      accounts: userAccounts,
    };
  }

  async getUserById(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const systemAdminScopes = await systemAdminService.getScopes(user.id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      systemAdminScopes: systemAdminScopes ?? null,
    };
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const [user] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return false;
    }

    return compare(password, user.passwordHash);
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return !!user;
  }

  async requestPasswordReset(email: string): Promise<string | null> {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) return null;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Find valid token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!resetToken) return false;

    // Hash new password
    const passwordHash = await hash(newPassword, SALT_ROUNDS);

    // Update user password
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, resetToken.id));

    return true;
  }

  /**
   * Crear relación con FluxCore y mensaje de bienvenida
   */
  private async createFluxCoreWelcome(newAccountId: string, userName: string) {
    await extensionHost.tryCreateWelcomeConversation({ newAccountId, userName });
  }
}

export const authService = new AuthService();
