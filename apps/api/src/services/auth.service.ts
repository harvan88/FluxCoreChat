import { hash, compare } from 'bcrypt';
import { db } from '@fluxcore/db';
import { users, accounts, actors, relationships, conversations, messages, passwordResetTokens } from '@fluxcore/db';
import { eq, and, gt } from 'drizzle-orm';

const SALT_ROUNDS = 10;
const FLUXI_USERNAME = 'fluxi';

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
    const [account] = await db
      .insert(accounts)
      .values({
        ownerUserId: user.id,
        username: `${username}_${Date.now().toString(36)}`, // Ensure unique
        displayName: data.name,
        accountType: 'personal',
        profile: {},
        privateContext: null,
      })
      .returning();

    // Create actor (owner relationship)
    await db.insert(actors).values({
      userId: user.id,
      accountId: account.id,
      role: 'owner',
      actorType: 'user',
    });

    console.log(`[Auth] Created user ${user.id} with account ${account.id}`);

    // Crear relación con Fluxi y conversación de bienvenida
    await this.createFluxiWelcome(account.id, data.name);

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

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accounts: userAccounts,
    };
  }

  async getUserById(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
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
   * Crear relación con Fluxi y mensaje de bienvenida
   */
  private async createFluxiWelcome(newAccountId: string, userName: string) {
    try {
      // Buscar cuenta de Fluxi
      const [fluxiAccount] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.username, FLUXI_USERNAME))
        .limit(1);

      if (!fluxiAccount) {
        console.warn('[Auth] Fluxi account not found. Run seed:fluxi first.');
        return;
      }

      // Crear relación Fluxi -> Nuevo usuario
      const [relationship] = await db
        .insert(relationships)
        .values({
          accountAId: fluxiAccount.id,
          accountBId: newAccountId,
          perspectiveA: { savedName: userName },
          perspectiveB: { savedName: 'Fluxi' },
        })
        .returning();

      // Crear conversación de bienvenida
      const [conversation] = await db
        .insert(conversations)
        .values({
          relationshipId: relationship.id,
          channel: 'web',
        })
        .returning();

      // Crear mensaje de bienvenida
      await db.insert(messages).values({
        conversationId: conversation.id,
        senderAccountId: fluxiAccount.id,
        type: 'incoming',
        content: {
          text: `¡Hola ${userName}! 👋\n\nSoy Fluxi, tu asistente de FluxCore. Estoy aquí para ayudarte a:\n\n• Configurar tu perfil\n• Añadir contactos\n• Explorar las extensiones\n\n¿En qué puedo ayudarte hoy?`,
        },
      });

      console.log(`[Auth] Created Fluxi welcome for account ${newAccountId}`);
    } catch (error) {
      console.error('[Auth] Error creating Fluxi welcome:', error);
      // No fallar el registro si Fluxi no está disponible
    }
  }
}

export const authService = new AuthService();
